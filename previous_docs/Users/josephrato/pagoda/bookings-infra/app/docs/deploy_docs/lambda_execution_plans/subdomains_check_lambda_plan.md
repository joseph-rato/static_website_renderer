# Subdomain Availability Lambda Execution Plan (`endpoints/subdomains/check.lambda_handler`)

## Purpose

Validate availability of a built-in subdomain (`<slug>.pagoda.site`) before reserving it for a salon.

## Handler Flow

1. Parse query params `name` (required) and optional `environment` (default `live`).
2. Normalize and validate the slug (regex + reserved names).
3. Query `salon_subdomains` to see if slug is already claimed for that environment.
4. Return JSON with `available`, `reason`, `normalized`, and `environment`.

## Code Skeleton

```python
RESERVED_NAMES = {"admin", "support", "www", "pagoda", "api"}
SUBDOMAIN_RE = re.compile(r"^[a-z0-9](?:-?[a-z0-9]){1,61}[a-z0-9]$")

def lambda_handler(event, context):
    request = ProxyRequest(event)

    params = request.query_params or {}
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

## Tests

- Invalid formats return 400.
- Reserved names return `{available: false, reason: "reserved"}`.
- When slug exists in `salon_subdomains`, returns `available=false`.
- When slug unused, returns `available=true`.

## SAM Snippet

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
