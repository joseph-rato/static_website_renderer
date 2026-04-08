# Migrations Execution Plan

This plan groups all schema changes by the Lambda handler(s) that rely on them and references the migration scripts we need to add under `app/init-bookings-app/scripts/`.

## 1. Rebuild Lambda (`endpoints/rebuild/lambda_handler.py`)

**Purpose:** store rebuild logs and cache invalidation IDs for diagnostics.

```
create_salon_website_rebuilds/
  ├── __init__.py
  ├── create-salon-website-rebuilds.sql
  └── lambda_handler.py
```

`create-salon-website-rebuilds.sql`:

```sql
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

CREATE INDEX IF NOT EXISTS idx_salon_website_rebuilds_salon_id_created_at
    ON salon_website_rebuilds (salon_id, created_at DESC);
```

**Field descriptions**

- `id`: unique identifier for each rebuild event.
- `salon_id`: FK to `salons.uuid`; ties rebuild to the salon.
- `company_name`: denormalized snapshot for easy reporting/debugging.
- `html_size`: size of generated HTML (bytes) to monitor growth.
- `preview_s3_path`: S3 key written to the preview folder.
- `production_s3_path`: S3 key written to the live folder.
- `cache_invalidation_id`: CloudFront invalidation request ID.
- `status`: success/failure flag for the rebuild.
- `error_message`: stored when status != success.
- `created_at`: when the rebuild completed.

## 2. Custom Domain Lambdas (`register_domain`, `deploy_status`, `list_domains`)

**Purpose:** capture CloudFront, ACM, and Route 53 metadata for each custom domain.

```
update_salon_custom_domains/
  ├── __init__.py
  ├── update-salon-custom-domains.sql
  └── lambda_handler.py
```

`update-salon-custom-domains.sql`:

```sql
ALTER TABLE salon_custom_domains
    ADD COLUMN IF NOT EXISTS domain_type VARCHAR(50) DEFAULT 'production',
    ADD COLUMN IF NOT EXISTS cloudfront_distribution_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS hosted_zone_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS record_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ssl_certificate_arn VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS deployment_started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_salon_custom_domains_domain
    ON salon_custom_domains (custom_domain);

CREATE INDEX IF NOT EXISTS idx_salon_custom_domains_salon_updated
    ON salon_custom_domains (salon_id, updated_at DESC);
```

**Field descriptions**

- `domain_type`: distinguishes production vs preview entries.
- `cloudfront_distribution_id`: distribution handling this domain (needed for updates/teardown).
- `hosted_zone_id`: Route 53 hosted zone ID for the domain.
- `record_name`: DNS record that points to CloudFront.
- `ssl_certificate_arn`: ACM certificate ARN associated with the domain.
- `status`: deployment status (`pending`, `active`, etc.).
- `deployment_started_at`: timestamp when infrastructure provisioning began.
- `updated_at`: last update timestamp (used for ordering).

Existing table `salon_custom_domains` already stores one row per custom domain (columns like `salon_id`, `custom_domain`, `company_name`, etc.). These new columns extend that record with deployment metadata.

## 3. Built-In Subdomain Lambdas (`subdomains/check`, `subdomains`, Domain Lookup API)

**Purpose:** track draft/live subdomain claims for the pagoda.site wildcard.

```
create_salon_subdomains/
  ├── __init__.py
  ├── create-salon-subdomains.sql
  └── lambda_handler.py
```

`create-salon-subdomains.sql`:

```sql
CREATE TABLE IF NOT EXISTS salon_subdomains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    environment VARCHAR(16) NOT NULL CHECK (environment IN ('draft', 'live')),
    subdomain VARCHAR(63) NOT NULL,
    UNIQUE (subdomain, environment),
    UNIQUE (salon_id, environment)
);

CREATE INDEX IF NOT EXISTS idx_salon_subdomains_environment
    ON salon_subdomains (environment);
```

**Field descriptions**

- `id`: unique identifier for the subdomain record.
- `salon_id`: FK to `salons`; identifies the owner.
- `environment`: `draft` for preview, `live` for production.
- `subdomain`: chosen slug (without `.pagoda.site` suffix).
- Unique constraints ensure no collisions by environment and one record per environment per salon.

## Rollout Notes

- Apply migrations in a single PR to avoid cross-PR dependency issues.
- Run migrations before deploying corresponding lambdas so the tables/columns exist.
- For existing data:
  - Backfill `domain_type` to `'production'` and `status` to `'active'` where appropriate.
  - Populate `updated_at` with `NOW()` for existing rows.
  - Seed `salon_subdomains` with current built-in subdomains (follow-up script).
- Update repository methods immediately after migrations land.
- Scripts follow the existing manual script pattern (`.sql` + `lambda_handler.py` + verification).
