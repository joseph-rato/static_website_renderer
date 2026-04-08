# Preview HTML Loading Issue - Root Cause Analysis

**Date:** December 2024
**Status:** Blocking - Preview subdomains not loading HTML content
**Affected URLs:** `dev--{subdomain}--preview.getpagoda.site`, `test--{subdomain}--preview.getpagoda.site`, `{subdomain}--preview.getpagoda.site`

---

## Executive Summary

Preview subdomain URLs are not returning the correct HTML content due to a cascading failure in the domain routing system. The root cause is **authentication failure** between Lambda@Edge and the domain router API, preventing Lambda@Edge from obtaining domain-to-S3-path mappings. This causes all preview domain requests to return `403 Forbidden` instead of the expected HTML content.

---

## Architecture Overview

### Expected Flow for Preview Requests

```
1. User requests: https://dev--devsalonbeauty--preview.getpagoda.site/
   ↓
2. CloudFront receives request → invokes Lambda@Edge router
   ↓
3. Lambda@Edge fetches domain mappings from domain router API
   GET https://{api-id}.execute-api.us-east-1.amazonaws.com/Prod/domain-router/mappings
   Header: x-api-key: {LAMBDA_EDGE_IDENTIFIER}
   ↓
4. Domain router API returns mappings:
   [
     {
       "host": "dev--devsalonbeauty--preview.getpagoda.site",
       "target": "internal/dev_salon_beauty/index.html",
       "environment": "draft"
     }
   ]
   ↓
5. Lambda@Edge modifies request URI to: /internal/dev_salon_beauty/index.html
   ↓
6. CloudFront serves HTML from S3 bucket at that path
   ↓
7. User receives HTML content ✅
```

### Current Flow (Broken)

```
1. User requests: https://dev--devsalonbeauty--preview.getpagoda.site/
   ↓
2. CloudFront receives request → invokes Lambda@Edge router
   ↓
3. Lambda@Edge attempts to fetch domain mappings
   GET https://{api-id}.execute-api.us-east-1.amazonaws.com/Prod/domain-router/mappings
   Header: x-api-key: {LAMBDA_EDGE_IDENTIFIER}
   ↓
4. Domain router API returns: 401 Unauthorized ❌
   Response: {"message": "Unauthorized"}
   ↓
5. Lambda@Edge logs: "Failed to fetch domain mappings: HTTP Error 401: Unauthorized"
   ↓
6. Lambda@Edge has no mappings → cannot route request
   ↓
7. Lambda@Edge returns: 403 Forbidden ❌
   Response: "Invalid host"
   ↓
8. User sees 403 Forbidden instead of HTML content ❌
```

---

## Root Causes

### 1. Primary Issue: Lambda@Edge Authentication Failure (401 Unauthorized)

**Location:** `app/lambda_edge/router.py` → `_fetch_mappings()`
**Domain Router API:** `app/init-bookings-app/static-site-generator/endpoints/domain_router/mappings/lambda_handler.py`

**Problem:**

- Lambda@Edge sends `x-api-key` header with value from `LAMBDA_EDGE_IDENTIFIER` environment variable
- Domain router API expects `x-api-key` header to match secret value from AWS Secrets Manager (secret name: `lambdaEdgeIdentifier`)
- The values do **not** match, causing 401 Unauthorized

**Evidence:**

- Lambda@Edge logs show: `Failed to fetch domain mappings: HTTP Error 401: Unauthorized`
- All direct API calls to domain router endpoint return 401, regardless of which secret is tested
- Domain router lambda has an `ImportError: No module named 's3_utils'` when invoked directly, but the 401 response format matches the lambda's `_unauthorized()` response, suggesting API Gateway is routing correctly but authorization fails

**Code References:**

```python
# Lambda@Edge (app/lambda_edge/router.py:58-60)
url = f"{API_HOST.rstrip('/')}/domain-router/mappings"
request = urllib.request.Request(url)
request.add_header("x-api-key", LAMBDA_EDGE_IDENTIFIER)  # ← Value from env var

# Domain Router API (app/init-bookings-app/static-site-generator/endpoints/domain_router/mappings/lambda_handler.py:63-70)
def _authorized(headers: Dict[str, str]) -> bool:
    expected_identifier = _get_api_key()  # ← Gets from Secrets Manager
    supplied_identifier = get_header_case_insensitive(headers, "x-api-key")
    return supplied_identifier == expected_identifier  # ← Mismatch causes failure
```

**Secrets Tested (All Return 401):**

- `lambdaEdgeIdentifier` (62 characters)
- `DEV-domainLookupApiKey` (36 characters, UUID format)
- `domainLookupApiKey` (62 characters, same as lambdaEdgeIdentifier)

### 2. Secondary Issue: Domain Router Lambda Import Error

**Location:** `/aws/lambda/booking-domain-lookup-api` logs

**Problem:**

- Domain router lambda has `ImportError: No module named 's3_utils'` when invoked directly
- This prevents testing the lambda's authorization logic independently
- However, the lambda still responds through API Gateway (suggesting the import error may be environment-specific or the lambda is being invoked differently through API Gateway)

**Impact:**

- Cannot verify which API key value the lambda expects until import error is resolved
- Makes debugging the authentication mismatch more difficult

**Note:** The lambda imports `s3_utils.static_web_s3_client` but this may not be included in the lambda layer dependencies.

### 3. Flow Dependency Chain

The preview HTML loading depends on a chain of components, all of which must work:

1. ✅ **Database:** Subdomain records exist in `salon_subdomains` table
2. ✅ **S3:** Preview HTML files exist at `internal/{sanitized_company_name}/index.html`
3. ❌ **Domain Router API:** Cannot be accessed due to authentication failure
4. ❌ **Lambda@Edge:** Cannot fetch mappings due to API authentication failure
5. ❌ **CloudFront:** Returns 403 Forbidden because Lambda@Edge cannot route request

---

## Code Analysis

### S3 Path Generation (Verified Correct)

The code that generates and stores S3 paths is consistent across all components:

**1. Preview Generation (`generate_company_website`):**

```python
# app/init-bookings-app/static-site-generator/static_web_handler/static_web_handler.py:257
company_name = _sanitize_company_name(company_name)  # Sanitize once
# Line 282-283: Upload with sanitized name
upload_success = self.s3_client.upload_website_files(
    company_name, generated_website, folder="internal"
)
# Line 290: Save to database with same sanitized name
"s3_location": f"internal/{company_name}/index.html"
```

**2. S3 Upload (`upload_website_files`):**

```python
# app/init-bookings-app/static-site-generator/layers/s3_utils/python/s3_utils/static_web_s3_client.py:177
sanitized_name = _sanitize_company_name(company_name)  # Sanitize again (idempotent)
# Line 180: Upload to S3
html_key = f"{folder}/{sanitized_name}/index.html"
```

**3. Domain Router Mapping Generation:**

```python
# app/init-bookings-app/static-site-generator/endpoints/domain_router/mappings/lambda_handler.py:135-139
sanitized_company_name = _sanitize_company_name(row["company_name"])
records.append({
    "host": host,
    "target": f"{prefix}/{sanitized_company_name}/index.html",  # Matches stored path
    "environment": environment,
})
```

**Conclusion:** S3 path generation is consistent. The issue is not with path mismatches, but with the authentication preventing Lambda@Edge from obtaining the mappings.

### Sanitization Function

The `_sanitize_company_name()` function is used consistently:

```python
def _sanitize_company_name(company_name: str) -> str:
    sanitized_name = "".join(
        c for c in company_name if c.isalnum() or c in (" ", "-", "_")
    ).rstrip()
    sanitized_name = sanitized_name.replace(" ", "_").lower()
    return sanitized_name
```

**Examples:**

- `"Dev Salon"` → `"dev_salon"`
- `"Crown Of Beauty"` → `"crown_of_beauty"`
- `"dev-salon"` → `"dev-salon"` (unchanged)

---

## Impact

### User-Facing Symptoms

- Preview subdomain URLs return `403 Forbidden` instead of HTML content
- Users cannot preview their website before deploying
- Preview functionality is completely broken

### Affected Environments

- **DEV:** `dev--{subdomain}--preview.getpagoda.site`
- **TEST:** `test--{subdomain}--preview.getpagoda.site`
- **PROD:** `{subdomain}--preview.getpagoda.site`

### Affected Components

- Lambda@Edge router (`us-east-1.pagoda-edge-router-dev`)
- Domain router API (`booking-domain-lookup-api`)
- CloudFront distribution serving preview subdomains

---

## Required Fixes

### Priority 1: Fix Authentication Mismatch

**Action Items:**

1. **Identify the correct API key value:**
   - Retrieve the actual value from Secrets Manager secret `lambdaEdgeIdentifier`
   - Verify this matches what Lambda@Edge is sending in the `x-api-key` header
   - Check Lambda@Edge environment variables (`LAMBDA_EDGE_IDENTIFIER`)

2. **Fix the mismatch:**
   - **Option A:** Update Lambda@Edge's `LAMBDA_EDGE_IDENTIFIER` environment variable to match the secret
   - **Option B:** Update the secret in Secrets Manager to match what Lambda@Edge is sending
   - **Option C:** Regenerate both and ensure they match

3. **Verify the fix:**
   - Test domain router API endpoint directly with the correct API key
   - Verify Lambda@Edge can successfully fetch mappings
   - Test a preview subdomain URL end-to-end

### Priority 2: Fix Domain Router Lambda Import Error

**Action Items:**

1. **Verify layer dependencies:**
   - Check if `s3_utils` layer is included in domain router lambda's layer configuration
   - Review `template.yaml` for `DomainLookupApiFunction` layers

2. **Fix import issue:**
   - Add `S3UtilsLayer` to domain router lambda layers if missing
   - Ensure `s3_utils.static_web_s3_client` is accessible in lambda runtime

3. **Verify lambda can execute:**
   - Test lambda invocation directly (not through API Gateway)
   - Confirm no import errors in logs

### Priority 3: Add Monitoring and Error Handling

**Action Items:**

1. **Add CloudWatch alarms:**
   - Monitor domain router API 401 error rate
   - Alert when Lambda@Edge fails to fetch mappings

2. **Improve error logging:**
   - Add more context to 401 errors (which key was expected vs. received)
   - Log Lambda@Edge identifier value (first/last few chars only for security)

3. **Add fallback behavior:**
   - Consider caching mappings in Lambda@Edge for longer periods as fallback
   - Add retry logic with exponential backoff

---

## Testing Plan

### Test Case 1: Verify Domain Router API Authentication

```bash
# 1. Get the correct API key from Secrets Manager
aws secretsmanager get-secret-value --secret-id lambdaEdgeIdentifier --region us-east-1

# 2. Test domain router API with correct key
curl -H "x-api-key: {CORRECT_KEY}" \
  https://{api-id}.execute-api.us-east-1.amazonaws.com/Prod/domain-router/mappings

# Expected: 200 OK with JSON array of mappings
```

### Test Case 2: Verify Lambda@Edge Environment Variable

```bash
# Check Lambda@Edge function configuration
aws lambda get-function-configuration \
  --function-name us-east-1.pagoda-edge-router-dev \
  --region us-east-1 \
  --query 'Environment.Variables.LAMBDA_EDGE_IDENTIFIER'

# Compare with secret value
```

### Test Case 3: End-to-End Preview URL Test

```bash
# Test preview subdomain URL
curl -I https://dev--devsalonbeauty--preview.getpagoda.site/

# Expected: 200 OK with HTML content
# Current: 403 Forbidden
```

### Test Case 4: Verify S3 File Exists

```bash
# Check if preview HTML exists in S3
aws s3 ls s3://{bucket-name}/internal/dev_salon_beauty/index.html

# Expected: File exists with recent timestamp
```

---

## Related Files

### Lambda@Edge Router

- `app/lambda_edge/router.py` - Main routing logic
- `app/lambda_edge/deploy.sh` - Deployment script

### Domain Router API

- `app/init-bookings-app/static-site-generator/endpoints/domain_router/mappings/lambda_handler.py` - API handler
- `app/init-bookings-app/static-site-generator/template.yaml` - Lambda configuration (lines 420-442)

### Preview Generation

- `app/init-bookings-app/static-site-generator/static_web_handler/static_web_handler.py` - Preview HTML generation
- `app/init-bookings-app/static-site-generator/endpoints/generate_preview/lambda_function.py` - Preview generation endpoint

### S3 Utilities

- `app/init-bookings-app/static-site-generator/layers/s3_utils/python/s3_utils/static_web_s3_client.py` - S3 client and sanitization

---

## Additional Notes

### Why This Worked Before

Based on the user's statement "This was not an issue before we restarted the computer," possible causes:

- Lambda@Edge was deployed with a different `LAMBDA_EDGE_IDENTIFIER` value that matched the secret
- The secret value changed after restart (unlikely)
- Lambda@Edge environment variable configuration was different

### Alternative Solutions Considered

1. **Bypass API authentication for Lambda@Edge:**
   - Not recommended: Reduces security, allows unauthorized access to domain mappings

2. **Use IAM authentication instead of API key:**
   - Better security, but requires Lambda@Edge to have IAM role (complex with Lambda@Edge)
   - Would require significant refactoring

3. **Embed mappings in Lambda@Edge code:**
   - Not scalable: Requires redeployment for every domain change
   - Defeats the purpose of dynamic domain routing

### Next Steps

1. ✅ **Documentation complete** (this document)
2. ⏳ **Identify correct API key value** (requires AWS access)
3. ⏳ **Fix authentication mismatch**
4. ⏳ **Fix domain router lambda import error**
5. ⏳ **Test end-to-end preview URL access**
6. ⏳ **Deploy fixes and verify**

---

## Appendix: Error Logs

### Lambda@Edge Logs

```
Failed to fetch domain mappings: HTTP Error 401: Unauthorized
No mapping returned for host: dev--devsalonbeauty--preview.getpagoda.site
```

### Domain Router API Logs

```
Runtime.ImportModuleError: Unable to import module 'endpoints/domain_router/mappings/lambda_handler': No module named 's3_utils'
```

### CloudFront Response

```
HTTP/1.1 403 Forbidden
Cache-Control: max-age=60
Body: "Invalid host"
```

---

**Document Status:** Complete
**Last Updated:** December 2024
**Owner:** Infrastructure Team
