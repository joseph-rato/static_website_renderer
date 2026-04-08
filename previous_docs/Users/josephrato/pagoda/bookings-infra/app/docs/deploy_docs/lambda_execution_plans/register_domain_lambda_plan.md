# Register Custom Domain Lambda Execution Plan (`endpoints/register_domain/lambda_handler.py`)

## Purpose

Accept a salon’s custom domain request (e.g., `mysalon.com`), verify prerequisites, and provision all infrastructure (ACM certificate, CloudFront alias, Route 53 records) while persisting the deployment metadata.

## Handler Flow

1. Extract `salon_id`.
2. Parse request body (`custom_domain`, `domain_type`).
3. Fetch company info and ensure external site content exists (`external/{company}/index.html`).
4. Check repository for existing domain configuration; return early if active/pending.
5. Request ACM certificate (DNS validation).
6. Update CloudFront distribution with new alias and viewer certificate.
7. Create/ensure Route 53 record.
8. Save configuration in `salon_custom_domains` (status `pending`).
9. Return response with IDs needed for status polling.

## Code Skeleton

```python
cloudfront_client = boto3.client("cloudfront")
acm_client = boto3.client("acm", region_name="us-east-1")
route53_client = boto3.client("route53")


def lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    if not salon_id:
        raise BadRequestError("salon_id is required")

    payload = request.body
    custom_domain = (payload.get("custom_domain") or "").strip().lower()
    domain_type = payload.get("domain_type", "production")

    __validate_domain(custom_domain)

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)

        existing = repo.get_custom_domain_config(salon_id, custom_domain)
        if existing and existing["status"] in {"pending", "active"}:
            return request.format_response(200, existing)

        company = repo.get_company_data(salon_id)
        __ensure_production_content(company["company_name"])

        certificate_arn = __request_certificate(custom_domain)
        distribution_id = os.getenv("CloudFrontDistributionId")
        __add_alias_to_cloudfront(distribution_id, custom_domain, certificate_arn)
        route53_info = __create_route53_record(custom_domain, distribution_id)

        repo.save_custom_domain_config(
            salon_id=salon_id,
            custom_domain=custom_domain,
            company_name=company["company_name"],
            domain_type=domain_type,
            cloudfront_distribution_id=distribution_id,
            ssl_certificate_arn=certificate_arn,
            hosted_zone_id=route53_info["hosted_zone_id"],
            record_name=route53_info["record_name"],
            status="pending",
        )
        conn.commit()

    return request.format_response(
        200,
        {
            "message": "Custom domain registration initiated",
            "custom_domain": custom_domain,
            "status": "pending",
            "cloudfront_distribution_id": distribution_id,
            "certificate_arn": certificate_arn,
            "hosted_zone_id": route53_info["hosted_zone_id"],
        },
    )
```

## Helper Functions

```python
def __validate_domain(domain: str) -> None:
    if not DOMAIN_REGEX.match(domain):
        raise BadRequestError("Invalid domain format")
    # optional: reserved words, etc.


def __ensure_production_content(company_name: str) -> None:
    s3_client = StaticWebS3Client(
        os.getenv("StaticWebS3BucketName"),
        region=os.getenv("StaticWebS3Region"),
    )
    if not s3_client.object_exists(f"external/{company_name}/index.html"):
        raise BaseHttpError("Production content missing. Run rebuild first.")


def __request_certificate(domain: str) -> str:
    response = acm_client.request_certificate(
        DomainName=domain,
        ValidationMethod="DNS",
    )
    return response["CertificateArn"]


def __add_alias_to_cloudfront(distribution_id, domain, certificate_arn):
    config = cloudfront_client.get_distribution_config(Id=distribution_id)
    etag = config["ETag"]
    distribution_config = config["DistributionConfig"]

    aliases = distribution_config.setdefault("Aliases", {"Quantity": 0, "Items": []})
    if domain not in aliases.get("Items", []):
        aliases["Items"].append(domain)
        aliases["Quantity"] = len(aliases["Items"])

    distribution_config["ViewerCertificate"] = {
        "ACMCertificateArn": certificate_arn,
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021",
    }

    cloudfront_client.update_distribution(
        Id=distribution_id,
        DistributionConfig=distribution_config,
        IfMatch=etag,
    )


def __create_route53_record(domain: str, distribution_id: str) -> Dict[str, str]:
    hosted_zone_id = __get_or_create_hosted_zone(domain)
    distribution = cloudfront_client.get_distribution(Id=distribution_id)
    cloudfront_domain = distribution["Distribution"]["DomainName"]

    route53_client.change_resource_record_sets(
        HostedZoneId=hosted_zone_id,
        ChangeBatch={
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": domain,
                        "Type": "A",
                        "AliasTarget": {
                            "DNSName": cloudfront_domain,
                            "HostedZoneId": "Z2FDTNDATAQYW2",
                            "EvaluateTargetHealth": False,
                        },
                    },
                }
            ]
        },
    )

    return {"hosted_zone_id": hosted_zone_id, "record_name": domain}
```

## Error Handling

- Bad request (missing fields, invalid domain) → `BadRequestError`
- Missing site content → `BaseHttpError`
- AWS failures → log error and return 500 with generic message.

## Testing

- Mock AWS clients to simulate certificate request, CloudFront update, Route 53 UPSERT.
- Verify domain already active returns early response.
- Ensure missing production content raises error.
- Check database insert executed with expected values.

## SAM Snippet

```yaml
RegisterDomainFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/register_domain/lambda_handler.lambda_handler
    Layers:
      - !Ref DependencyLayer
    Events:
      RegisterDomainEndpoint:
        Type: Api
        Properties:
          Path: /static-web-generator/{salon_id}/register-domain
          Method: post
          Auth:
            Authorizer: HybridRequestAuthorizer
    Policies:
      - SecretsManagerReadWrite
      - Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - cloudfront:GetDistribution
              - cloudfront:UpdateDistribution
              - acm:RequestCertificate
              - acm:DescribeCertificate
              - route53:ListHostedZonesByName
              - route53:CreateHostedZone
              - route53:ChangeResourceRecordSets
              - route53:ListResourceRecordSets
            Resource: "*"
```
