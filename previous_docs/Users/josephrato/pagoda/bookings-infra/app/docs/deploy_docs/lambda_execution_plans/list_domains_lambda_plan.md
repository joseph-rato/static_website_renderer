# List Custom Domains Lambda Execution Plan (`endpoints/list_domains/lambda_handler.py`)

## Purpose

Return all custom domain configurations for a salon, enabling the UI to display status, type, and timestamps.

## Handler Flow

1. Extract `salon_id`.
2. Query repository for all domain rows ordered by `created_at` desc.
3. Serialize data into JSON-safe objects (ISO timestamps, default `domain_type`).
4. Return response with `domains` array and `total` count.

## Code Skeleton

```python
def lambda_handler(event, context):
    request = ProxyRequest(event)

    salon_id = event.get("pathParameters", {}).get("salon_id")
    if not salon_id:
        raise BadRequestError("salon_id is required")

    with DatabaseConnection() as conn:
        repo = StaticWebGeneratorRepository(conn)
        domains = repo.list_custom_domains(salon_id)

    formatted = [
        {
            "custom_domain": row["custom_domain"],
            "status": row["status"],
            "domain_type": row.get("domain_type") or "production",
            "created_at": row["created_at"].isoformat() + "Z" if row.get("created_at") else None,
            "updated_at": row["updated_at"].isoformat() + "Z" if row.get("updated_at") else None,
        }
        for row in domains
    ]

    return request.format_response(
        200,
        {
            "domains": formatted,
            "total": len(formatted),
        },
    )
```

## Repository Helper

```python
def list_custom_domains(self, salon_id: str) -> List[Dict[str, Any]]:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT custom_domain,
                   status,
                   domain_type,
                   created_at,
                   updated_at
              FROM salon_custom_domains
             WHERE salon_id = %s
          ORDER BY created_at DESC
            """,
            (salon_id,)
        )
        return cursor.fetchall()
```

## Error Handling

- Missing `salon_id` → 400 (BadRequestError)
- Repository errors → log and return 500 with generic body

## Tests

- Salon with multiple domains returns ordered results
- Salon with no domains returns empty array
- Timestamp fields serialized correctly

## SAM Snippet

```yaml
ListDomainsFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: static_web_generator
    Handler: endpoints/list_domains/lambda_handler.lambda_handler
    Layers:
      - !Ref DependencyLayer
    Events:
      ListDomainsEndpoint:
        Type: Api
        Properties:
          Path: /static-web-generator/{salon_id}/domains
          Method: get
          Auth:
            Authorizer: HybridRequestAuthorizer
    Policies:
      - SecretsManagerReadWrite
```
