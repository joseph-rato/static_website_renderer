# Deploy Status Lambda Execution Plan (`endpoints/deploy_status/lambda_handler.py`)

## Purpose

Expose real-time progress for a custom domain deployment, combining CloudFront, ACM, and Route 53 status into a single JSON payload. Allows UI to display DNS records and deployment state.

## Handler Flow

1. Extract `salon_id` and optional `custom_domain` query parameter.
2. Load domain configuration from `salon_custom_domains` (either specific domain or latest).
3. Invoke AWS APIs:
   - `cloudfront.get_distribution` to check distribution status.
   - `acm.describe_certificate` to fetch validation options and certificate status.
   - `route53.list_resource_record_sets` to ensure DNS records exist.
4. Calculate overall status (`active` when CloudFront is `Deployed` and ACM is `ISSUED`).
5. If complete, update repository status to `active`.
6. Return response with statuses, validation records, timestamps, and estimated completion.

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

    query = request.query_params or {}
    requested_domain = query.get("custom_domain")

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)
        domain_config = repo.get_custom_domain_config(salon_id, requested_domain)
        if not domain_config:
            raise NotFoundError("Custom domain configuration not found")

    cloudfront_info = __check_cloudfront_status(domain_config["cloudfront_distribution_id"])
    ssl_info = __check_ssl_certificate_status(domain_config["ssl_certificate_arn"])
    dns_info = __check_dns_status(
        domain_config["hosted_zone_id"],
        domain_config["record_name"],
    )

    estimated = __calculate_estimated_completion(
        domain_config.get("deployment_started_at"),
        cloudfront_info["status"],
        ssl_info["status"],
    )

    overall_status = __determine_status(cloudfront_info, ssl_info, domain_config["status"])

    if overall_status == "active":
        with DatabaseConnection() as conn:
            repo = StaticWebGeneratorRepository(conn)
            repo.update_domain_status(salon_id, domain_config["custom_domain"], "active")
            conn.commit()

    return request.format_response(
        200,
        {
            "custom_domain": domain_config["custom_domain"],
            "status": overall_status,
            "cloudfront_status": cloudfront_info["status"],
            "ssl_status": ssl_info["status"],
            "dns_status": dns_info["status"],
            "validation_records": ssl_info.get("validation_records", []),
            "estimated_completion": estimated,
            "deployment_started_at": domain_config.get("deployment_started_at"),
            "last_checked_at": datetime.utcnow().isoformat() + "Z",
        },
    )
```

### Helper Functions

```python
def __check_cloudfront_status(distribution_id: str) -> Dict[str, Any]:
    dist = cloudfront_client.get_distribution(Id=distribution_id)
    status = dist["Distribution"]["Status"]
    return {
        "status": status,
        "domain_name": dist["Distribution"]["DomainName"],
        "is_deployed": status == "Deployed",
    }


def __check_ssl_certificate_status(certificate_arn: str) -> Dict[str, Any]:
    cert = acm_client.describe_certificate(CertificateArn=certificate_arn)
    validation_records = []
    for option in cert["Certificate"].get("DomainValidationOptions", []):
        if "ResourceRecord" in option:
            validation_records.append(option["ResourceRecord"])
    return {
        "status": cert["Certificate"]["Status"],
        "validation_records": validation_records,
        "is_issued": cert["Certificate"]["Status"] == "ISSUED",
    }


def __check_dns_status(hosted_zone_id: str, record_name: str) -> Dict[str, Any]:
    resp = route53_client.list_resource_record_sets(
        HostedZoneId=hosted_zone_id,
        StartRecordName=record_name,
        StartRecordType="A",
        MaxItems="1",
    )
    records = resp.get("ResourceRecordSets", [])
    if records and records[0]["Name"].rstrip(".") == record_name:
        return {"status": "active"}
    return {"status": "not_found"}
```

### Status Helpers

```python
def __determine_status(cloudfront_info, ssl_info, current_status: str) -> str:
    if cloudfront_info["is_deployed"] and ssl_info["is_issued"]:
        return "active"
    return current_status or "pending"


def __calculate_estimated_completion(started_at_iso, cloudfront_status, ssl_status) -> str:
    if not started_at_iso:
        return "Unknown"
    started_at = datetime.fromisoformat(started_at_iso.replace("Z", "+00:00"))
    elapsed = datetime.utcnow() - started_at
    if cloudfront_status == "Deployed" and ssl_status == "ISSUED":
        return "Complete"
    if elapsed < timedelta(minutes=15):
        return "10-20 minutes"
    if elapsed < timedelta(minutes=30):
        return "5-15 minutes"
    return "0-10 minutes"
```

## Error Handling

- Missing `salon_id` → `BadRequestError`
- No matching domain config → `NotFoundError`
- AWS API failures → log and return 500 (with generic error body)

## Tests

- Domain missing → 404
- Mock AWS returning statuses → validate overall status transitions
- Scenario where CloudFront deployed & ACM issued → `update_domain_status` invoked

## SAM Snippet

```yaml
DeployStatusFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/deploy_status/lambda_handler.lambda_handler
    Layers:
      - !Ref DependencyLayer
    Events:
      DeployStatusEndpoint:
        Type: Api
        Properties:
          Path: /static-web-generator/{salon_id}/deploy-status
          Method: get
          Auth:
            Authorizer: HybridRequestAuthorizer
    Policies:
      - SecretsManagerReadWrite
      - Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - cloudfront:GetDistribution
              - acm:DescribeCertificate
              - route53:ListResourceRecordSets
            Resource: "*"
```
