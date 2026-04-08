# Deployment vs Update Refactor – Execution Plan

## Goal & Outcome

- Refactor the current "deploy" flow so infrastructure provisioning (DNS, CloudFront, ACM) is isolated from day-to-day content updates.
- Introduce a dedicated rebuild endpoint for regenerating HTML/S3 content and performing CloudFront cache invalidation, while keeping custom-domain deployment as a separate long-running operation.
- Ensure new endpoints follow repo conventions (ProxyRequest, logging) and integrate with existing S3 and repository patterns.

## Refactor Scope

1. **New Rebuild Endpoint** (`/static-web-generator/{salon_id}/rebuild`)
   - Regenerate website HTML from latest salon data.
   - Write preview (`internal/`) and production (`external/`) S3 artifacts.
   - Trigger selective CloudFront cache invalidation (internal + external paths).
   - Record rebuild metadata in database (`salon_website_rebuilds`).

2. **Deploy Endpoint Adjustments** (`/static-web-generator/{salon_id}/deploy`)
   - Focus on infrastructure setup only (call register-domain logic or share helpers).
   - Confirm content exists; if not, optionally invoke rebuild handler (or return informative error).
   - No longer copies S3 files or handles cache invalidation.

3. **Status Endpoint Integration**
   - Ensure deploy-status endpoint updates domain status to `active` (already planned).
   - Rebuild endpoint can reference domain config to determine when to invalidate external path.

---

## High-Level Architecture Changes

```
Before
┌────────────────┐      ┌───────────────────────────┐
│ Deploy Lambda  │─────▶│ Copy S3 + DNS + CloudFront │
└────────────────┘      └───────────────────────────┘

After
┌────────────────┐      ┌────────────────┐      ┌────────────────────────┐
│ Rebuild Lambda │─────▶│  S3 Updates    │─────▶│ CloudFront Invalidation │
└────────────────┘      └────────────────┘      └────────────────────────┘

┌────────────────┐      ┌───────────────────────────┐      ┌────────────────┐
│ Register-Domain│─────▶│ DNS + CloudFront + ACM    │─────▶│ Deploy Status  │
└────────────────┘      └───────────────────────────┘      └────────────────┘
```

---

## Detailed Steps

### 1. Create Rebuild Endpoint Module

- File: `endpoints/rebuild/lambda_handler.py`
- Follow pattern used in other endpoints (`generate_preview`, `deploy`).

**Skeleton**

```python
import logging
import os
import boto3
from typing import Dict, Any

from bookings_utils.utils import ProxyRequest, DatabaseConnection
from bookings_utils.errors import BadRequestError, BaseHttpError
from repositories.static_web_generator import StaticWebGeneratorRepository
from static_web_handler.static_web_generator import StaticWebGenerator
from s3_utils.static_web_s3_client import StaticWebS3Client

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cloudfront_client = boto3.client("cloudfront")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        request = ProxyRequest(event)

        salon_id = event.get("pathParameters", {}).get("salon_id")
        if not salon_id:
            raise BadRequestError("salon_id is required in path parameters")

        with DatabaseConnection() as conn:
            repository = StaticWebGeneratorRepository(conn)
            company_info = repository.get_company_data(salon_id)

            generator = StaticWebGenerator(
                os.getenv("StaticWebS3BucketName"),
                os.getenv("StaticWebS3Region"),
                repository,
            )

            generation_result = generator.generate_company_website(
                preview_input=None,  # load data inside helper
                salon_id=salon_id,
                template_type="generic",
            )

            copy_success = _promote_preview_to_external(
                company_info["company_name"]
            )

            invalidation_id = _invalidate_cloudfront_cache(
                company_info["company_name"],
                repository,
                salon_id,
            )

            repository.record_rebuild_event(
                salon_id=salon_id,
                company_name=company_info["company_name"],
                html_size=len(generation_result["html_content"]),
                preview_path=generation_result["preview_path"],
                production_path=f"external/{company_info['company_name']}/index.html",
                cache_invalidation_id=invalidation_id,
            )

        return request.format_response(
            200,
            {
                "message": "Website content updated successfully",
                "company": company_info["company_name"],
                "cache_invalidation_id": invalidation_id,
            },
        )

    except BadRequestError as e:
        logger.error(f"Bad request: {str(e)}")
        return request.format_response(e.status_code, {"message": str(e)})
    except Exception as e:
        logger.error(f"Error rebuilding website: {str(e)}")
        return request.format_response(500, {"message": "Internal server error"})
```

**Helper Functions**

```python
def _promote_preview_to_external(company_name: str) -> bool:
    s3_client = StaticWebS3Client(
        os.getenv("StaticWebS3BucketName"),
        region=os.getenv("StaticWebS3Region"),
    )
    success = s3_client.copy_internal_to_external(company_name)
    if not success:
        raise BaseHttpError("Failed to copy internal preview to external folder")
    return success


def _invalidate_cloudfront_cache(
    company_name: str,
    repository: StaticWebGeneratorRepository,
    salon_id: str,
) -> str:
    distribution_id = os.getenv("CloudFrontDistributionId")
    paths = [f"/internal/{company_name}/index.html"]

    active_domain = repository.get_active_custom_domain(salon_id)
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

### 2. Update Existing Deploy Handler

- File: `endpoints/deploy/lambda_handler.py`
- Remove direct S3 copy; enforce rebuild prerequisite.

**Before (excerpt)**

```python
html_content, source_bucket = __fetch_html_content(company_info["company_name"])
copy_success = __copy_internal_to_external(company_info["company_name"])
```

**After**

```python
def __ensure_production_content(company_name: str) -> None:
    s3_client = StaticWebS3Client(
        os.getenv("StaticWebS3BucketName"),
        region=os.getenv("StaticWebS3Region"),
    )
    production_key = f"external/{company_name}/index.html"
    if not s3_client.object_exists(production_key):
        raise BaseHttpError(
            "Production content not found. Please run rebuild endpoint before deploying."
        )


# inside lambda_handler after fetching company_info:
__ensure_production_content(company_info["company_name"])
```

- Deploy handler then proceeds with register-domain logic (or triggers new register endpoint).
- Optional: call rebuild endpoint internally using AWS SDK if automatic rebuild desired.

### 3. Database Schema Adjustments

Add migration (SQL snippet):

```sql
ALTER TABLE salon_custom_domains
    ADD COLUMN IF NOT EXISTS deployment_started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS salon_website_rebuilds (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    company_name VARCHAR(255) NOT NULL,
    html_size INTEGER,
    preview_s3_path VARCHAR(255),
    production_s3_path VARCHAR(255),
    cache_invalidation_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. SAM Template Updates

Add rebuild Lambda to `template.yaml`:

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
              - s3:DeleteObject
              - cloudfront:CreateInvalidation
            Resource: "*"
```

### 5. Repository Enhancements

Add helper methods in `StaticWebGeneratorRepository`:

```python
def get_active_custom_domain(self, salon_id: str) -> Optional[Dict[str, Any]]:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT custom_domain
              FROM salon_custom_domains
             WHERE salon_id = %s AND status = 'active'
             ORDER BY updated_at DESC
             LIMIT 1
            """,
            (salon_id,)
        )
        return cursor.fetchone()


def record_rebuild_event(
    self,
    salon_id: str,
    company_name: str,
    html_size: int,
    preview_path: str,
    production_path: str,
    cache_invalidation_id: str,
    status: str = "success",
    error_message: str = None,
):
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO salon_website_rebuilds (
                salon_id,
                company_name,
                html_size,
                preview_s3_path,
                production_s3_path,
                cache_invalidation_id,
                status,
                error_message
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                salon_id,
                company_name,
                html_size,
                preview_path,
                production_path,
                cache_invalidation_id,
                status,
                error_message,
            ),
        )
```

### 6. Testing Strategy

- **Unit**:
  - Mock S3 + CloudFront to ensure correct paths invalidated.
  - Rebuild returns 200 when content regenerated.
  - Deploy handler throws error when production content absent.
- **Integration**:
  - Sequence: generate preview → rebuild → register-domain → deploy-status (simulate with stubs/localstack).
  - Validate DB rows inserted for rebuild log.

### 7. Deployment Plan

1. Add rebuild Lambda + SAM entry.
2. Update repository with new methods + migrations.
3. Modify deploy handler to require pre-existing production content.
4. Roll out rebuild endpoint; update frontend/backoffice to call it for changes.
5. Deploy new register-domain/deploy-status endpoints (from other plans).
6. Remove legacy behaviour (S3 copy) once rebuild endpoint live.

### 8. Observability & Monitoring

- Log fields: `salon_id`, `company_name`, `paths_invalidated`, `invalidation_id`.
- Consider CloudWatch metrics:
  - `rebuild.success.count`
  - `rebuild.failure.count`
  - `deploy.missing_content`
- Create alarm on repeated rebuild failures within short period.

### 9. Open Questions / Decisions

- Should rebuild endpoint be rate-limited? (Potential CloudFront invalidation quota concerns.)
- Do we auto-trigger rebuild on deploy if content missing, or return explicit error? (Current plan: explicit error.)
- Need UI/API adjustments to prompt rebuild before domain registration.

---

This enriched plan now includes concrete pseudo-code, helper function signatures, database SQL snippets, SAM configuration, and testing guidance to implement the deploy-vs-update refactor.
