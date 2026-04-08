# Repository Method Changes Execution Plan

Centralizes all repository-level updates referenced across lambda execution plans.

## Target File

`app/init-bookings-app/static_web_generator/repositories/deploy_repository.py`

## 1. Custom Domain Management Helpers

### `save_custom_domain_config(...)`

```python
def save_custom_domain_config(
    self,
    salon_id: str,
    custom_domain: str,
    company_name: str,
    domain_type: str,
    cloudfront_distribution_id: str,
    ssl_certificate_arn: str,
    hosted_zone_id: str,
    record_name: str,
    status: str,
) -> None:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO salon_custom_domains (
                salon_id,
                custom_domain,
                company_name,
                domain_type,
                cloudfront_distribution_id,
                ssl_certificate_arn,
                hosted_zone_id,
                record_name,
                status,
                deployment_started_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (custom_domain)
            DO UPDATE SET
                company_name = EXCLUDED.company_name,
                domain_type = EXCLUDED.domain_type,
                cloudfront_distribution_id = EXCLUDED.cloudfront_distribution_id,
                ssl_certificate_arn = EXCLUDED.ssl_certificate_arn,
                hosted_zone_id = EXCLUDED.hosted_zone_id,
                record_name = EXCLUDED.record_name,
                status = EXCLUDED.status,
                updated_at = NOW()
            """,
            (
                salon_id,
                custom_domain,
                company_name,
                domain_type,
                cloudfront_distribution_id,
                ssl_certificate_arn,
                hosted_zone_id,
                record_name,
                status,
            ),
        )
```

### `get_custom_domain_config(salon_id, custom_domain=None)`

```python
def get_custom_domain_config(self, salon_id: str, custom_domain: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with self.connection.cursor() as cursor:
        if custom_domain:
            cursor.execute(
                """
                SELECT *
                  FROM salon_custom_domains
                 WHERE salon_id = %s AND custom_domain = %s
                """,
                (salon_id, custom_domain),
            )
        else:
            cursor.execute(
                """
                SELECT *
                  FROM salon_custom_domains
                 WHERE salon_id = %s
              ORDER BY updated_at DESC
                 LIMIT 1
                """,
                (salon_id,),
            )
        return cursor.fetchone()
```

### `update_domain_status(...)`

```python
def update_domain_status(self, salon_id: str, custom_domain: str, status: str) -> None:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE salon_custom_domains
               SET status = %s,
                   updated_at = NOW()
             WHERE salon_id = %s AND custom_domain = %s
            """,
            (status, salon_id, custom_domain),
        )
```

### `list_custom_domains(salon_id)`

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
            (salon_id,),
        )
        return cursor.fetchall()
```

### `get_active_custom_domain(salon_id)`

```python
def get_active_custom_domain(self, salon_id: str) -> Optional[str]:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT custom_domain
              FROM salon_custom_domains
             WHERE salon_id = %s AND status = 'active'
          ORDER BY updated_at DESC
             LIMIT 1
            """,
            (salon_id,),
        )
        row = cursor.fetchone()
        return row["custom_domain"] if row else None
```

## 2. Rebuild Logging

### `record_rebuild_event(...)`

```python
def record_rebuild_event(
    self,
    salon_id: str,
    company_name: str,
    html_size: int,
    preview_path: str,
    production_path: str,
    cache_invalidation_id: str,
    status: str = 'success',
    error_message: Optional[str] = None,
) -> None:
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

## 3. Built-In Subdomain Helpers

### `check_subdomain_available(subdomain, environment)`

```python
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
```

### `upsert_subdomain(salon_id, environment, subdomain)`

```python
def upsert_subdomain(self, salon_id: str, environment: str, subdomain: str) -> None:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO salon_subdomains (salon_id, environment, subdomain)
            VALUES (%s, %s, %s)
            ON CONFLICT (salon_id, environment)
            DO UPDATE SET subdomain = EXCLUDED.subdomain
            """,
            (salon_id, environment, subdomain),
        )
```

### `get_subdomain(salon_id, environment)`

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
```

## 4. Domain Lookup API Helpers

### `list_active_subdomains()`

```python
def list_active_subdomains(self) -> List[Dict[str, Any]]:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT ss.subdomain,
                   ss.environment,
                   ss.salon_id,
                   s.salon_name AS company_name
              FROM salon_subdomains ss
              JOIN salons s ON ss.salon_id = s.uuid
            """,
        )
        return cursor.fetchall()
```

### `list_active_custom_domains()`

```python
def list_active_custom_domains(self) -> List[Dict[str, Any]]:
    with self.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT custom_domain,
                   company_name,
                   salon_id
              FROM salon_custom_domains
             WHERE status = 'active'
            """,
        )
        return cursor.fetchall()
```

## Notes

- Use existing `DictCursor` so `row["field"]` works.
- Unit tests live in `tests/init_bookings_app/static_web_generator/test_deploy_repository.py` and cover each helper's happy/edge paths (insert/update execution, result handling, rollback).
- These helpers were extracted into `DeployRepository` to keep `StaticWebGeneratorRepository` focused on preview/template read paths.
