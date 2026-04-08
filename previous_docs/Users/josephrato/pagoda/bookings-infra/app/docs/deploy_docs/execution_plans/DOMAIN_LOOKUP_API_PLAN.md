# Domain Lookup API — Detailed Execution Plan

Provides the regional lookup API consumed by Lambda@Edge. Returns the host → S3 target mappings for preview (`internal/`), built-in live (`external/`), and custom domains.

---

## 1. Scope Overview

- **Deliverables**
  - New endpoint folder: `static_web_generator/endpoints/domain_router/mappings/`
  - Lambda handler + unit tests + supporting auth/cache helpers.
  - SAM/CloudFormation additions (function, API event, environment variables, IAM policy wiring).
- **Primary Data Sources**
  - `salon_subdomains` (draft + live built-in subdomains).
  - `salon_custom_domains` (active custom domains).
- **Response Contract**
  ```json
  [
    {
      "host": "crownofbeauty.preview.pagoda.com",
      "target": "internal/Crown Of Beauty/index.html",
      "environment": "draft"
    },
    {
      "host": "crownofbeauty.pagoda.site",
      "target": "external/Crown Of Beauty/index.html",
      "environment": "live"
    },
    {
      "host": "crownofbeauty.com",
      "target": "external/Crown Of Beauty/index.html",
      "environment": "live"
    }
  ]
  ```

---

## 2. File & Folder Changes

| Path                                                                                     | Description                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `static_web_generator/endpoints/domain_router/mappings/__init__.py`                      | Package marker.                                                      |
| `static_web_generator/endpoints/domain_router/mappings/lambda_handler.py`                | Main handler + helpers.                                              |
| `static_web_generator/endpoints/domain_router/mappings/__tests__/test_lambda_handler.py` | Unit tests (cache behavior, merge logic, auth).                      |
| `static_web_generator/endpoints/domain_router/mappings/__tests__/test_merge_logic.py`    | Focused tests for `_merge_records`.                                  |
| `tests/init_bookings_app/static_web_generator/test_domain_lookup_api.py`                 | Higher-level tests exercising request/response formatting via mocks. |
| `template.yaml`                                                                          | New `DomainLookupApiFunction` resource + API event.                  |
| `deploy_refactor/STRUCTURE_OUTLINE.md`                                                   | Add the new endpoint folder to documentation index.                  |

> Note: Tests can live alongside the handler or under `tests/init_bookings_app/...` depending on existing convention; keep consistent with other endpoints (most static_web_generator endpoint tests live under `tests/init_bookings_app/static_web_generator/`).

---

## 3. Handler Design

### 3.1 Environment & Constants

- `CACHE_TTL_SECONDS` (default `"30"`) — in-memory cache duration.
- `ALLOWED_PREVIEW_SUFFIX` = `"preview.pagoda.com"`
- `BUILT_IN_SUFFIX` = `"pagoda.site"`
- `DEFAULT_ENVIRONMENT` = `"live"`

### 3.2 Auth Flow

1. Read API key header (`x-api-key`) or IAM context depending on chosen strategy.
2. Fail fast with 401 if header missing/mismatched. Keep `_authorized` helper isolated for unit testing.
3. Optional: allow configurable list of API keys via Secrets Manager parameter (fetch once + cache).

### 3.3 Cache Structure

```python
_CACHE: Dict[str, Any] = {"data": [], "expires": 0.0}
```

- Cache only the merged response (list of dicts).
- Refresh when `time.time() >= _CACHE["expires"]`.
- Wrap refresh in try/except; on failure, log and return 500 with empty cache (do not serve stale data unless explicitly desired).

### 3.4 Repository Calls

- Instantiate `DeployRepository` (not `StaticWebGeneratorRepository`) once per refresh:
  ```python
  with DatabaseConnection() as conn:
      repo = DeployRepository(conn)
      subdomains = repo.list_active_subdomains()
      custom_domains = repo.list_active_custom_domains()
  ```
- Expect `subdomains` rows containing `{"subdomain": "...", "environment": "...", "company_name": "...", "salon_id": "..."}`.
- Expect `custom_domains` rows containing `{"custom_domain": "...", "company_name": "...", "salon_id": "..."}`.

### 3.5 Merge & Normalization

```python
def _merge_records(subdomains, custom_domains):
    records = []
    for row in subdomains:
        environment = row.get("environment", DEFAULT_ENVIRONMENT)
        prefix = "internal" if environment == "draft" else "external"
        company = row["company_name"]
        host = f"{row['subdomain'].lower()}.{BUILT_IN_SUFFIX}"

        if environment == "draft":
            host = f"{row['subdomain'].lower()}.{ALLOWED_PREVIEW_SUFFIX}"

        records.append({
            "host": host,
            "target": f"{prefix}/{company}/index.html",
            "environment": environment,
        })

    for row in custom_domains:
        records.append({
            "host": row["custom_domain"].lower(),
            "target": f"external/{row['company_name']}/index.html",
            "environment": "live",
        })

    return sorted(records, key=lambda r: (r["environment"], r["host"]))
```

- Handle spaces/special characters in `company_name` exactly as stored (existing S3 copy logic already uses raw company names). If additional normalization is later required (slugging), perform it consistently across rebuild/deploy flows.
- Guarantee lowercased hosts for case-insensitive matching.

### 3.6 Error Handling

- Wrap DB operations in try/except. On exception:
  - Log error with structured fields (salon counts, environment).
  - Return `{"statusCode": 500, "body": json.dumps({"message": "Failed to load mappings"})}`.
- If auth fails: return 401 with no body or `{"message": "Unauthorized"}`.

### 3.7 Response Construction

```python
return request.format_response(
    200,
    _CACHE["data"],
    additional_headers={
        "Cache-Control": f"max-age={CACHE_TTL_SECONDS}",
    },
)
```

- Use `ProxyRequest` for consistency, but bypass origin validation (internal endpoint). Alternatively, return raw dict if ProxyRequest isn’t needed; maintain established pattern.

---

## 4. Testing Strategy

### 4.1 Unit Tests

- **`test_merge_records`**
  - Input: sample subdomains/custom domains covering draft/live/custom combos.
  - Assert host casing, target prefixes, environment labels, sort order.
- **`test_cache_refresh`**
  - Mock time and repository results; ensure data fetched once within TTL.
  - After TTL expiration, ensure repository called again.
- **`test_auth_failure`**
  - No API key → 401.
  - Wrong key → 401.
- **`test_database_error`**
  - Raise exception from repository call → 500 response; cache should remain unchanged.

### 4.2 Integration/Functional Tests

- Under `tests/init_bookings_app/static_web_generator/test_domain_lookup_api.py`:
  - Patch `DeployRepository` to return deterministic records; call handler via ProxyRequest-style event; assert final JSON matches expectation.
  - Verify `Cache-Control` header present.

### 4.3 Regression Tests

- Add targeted tests to ensure previously added repository helpers (`list_active_subdomains`, `list_active_custom_domains`) return the fields used by the handler (already covered in `test_deploy_repository.py` but cross-verify).

---

## 5. Deployment & Configuration

### 5.1 SAM Template (`template.yaml`)

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
            ApiKeyRequired: true # or replace with IAM authorizer
    Environment:
      Variables:
        CACHE_TTL_SECONDS: "30"
    Policies:
      - SecretsManagerReadWrite
      - !Ref RdsAccessPolicy # reuse existing policy granting DB connectivity
```

- Attach the same VPC config/security groups as other DB-backed lambdas (if applicable).
- If using API keys, ensure Usage Plan and key distribution handled in deployment checklist.

### 5.2 Environment Variables / Secrets

- `CACHE_TTL_SECONDS` (string).
- `ALLOWED_API_KEYS` (optional; could be a comma-separated string or Secrets Manager ARN).
- Reuse existing DB connection env vars (`DATABASE_SECRET_NAME`, etc.).

### 5.3 Deployment Checklist

1. Update `STRUCTURE_OUTLINE.md` to list the new endpoint.
2. Ensure migrations for `salon_subdomains` + updated `salon_custom_domains` are applied (already part of earlier phases).
3. Deploy SAM stack; confirm API Gateway route reachable only with API key/IAM.
4. Provide Lambda@Edge deployment with the required API key/credentials.

---

## 6. Observability & Operations

- **Logging**
  - Log cache refresh counts and durations.
  - Log number of returned records (len of `_CACHE["data"]`).
- **Metrics**
  - CloudWatch: invocations, duration, throttles, errors.
  - Custom metric: `MappingsCount`.
- **Alarms**
  - Error rate > 1% for 5 minutes.
  - Duration approaching timeout (if TTL refresh begins to slow).
- **Runbooks**
  - Document manual cache invalidation procedure (e.g., update TTL env var or deploy new version).
  - Outline steps to rotate API keys or IAM permissions.

---

## 7. Rollout Strategy

1. **Develop**
   - Implement handler, helpers, tests.
   - Update SAM + documentation.
2. **Validate Locally**
   - Run unit tests (`pytest tests/init_bookings_app/static_web_generator/test_domain_lookup_api.py`).
   - Run full static_web_generator suite.
3. **Deploy to Dev**
   - Verify API responds with merged entries from seeded dev data.
   - Confirm Lambda@Edge sandbox hitting new endpoint receives expected mappings.
4. **Staging**
   - Test with staging subdomains/custom domains; monitor metrics.
5. **Production**
   - Deploy.
   - Update Lambda@Edge configuration to call production endpoint.
   - Monitor mapping latency and error metrics for 24 hours.

---

## 8. Open Questions / Follow-ups

- Decide final authorization mechanism (API key vs IAM). Update `_authorized` code accordingly.
- Confirm naming convention for preview hosts (`*.preview.pagoda.com` vs `preview.pagoda.site`).
- Determine whether to serve stale cache results on DB failure (current plan prefers failing fast; adjust if necessary).
- If company names can contain characters unsuitable for S3 keys, ensure normalization matches rebuild/deploy logic (documented in `rebuild_lambda_plan.md`).

---

With this plan, implementation should mirror the depth and conventions of existing static web generator endpoints, ensuring the Domain Lookup API integrates cleanly into the deploy_refactor roadmap.
