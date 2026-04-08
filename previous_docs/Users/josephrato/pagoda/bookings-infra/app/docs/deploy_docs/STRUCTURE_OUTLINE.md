# Planned Folder/File Structure Additions

## Lambda Endpoints

```
endpoints/
  rebuild/
    __init__.py
    lambda_handler.py         # new rebuild endpoint (HTML regen + cache invalidation)

  register_domain/
    __init__.py
    lambda_handler.py         # new custom domain registration endpoint

  deploy_status/
    __init__.py
    lambda_handler.py         # deployment status polling endpoint

  list_domains/
    __init__.py
    lambda_handler.py         # list all custom domains for a salon

  domain_router/
    mappings/
      __init__.py
      lambda_handler.py       # domain lookup API (host → S3 target mappings)

  subdomains/
    claim/
      __init__.py
      lambda_handler.py       # claim/update built-in subdomain slug
    current/
      __init__.py
      lambda_handler.py       # fetch current built-in subdomain slug
```

## Shared Utilities & Repository Updates

```
repositories/
  static_web_generator.py     # add domain CRUD + rebuild logging helpers

static_web_handler/
  static_web_generator.py     # ensure public API supports rebuild workflow (if needed)
```

## Database Migrations (example names)

```
database/migrations/
  20251201_add_salon_custom_domains.sql
  20251201_add_salon_website_rebuilds.sql
```

## Infrastructure (SAM / Config)

```
app/init-bookings-app/static_web_generator/template.yaml
  - Add RebuildWebsiteFunction
  - Add RegisterDomainFunction
  - Add DeployStatusFunction
  - Add ListDomainsFunction

config/
  environment_variables.yml   # new env vars (CloudFrontDistributionId, flags)
```

## Documentation (already relocated)

```
endpoints/deploy_refactor/
  DEPLOY_BRAINSTORM.md
  HYBRID_APPROACH.md
  DOMAIN_ENDPOINTS_IMPLEMENTATION.md
  REGISTER_DOMAIN_PLAN.md
  DEPLOY_STATUS_PLAN.md
  LIST_DOMAINS_PLAN.md
  DEPLOYMENT_VS_UPDATES.md
  DEPLOY_VS_UPDATE_PLAN.md
  DEPLOYMENT_ROADMAP.md
  STRUCTURE_OUTLINE.md
```

## Testing

```
tests/
  unit/
    endpoints/
      test_rebuild_lambda.py
      test_register_domain_lambda.py
      test_deploy_status_lambda.py
      test_list_domains_lambda.py
      test_domain_lookup_api.py
      test_subdomains_check_lambda.py
      test_subdomains_manage_lambda.py

  integration/
    test_deploy_refactor_flow.py
```

## Feature Flags / Config (optional)

```
feature_flags/
  deploy_refactor.yaml        # toggles for enabling new endpoints
```
