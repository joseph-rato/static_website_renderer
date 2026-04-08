# List Custom Domains Endpoint Execution Plan

## Goal & Outcome

- Provide a lightweight endpoint that returns all custom domains tied to a salon along with metadata (status, type, timestamps).
- Serve as the UI/backend hook for displaying which domains exist and their deployment state.

## Endpoint Details

- **Path**: `/static-web-generator/{salon_id}/domains`
- **Method**: `GET`
- **Query Parameters**: None (future: pagination or filter by `domain_type`).
- **Response (200)**:
  ```json
  {
    "domains": [
      {
        "custom_domain": "mysalon.com",
        "status": "active",
        "domain_type": "production",
        "created_at": "2025-11-01T17:45:00Z",
        "updated_at": "2025-11-07T18:04:00Z"
      }
    ],
    "total": 1
  }
  ```
- **Error Cases**: `400` when `salon_id` missing, `500` for repository/serialization failures.

## Pre-Implementation Checklist

- [ ] Repository exposes `list_custom_domains(salon_id)` returning rows with timestamps and domain metadata.
- [ ] Ensure DB timestamps stored in timezone-aware format or convert to UTC on read.
- [ ] Confirm origin validation is required (public but origin-locked like other endpoints).

## High-Level Flow

1. Initialize `ProxyRequest`, validate origin, extract `salon_id` (UUID string).
2. Invoke repository `list_custom_domains(salon_id)` to fetch ordered rows (newest first).
3. Transform DB rows into JSON-safe objects:
   - Format timestamps as ISO 8601 strings with trailing `Z`.
   - Include `domain_type` defaulting to `production` if NULL.
4. Return JSON containing `domains` array and `total` count.

## Detailed Implementation Steps

1. Add module `endpoints/list_domains/lambda_handler.py` with logger set to INFO.
2. Helper function `__list_custom_domains(salon_id)` to encapsulate repository call and optional sorting.
3. Response serialization:
   - Use list comprehension to convert each row (dict) into expected shape.
   - Guard against `None` timestamps by returning `null`.
4. Exception handling consistent with repo style:
   - Raise `BadRequestError` if `salon_id` missing.
   - Catch general exceptions -> log error and return 500.
5. Update SAM template with GET method, attach `DependencyLayer`, `HybridRequestAuthorizer`, SecretsManager policy.

## Repository Expectations

- SQL query example:
  ```sql
  SELECT custom_domain,
         status,
         domain_type,
         created_at,
         updated_at
    FROM salon_custom_domains
   WHERE salon_id = %s
  ORDER BY created_at DESC;
  ```
- Ensure DB client returns dict-like rows (existing pattern uses `DictCursor`).

## Testing Strategy

- **Unit Tests** (pytest):
  - Multiple domain records -> ensure order preserved and timestamps formatted.
  - Empty result -> return `[]` with `total: 0`.
  - Repository exception -> 500 response.
- **Integration**: Seed test database with sample domain rows and verify API output (using AWS SAM local or staging environment).

## Observability & Logging

- INFO log with `salon_id` and domain count.
- ERROR log on repository failure.
- Future: metrics `list_domains.count` for monitoring usage.

## Rollout Considerations

- Read-only endpoint; safe to deploy independently.
- Document in API reference for frontend integration.
- Optionally add pagination if domain volume grows; design response to be backward compatible.
