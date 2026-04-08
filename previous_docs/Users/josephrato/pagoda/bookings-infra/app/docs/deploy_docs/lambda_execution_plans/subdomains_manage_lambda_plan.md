# Subdomain Management Lambda Execution Plan (`endpoints/subdomains/lambda_handler.py`)

Includes both POST (claim/update) and GET current operations for built-in subdomains.

## POST Handler (Claim/Update)

```python
def post_lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    if not salon_id:
        raise BadRequestError("salon_id is required")

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

        repo.upsert_subdomain(salon_id, environment, subdomain)
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

## GET Handler (Current Subdomain)

```python
def get_lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    if not salon_id:
        raise BadRequestError("salon_id is required")

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

## Tests

- POST returns 409 when slug already claimed.
- POST upserts new slug and returns 200.
- GET returns 404 when none set.
- GET returns current slug when available.

## SAM Snippet (combined)

```yaml
ManageSubdomainFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/subdomains/lambda_handler.lambda_handler
    Layers:
      - !Ref DependencyLayer
    Events:
      PostSubdomainApi:
        Type: Api
        Properties:
          Path: /static-web-generator/{salon_id}/subdomains
          Method: post
          Auth:
            Authorizer: HybridRequestAuthorizer
      GetCurrentSubdomainApi:
        Type: Api
        Properties:
          Path: /static-web-generator/{salon_id}/subdomains/current
          Method: get
          Auth:
            Authorizer: HybridRequestAuthorizer
    Policies:
      - SecretsManagerReadWrite
```
