# Built-In Subdomain Endpoints – Execution Plan

## Overview

Support the “Built-In Domain” flow (`<slug>.pagoda.site`) by delivering three API endpoints and a database table that tracks draft and live subdomain assignments per salon.

## Simplified Table Schema

Create new table `salon_subdomains` storing only current state (no audit trail).

```sql
CREATE TABLE salon_subdomains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    environment VARCHAR(16) NOT NULL CHECK (environment IN ('draft', 'live')),
    subdomain VARCHAR(63) NOT NULL,
    UNIQUE (subdomain, environment),
    UNIQUE (salon_id, environment)
);
```

- `environment` distinguishes draft vs live records.
- One active row per `(salon_id, environment)`; uniqueness on `(subdomain, environment)` prevents collisions.
- No additional audit columns; overwrite entries when they change.

### Repository helpers (to add in `StaticWebGeneratorRepository`)

```python
def get_subdomain(self, salon_id: str, environment: str) -> Optional[str]:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT subdomain
              FROM salon_subdomains
             WHERE salon_id = %s AND environment = %s
            """,
            (salon_id, environment),
        )
        row = cursor.fetchone()
        return row["subdomain"] if row else None


def check_subdomain_available(self, subdomain: str, environment: str) -> bool:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
              FROM salon_subdomains
             WHERE subdomain = %s AND environment = %s
            """,
            (subdomain, environment),
        )
        return cursor.fetchone() is None


def upsert_subdomain(
    self,
    salon_id: str,
    environment: str,
    subdomain: str,
) -> str:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO salon_subdomains (salon_id, environment, subdomain)
            VALUES (%s, %s, %s)
            ON CONFLICT (salon_id, environment)
            DO UPDATE SET subdomain = EXCLUDED.subdomain
            RETURNING subdomain
            """,
            (salon_id, environment, subdomain),
        )
        row = cursor.fetchone()
        return row["subdomain"]
```

(If a separate table already stores `company_name`, the router can join on `salon_id` when needed.)

## Endpoint 1: Check Availability

- **Method**: `GET /static-web-generator/subdomains/check`
- **Query params**: `name=slug`, `environment=draft|live` (default `live`).
- **Response**:
  ```json
  {
    "available": true,
    "reason": null,
    "normalized": "crownofbeauty"
  }
  ```

### Request handling

```python
RESERVED_NAMES = {"admin", "support", "www", "pagoda", "api"}
SUBDOMAIN_RE = re.compile(r"^[a-z0-9](?:-?[a-z0-9]){1,61}[a-z0-9]$")


def lambda_handler(event, context):
    request = ProxyRequest(event)

    params = request.query_params
    raw_name = (params.get("name") or "").strip().lower()
    environment = (params.get("environment") or "live").lower()

    if not SUBDOMAIN_RE.match(raw_name):
        return request.format_response(400, {"available": False, "reason": "invalid_format"})
    if raw_name in RESERVED_NAMES:
        return request.format_response(200, {"available": False, "reason": "reserved"})

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)
        is_free = repo.check_subdomain_available(raw_name, environment)

    return request.format_response(
        200,
        {
            "available": is_free,
            "reason": None if is_free else "taken",
            "normalized": raw_name,
            "environment": environment,
        },
    )
```

## Endpoint 2: Claim/Update Subdomain

- **Method**: `POST /static-web-generator/{salon_id}/subdomains`
- **Body**: `{ "subdomain": "crownofbeauty", "environment": "live" }`

```python
def lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    body = request.body
    subdomain = (body.get("subdomain") or "").strip().lower()
    environment = (body.get("environment") or "live").lower()

    if not SUBDOMAIN_RE.match(subdomain):
        return request.format_response(400, {"message": "invalid subdomain"})
    if subdomain in RESERVED_NAMES:
        return request.format_response(409, {"message": "reserved name"})

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)
        if not repo.check_subdomain_available(subdomain, environment):
            return request.format_response(409, {"message": "subdomain already taken"})

        repo.upsert_subdomain(
            salon_id=salon_id,
            environment=environment,
            subdomain=subdomain,
        )
        conn.commit()

    return request.format_response(
        200,
        {
            "subdomain": subdomain,
            "environment": environment,
            "full_domain": f"{subdomain}.pagoda.site",
        },
    )
```

## Endpoint 3: Get Current Subdomain

- **Method**: `GET /static-web-generator/{salon_id}/subdomains/current`

```python
def lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    environment = (request.query_params.get("environment") or "live").lower()

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)
        subdomain = repo.get_subdomain(salon_id, environment)

    if not subdomain:
        return request.format_response(404, {"message": "subdomain not set"})

    return request.format_response(
        200,
        {
            "subdomain": subdomain,
            "environment": environment,
            "full_domain": f"{subdomain}.pagoda.site",
        },
    )
```

(Additional delete endpoint remains optional; if not needed, omit.)

## Routing Integration

- CloudFront/Lambda@Edge should use this table to map host → S3 path. Live traffic queries `environment='live'`; staging requests can query `environment='draft'`.

## Testing Strategy

- Validation edge cases (reserved names, invalid formats).
- Concurrent claim attempts to ensure DB uniqueness works.
- Round-trip tests for set/get across both environments.

## SAM Template Additions

(Same as previous version, minus references to removed columns.)

```yaml
CheckSubdomainFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/subdomains/check.lambda_handler
    Layers:
      - !Ref DependencyLayer
    Events:
      CheckSubdomainApi:
        Type: Api
        Properties:
          Path: /static-web-generator/subdomains/check
          Method: get
          Auth:
            Authorizer: HybridRequestAuthorizer
```

(Repeat for claim/get endpoints.)

## Next Steps

1. Create migration for simplified `salon_subdomains` table.
2. Implement repository helpers and endpoints.
3. Update routing logic to use `environment` filter for live vs draft.
4. Add tests validating the flows.
