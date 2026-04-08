# Migration Script Lambda Plans (`app/init-bookings-app/scripts/`)

Each migration in `execution_plans/MIGRATIONS_PLAN.md` needs a companion script folder following the existing pattern (`.sql` file + `lambda_handler.py`). This doc outlines the structure and handler behaviour for each.

## 1. `scripts/create_salon_website_rebuilds`

- `create-salon-website-rebuilds.sql`: contains the `CREATE TABLE` + index statements for `salon_website_rebuilds`.
- `lambda_handler.py` flow:
  1. Log current existence of table (query `information_schema.tables`).
  2. Execute SQL file.
  3. Commit transaction.
  4. Verify table exists with expected columns (query `information_schema.columns`).
  5. Return JSON body summarizing success.

## 2. `scripts/update_salon_custom_domains`

- `update-salon-custom-domains.sql`: contains `ALTER TABLE` statements + index creation.
- `lambda_handler.py` flow:
  1. Log sample row counts before change.
  2. Execute SQL file.
  3. Commit.
  4. Verify new columns exist (and optionally log default values).
  5. Return JSON with list of added columns.

## 3. `scripts/create_salon_subdomains`

- `create-salon-subdomains.sql`: creates table + index.
- `lambda_handler.py` flow:
  1. Log existing subdomain tables (should be none initially).
  2. Execute SQL file.
  3. Commit.
  4. Verify table and constraints exist.
  5. Optionally log count of rows (should be 0 post-creation).

### Shared Helper Pattern (`lambda_handler.py`)

```python
SQL_FILES_TO_RUN = ["<filename>.sql"]

def lambda_handler(event, context):
    logger.info("Starting migration ...")
    with DatabaseConnection() as conn:
        for sql_file in SQL_FILES_TO_RUN:
            with open(sql_file, "r", encoding="utf-8") as f:
                conn.execute(f.read())
        conn.commit()
        _verify(conn)
    return {"statusCode": 200, "body": {"message": "Migration completed"}}
```

- `_verify` should run tailored checks per migration.
- Include logging similar to existing scripts (before/after snapshots).

These scripts can be invoked via the existing manual script runner infrastructure or deployed temporarily when needed.
