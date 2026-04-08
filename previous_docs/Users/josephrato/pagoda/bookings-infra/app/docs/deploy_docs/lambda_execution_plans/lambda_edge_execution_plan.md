# Lambda@Edge Router Execution Plan

## Purpose

Route requests for built-in and custom domains by inspecting the `Host` header, rewriting the URI to the correct S3 prefix (`internal/{company}/index.html` or `external/{company}/index.html`), and returning the modified request. This logic runs on CloudFront cache misses before the origin is contacted.

## Source & Deployment Folder

- New directory: `lambda_edge/`
  - `router.py` (Lambda@Edge handler)
  - `README.md` with deployment script instructions
  - `deploy.sh` (CLI script that packages, publishes, and updates CloudFront)

## Handler Logic

```python
import json
import os
import time
import boto3

API_HOST = os.environ.get("DOMAIN_LOOKUP_API_HOST")  # e.g. https://api.getpagoda.site
CACHE_TTL_SECONDS = int(os.environ.get("DOMAIN_CACHE_TTL", "300"))
ALLOWED_SUFFIXES = {"getpagoda.site", "--preview.getpagoda.site"}

_cache = {"data": {}, "expires": 0}


def lambda_handler(event, context):
    request = event['Records'][0]['cf']['request']
    host = request['headers'].get('host', [{}])[0].get('value', '').lower()
    uri = request.get('uri', '/')

    if not _is_allowed_host(host):
        return _forbidden()

    mapping = _get_mapping(host)
    if not mapping:
        return _forbidden()

    target = mapping['target']  # e.g. "external/SalonName/index.html"
    request['uri'] = f"/{target}" if not target.startswith('/') else target
    return request


def _is_allowed_host(host: str) -> bool:
    return any(host.endswith(suffix) for suffix in ALLOWED_SUFFIXES)


def _forbidden() -> dict:
    return {
        "status": "403",
        "statusDescription": "Forbidden",
        "body": "Invalid host",
        "headers": {
            "cache-control": [{"key": "Cache-Control", "value": "max-age=60"}]
        },
    }


def _get_mapping(host: str) -> dict | None:
    now = time.time()
    if now > _cache['expires']:
        _cache['data'] = _fetch_mappings()
        _cache['expires'] = now + CACHE_TTL_SECONDS
    return _cache['data'].get(host)


def _fetch_mappings() -> dict:
    client = boto3.client('lambda')  # or use urllib3 for HTTPS API call
    response = urllib.request.urlopen(f"{API_HOST}/domain-router/mappings")
    data = json.load(response)
    # expected format: [{"host": "crownofbeauty.getpagoda.site", "target": "external/Crown Of Beauty/index.html"}, ...]
    return {item['host'].lower(): item for item in data}
```

### Notes

- `DOMAIN_LOOKUP_API_HOST` points to a lightweight regional API that returns host→target mappings (includes built-in and custom domains). The API should cache results and handle DB pooling.
- Cache TTL keeps the mapping in memory for 5 minutes; you can adjust via env variable.
- `_is_allowed_host` provides basic suffix filtering before hitting the API response; this is free throttling before mapping lookup.
- Cached 403 is returned for unknown hosts; CloudFront caches the 403 for 60 seconds.

## Regional Domain Lookup API (overview)

- Simple Lambda + API Gateway (HTTP API) in our primary region.
- Endpoint `/domain-router/mappings` returns JSON array combining `salon_subdomains` (live entries) and `salon_custom_domains` (active entries). Include preview entries for hosts ending in `--preview.getpagoda.site` pointing to `internal/` paths.
- Lambda caches DB results for 30 seconds to reduce load.

Cost estimate: ~1 M requests → ~$1 (API Gateway) + $0.20 (Lambda) + minimal compute. Latency ≈ round-trip to region (~150 ms from distant edges) plus DB read (cached).

## Deployment Workflow (CLI Script)

1. **Build package** (zip) with required dependencies (likely only stdlib if using HTTPS to regional API; no psycopg2 needed).
2. **Run `deploy.sh`**:

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail

   FUNCTION_NAME=pagoda-domain-router
   DISTRIBUTION_ID=E123456ABCDEFG

   aws lambda update-function-code \
     --region us-east-1 \
     --function-name "$FUNCTION_NAME" \
     --zip-file fileb://dist/router.zip

   VERSION=$(aws lambda publish-version \
     --region us-east-1 \
     --function-name "$FUNCTION_NAME" \
     --output text --query 'Version')

   aws cloudfront update-distribution \
     --id "$DISTRIBUTION_ID" \
     --if-match $(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query 'ETag' --output text) \
     --distribution-config file://cloudfront-config.json
   ```

   `cloudfront-config.json` should mirror the current distribution config with the `LambdaFunctionAssociation` updated to the new version ARN (`arn:aws:lambda:us-east-1:<acct>:function:$FUNCTION_NAME:$VERSION`).

3. Update `README.md` documenting these steps.

## IAM Role (us-east-1)

Grant the edge function minimal permissions:

- `lambda:GetFunction` (if needed)
- No DB access required when using the regional API.
- Allow outbound HTTPS to the API endpoint (default).
  If using DynamoDB, add `dynamodb:GetItem`; if using API, none needed beyond default.

## Monitoring & Alarms

- CloudWatch metric filters/alarms for:
  - Lambda@Edge invocations, errors, throttles
  - CloudFront `4xxErrorRate` / `5xxErrorRate` > thresholds
  - Request count spikes (optional budget alarm)
- Logging: ensure the edge function logs to CloudWatch Logs in `us-east-1` for debugging.

## Testing Strategy

- Unit tests for `_is_allowed_host`, `_get_mapping` (mock fetches), and caching behaviour.
- Integration test hitting the regional API to confirm response format.
- Stage deployment to dev/staging CloudFront distribution before production.

## Open Questions resolved

- Single CloudFront distribution handles preview + live (routing decides between `internal/` and `external/`).
- Lookup uses the lightweight regional API to avoid direct DB connections.
- Cached 403 approach for unknown hosts with short TTL.
- Deployment via AWS CLI script; SAM used only to package the function (optional separate SAM template in `lambda_edge/`).
