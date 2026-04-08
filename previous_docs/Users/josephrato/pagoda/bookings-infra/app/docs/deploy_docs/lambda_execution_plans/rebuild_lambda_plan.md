# Rebuild Lambda Execution Plan (`endpoints/rebuild/lambda_handler.py`)

## Purpose

Regenerate static website assets whenever salon content changes. Writes HTML to S3 (`internal/` + `external/`) and issues CloudFront cache invalidations so both preview and live domains serve the latest version.

## Handler Signature

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    ...
```

## Required Environment Variables

- `StaticWebS3BucketName`
- `StaticWebS3Region`
- `CloudFrontDistributionId`

## Dependencies

- `ProxyRequest`, `DatabaseConnection`, `BadRequestError`, `BaseHttpError`
- `StaticWebGenerator`, `StaticWebGeneratorRepository`
- `StaticWebS3Client`
- `boto3` CloudFront client

## Handler Flow

1. Extract `salon_id` from path.
2. Fetch company data via repository; raise `BadRequestError` if missing.
3. Use `StaticWebGenerator.generate_company_website(...)` to rebuild HTML.
4. Copy preview content to external folder.
5. Invalidate CloudFront caches (preview + external if a live domain exists).
6. Record rebuild metadata (optional but recommended).
7. Return 200 with confirmation and invalidation ID.

## Detailed Implementation

```python
cloudfront_client = boto3.client("cloudfront")


def lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    if not salon_id:
        raise BadRequestError("salon_id is required in path parameters")

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)
        company = repo.get_company_data(salon_id)

        generator = StaticWebGenerator(
            os.getenv("StaticWebS3BucketName"),
            os.getenv("StaticWebS3Region"),
            repo,
        )

        generation_result = generator.generate_company_website(
            preview_input=None,  # generator loads from DB
            salon_id=salon_id,
            template_type="generic",
        )

        _promote_preview_to_external(company["company_name"])
        invalidation_id = _invalidate_cloudfront_cache(
            company["company_name"],
            repo,
            salon_id,
        )

        repo.record_rebuild_event(
            salon_id=salon_id,
            company_name=company["company_name"],
            html_size=len(generation_result["html_content"]),
            preview_path=generation_result["preview_path"],
            production_path=f"external/{company['company_name']}/index.html",
            cache_invalidation_id=invalidation_id,
        )

    return request.format_response(
        200,
        {
            "message": "Website content updated successfully",
            "company": company["company_name"],
            "cache_invalidation_id": invalidation_id,
        },
    )
```

### Helpers

```python
def _promote_preview_to_external(company_name: str) -> None:
    s3_client = StaticWebS3Client(
        os.getenv("StaticWebS3BucketName"),
        region=os.getenv("StaticWebS3Region"),
    )
    if not s3_client.copy_internal_to_external(company_name):
        raise BaseHttpError("Failed to copy internal preview to external folder")


def _invalidate_cloudfront_cache(company_name: str, repo, salon_id: str) -> str:
    distribution_id = os.getenv("CloudFrontDistributionId")
    paths = [f"/internal/{company_name}/index.html"]
    active_domain = repo.get_active_custom_domain(salon_id)
    if active_domain:
        paths.append(f"/external/{company_name}/index.html")

    response = cloudfront_client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {"Quantity": len(paths), "Items": paths},
            "CallerReference": f"{company_name}-{int(time.time())}",
        },
    )
    return response["Invalidation"]["Id"]
```

## Error Handling

- Missing `salon_id` → `BadRequestError`
- S3 copy failure → `BaseHttpError`
- Unexpected exception → log and return 500 with "Internal server error"

## Tests

- Ensure rebuild writes new S3 objects (mock `StaticWebS3Client`).
- Assert CloudFront invalidation invoked with correct paths.
- Validate 400 returned when `salon_id` absent.
- Confirm 500 path when generator raises an exception.

## SAM Entry (excerpt)

```yaml
RebuildWebsiteFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/rebuild/lambda_handler.lambda_handler
    Layers:
      - !Ref DependencyLayer
      - !Ref S3UtilsLayer
    Events:
      RebuildWebsiteEndpoint:
        Type: Api
        Properties:
          Path: /static-web-generator/{salon_id}/rebuild
          Method: post
          Auth:
            Authorizer: HybridRequestAuthorizer
    Policies:
      - SecretsManagerReadWrite
      - Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - s3:GetObject
              - s3:PutObject
              - cloudfront:CreateInvalidation
            Resource: "*"
```
