# Domain Lookup API Lambda Execution Plan (`endpoints/domain_router/mappings/lambda_handler.py`)

## Purpose

Serve Lambda@Edge with a consolidated mapping of host → S3 target for preview (`internal/`), built-in (`external/`), and custom domains.

## Handler Flow

1. Validate caller (API key or IAM-based authorization). Reject unauthorized requests with 401.
2. Attempt in-memory cache lookup. If cache expired or empty, refresh data from Postgres.
3. During refresh:
   - Open `DatabaseConnection`; instantiate `DeployRepository`.
   - Call `list_active_subdomains()` and `list_active_custom_domains()`.
   - Merge results via `_merge_records`.
   - Store merged list plus new expiry timestamp (`now + CACHE_TTL_SECONDS`) in `_CACHE`.
4. Return cached data as JSON along with `Cache-Control` header.
5. Log cache refresh metrics (record counts, duration). Surface errors as 500 responses.

## Code Skeleton

```python
import json
import os
import time
from typing import Any, Dict, List

from bookings_utils.utils import ProxyRequest, DatabaseConnection
from repositories.deploy_repository import DeployRepository

CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))
BUILT_IN_SUFFIX = "pagoda.site"
PREVIEW_SUFFIX = "preview.pagoda.com"
_CACHE: Dict[str, Any] = {"data": [], "expires": 0.0}


def lambda_handler(event, context):
    request = ProxyRequest(event)
    if not _authorized(request.headers):
        return _unauthorized(request)

    now = time.time()
    if now >= _CACHE["expires"]:
        _refresh_cache()

    return request.format_response(
        200,
        _CACHE["data"],
        additional_headers={"Cache-Control": f"max-age={CACHE_TTL_SECONDS}"},
    )
```

### Cache Refresh Helper

```python
def _refresh_cache() -> None:
    now = time.time()
    with DatabaseConnection() as conn:
        repo = DeployRepository(conn)
        subdomains = repo.list_active_subdomains()
        custom_domains = repo.list_active_custom_domains()

    merged = _merge_records(subdomains, custom_domains)
    _CACHE["data"] = merged
    _CACHE["expires"] = now + CACHE_TTL_SECONDS
```

### Merge Logic

```python
def _merge_records(
    subdomains: List[Dict[str, Any]],
    custom_domains: List[Dict[str, Any]],
) -> List[Dict[str, str]]:
    records: List[Dict[str, str]] = []

    for row in subdomains:
        environment = row.get("environment", "live")
        prefix = "internal" if environment == "draft" else "external"
        base_host = PREVIEW_SUFFIX if environment == "draft" else BUILT_IN_SUFFIX

        records.append(
            {
                "host": f"{row['subdomain'].lower()}.{base_host}",
                "target": f"{prefix}/{row['company_name']}/index.html",
                "environment": environment,
            }
        )

    for row in custom_domains:
        records.append(
            {
                "host": row["custom_domain"].lower(),
                "target": f"external/{row['company_name']}/index.html",
                "environment": "live",
            }
        )

    return sorted(records, key=lambda item: (item["environment"], item["host"]))
```

### Authorization Helpers

```python
EXPECTED_API_KEY = os.environ.get("DOMAIN_LOOKUP_API_KEY")

def _authorized(headers: Dict[str, str]) -> bool:
    api_key = headers.get("x-api-key")
    return EXPECTED_API_KEY and api_key == EXPECTED_API_KEY

def _unauthorized(request: ProxyRequest) -> Dict[str, Any]:
    return request.format_response(401, {"message": "Unauthorized"})
```

(Swap for IAM authorizer branch if that mechanism is chosen.)

## Configuration

- Environment variables:
  - `CACHE_TTL_SECONDS` (default `30`)
  - `DOMAIN_LOOKUP_API_KEY` (if using header-based auth)
- Reuse existing database secret env vars.
- VPC / security group settings identical to other DB-backed lambdas.

## Monitoring & Logging

- Log fields: `refresh_count`, `records_returned`, `ttl_seconds`.
- Emit metrics via `logger.info` or CloudWatch embedded metrics format.
- Alarm on error rate > 1% and latency approaching timeout.

## Testing

- Unit tests for `_merge_records` (preview vs live vs custom).
- Cache tests: successive invocations within TTL should not hit repository (mock and assert call counts).
- Auth tests: missing/wrong API key returns 401.
- Error tests: repository failure surfaces 500 and cache remains unchanged.

## SAM Snippet

```yaml
DomainLookupApiFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/domain_router/mappings/lambda_handler.lambda_handler
    Layers:
      - !Ref DependencyLayer
    Events:
      DomainLookupApi:
        Type: Api
        Properties:
          Path: /domain-router/mappings
          Method: get
          Auth:
            ApiKeyRequired: true
    Environment:
      Variables:
        CACHE_TTL_SECONDS: "30"
        DOMAIN_LOOKUP_API_KEY: "{{resolve:secretsmanager:domainLookupApiKey}}"
    Policies:
      - SecretsManagerReadWrite
      - !Ref RdsAccessPolicy
```

## Deployment Notes

- Update `STRUCTURE_OUTLINE.md` to list the new endpoint folder.
- Provide Lambda@Edge deployment with the API key/credentials.
- Optionally seed cache in warm-up step (invoke lambda post-deploy).
