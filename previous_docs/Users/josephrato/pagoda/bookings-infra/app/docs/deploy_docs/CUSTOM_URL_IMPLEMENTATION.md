# Custom URL Implementation Guide

## Overview

This document explains how custom URLs (custom domains) are implemented in the static website deployment system. Custom URLs allow salons to use their own domain names (e.g., `mysalon.com`) instead of the built-in subdomains (e.g., `mysalon.getpagoda.site`).

## Current Implementation Status

### ✅ Fully Implemented: Custom Domain Registration

Custom domains are fully implemented through the **register-domain** endpoint, which handles the complete infrastructure setup for custom domains.

### ⚠️ Legacy/Unused: `custom_url` Parameter in Deploy Endpoint

The `deploy` endpoint accepts a `custom_url` parameter in the request body, but **this parameter is not actually used for domain registration**. It's only returned in the response for informational purposes. The actual custom domain registration must be done separately via the `register-domain` endpoint.

---

## Custom Domain Registration Flow

### Step 1: Ensure Content Exists

Before registering a custom domain, the website content must be deployed to the `external/` S3 folder.

**Endpoint:** `POST /static-web-generator/{salon_id}/rebuild`

**Purpose:** Generates and deploys website content to S3

**What It Does:**

- Regenerates HTML from salon data
- Uploads to `internal/{company_name}/index.html` (preview)
- Copies to `external/{company_name}/index.html` (production)
- Invalidates CloudFront cache

**Duration:** 5-10 seconds

### Step 2: Register Custom Domain

**Endpoint:** `POST /static-web-generator/{salon_id}/register-domain`

**Request Body:**

```json
{
  "custom_domain": "mysalon.com",
  "domain_type": "production"
}
```

**What It Does:**

1. **Validates domain format** - Ensures it's a valid FQDN
2. **Checks environment** - Only allows registration in production
3. **Ensures production content exists** - Verifies website is deployed to external folder
4. **Requests ACM certificate** - Creates SSL certificate for the domain (DNS validation)
5. **Adds CloudFront alias** - Adds domain as alternate domain name to CloudFront distribution
6. **Creates Route53 record** - Sets up DNS A record pointing to CloudFront
7. **Saves to database** - Stores domain configuration in `salon_custom_domains` table with status "pending"

**Response:**

```json
{
  "message": "Custom domain registration initiated",
  "custom_domain": "mysalon.com",
  "status": "pending",
  "estimated_completion": "15-30 minutes",
  "cloudfront_distribution_id": "E1234567890",
  "certificate_arn": "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  "hosted_zone_id": "Z1234567890",
  "record_name": "mysalon.com"
}
```

**Duration:** 15-30 minutes (infrastructure deployment in background)

**Location:** `endpoints/register_domain/lambda_handler.py`

### Step 3: Poll Deployment Status

**Endpoint:** `GET /static-web-generator/{salon_id}/deploy-status?domain=mysalon.com`

**Purpose:** Check the status of custom domain registration

**What It Returns:**

```json
{
  "custom_domain": "mysalon.com",
  "status": "pending", // or "active" when complete
  "cloudfront_status": "InProgress", // or "Deployed"
  "ssl_status": "PENDING_VALIDATION", // or "ISSUED"
  "dns_status": "active",
  "estimated_completion": "10-20 minutes",
  "deployment_started_at": "2024-01-01T00:00:00Z",
  "last_checked_at": "2024-01-01T00:05:00Z",
  "validation_records": [
    {
      "name": "_abc123.mysalon.com",
      "type": "CNAME",
      "value": "_xyz789.acm-validations.aws."
    }
  ]
}
```

**Status Values:**

- `pending` - Deployment in progress (continue polling)
- `active` - Domain is live and ready
- `failed` - Deployment encountered errors

**Location:** `endpoints/deploy_status/lambda_handler.py`

### Step 4: Domain is Live

Once status is `active`, the custom domain is live:

- ✅ DNS record points to CloudFront
- ✅ SSL certificate is issued
- ✅ CloudFront distribution is deployed
- ✅ Website accessible at `https://mysalon.com`

---

## Architecture Components

### 1. Domain Registration Handler

**File:** `endpoints/register_domain/lambda_handler.py`

**Key Functions:**

- `__process_registration()` - Main registration logic
- `__request_certificate()` - Requests ACM certificate
- `__add_alias_to_cloudfront()` - Adds domain to CloudFront
- `__create_route53_record()` - Creates DNS record
- `__get_or_create_hosted_zone()` - Gets or creates Route53 hosted zone

**Dependencies:**

- AWS ACM (SSL certificates)
- AWS CloudFront (CDN)
- AWS Route53 (DNS)
- `DeployRepository` (database operations)

### 2. Deploy Repository

**File:** `repositories/deploy_repository.py`

**Key Methods:**

- `save_custom_domain_config()` - Saves domain configuration
- `get_custom_domain_config()` - Retrieves domain configuration
- `update_domain_status()` - Updates domain status
- `list_custom_domains()` - Lists all custom domains for a salon
- `get_active_custom_domain()` - Gets active custom domain
- `list_active_custom_domains()` - Lists all active custom domains

### 3. Domain Router System

**File:** `endpoints/domain_router/mappings/lambda_handler.py`

**Purpose:** Provides domain-to-S3-path mappings for Lambda@Edge

**What It Does:**

- Lists active subdomains from `salon_subdomains` table
- Lists active custom domains from `salon_custom_domains` table
- Merges records into unified mapping
- Returns `host → target` mappings for routing

**Mapping Format:**

```json
{
  "host": "mysalon.com",
  "target": "external/My Salon/index.html",
  "environment": "live"
}
```

**Usage:** Lambda@Edge queries this endpoint to route requests to the correct S3 location.

### 4. Status Checking Handler

**File:** `endpoints/deploy_status/lambda_handler.py`

**Purpose:** Checks the status of custom domain registration

**What It Checks:**

- CloudFront distribution status
- ACM certificate status
- Route53 record status
- Updates database status to "active" when all complete

---

## Database Schema

### `salon_custom_domains` Table

Stores custom domain configuration and infrastructure details:

```sql
CREATE TABLE salon_custom_domains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    custom_domain VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    domain_type VARCHAR(50) DEFAULT 'production',

    -- Infrastructure configuration
    cloudfront_distribution_id VARCHAR(255),
    ssl_certificate_arn VARCHAR(255),
    hosted_zone_id VARCHAR(255),
    record_name VARCHAR(255),

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, failed
    deployment_started_at TIMESTAMP,
    deployment_completed_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**

- `custom_domain` - The domain name (e.g., "mysalon.com")
- `status` - Registration status (pending/active/failed)
- `cloudfront_distribution_id` - CloudFront distribution ID
- `ssl_certificate_arn` - ACM certificate ARN
- `hosted_zone_id` - Route53 hosted zone ID

---

## API Endpoints

### 1. Register Custom Domain

**Endpoint:** `POST /static-web-generator/{salon_id}/register-domain`

**Request:**

```json
{
  "custom_domain": "mysalon.com",
  "domain_type": "production"
}
```

**Response:**

```json
{
  "message": "Custom domain registration initiated",
  "custom_domain": "mysalon.com",
  "status": "pending",
  "estimated_completion": "15-30 minutes",
  "cloudfront_distribution_id": "E1234567890",
  "certificate_arn": "arn:aws:acm:...",
  "hosted_zone_id": "Z1234567890",
  "record_name": "mysalon.com"
}
```

### 2. Check Deployment Status

**Endpoint:** `GET /static-web-generator/{salon_id}/deploy-status?domain=mysalon.com`

**Response:**

```json
{
  "custom_domain": "mysalon.com",
  "status": "active",
  "cloudfront_status": "Deployed",
  "ssl_status": "ISSUED",
  "dns_status": "active",
  "deployment_started_at": "2024-01-01T00:00:00Z",
  "deployment_completed_at": "2024-01-01T00:20:00Z"
}
```

### 3. List Custom Domains

**Endpoint:** `GET /static-web-generator/{salon_id}/list-domains`

**Response:**

```json
{
  "domains": [
    {
      "custom_domain": "mysalon.com",
      "status": "active",
      "domain_type": "production",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:20:00Z"
    }
  ],
  "total": 1
}
```

### 4. Domain Router Mappings

**Endpoint:** `GET /domain-router/mappings`

**Headers:** `x-api-key: <lambda-edge-identifier>`

**Response:**

```json
{
  "mappings": [
    {
      "host": "mysalon.com",
      "target": "external/My Salon/index.html",
      "environment": "live"
    }
  ]
}
```

**Usage:** Called by Lambda@Edge to route requests to the correct S3 location.

---

## Implementation Details

### AWS Services Used

1. **ACM (AWS Certificate Manager)**
   - Requests SSL certificates for custom domains
   - DNS validation method
   - Certificate issued in `us-east-1` region (required for CloudFront)

2. **CloudFront**
   - CDN that serves website content
   - Alternate domain names (aliases) added for custom domains
   - SSL certificate attached to distribution

3. **Route53**
   - DNS service for custom domains
   - Creates A record (alias) pointing to CloudFront
   - Hosted zone created if it doesn't exist

4. **S3**
   - Stores website content in `external/{company_name}/index.html`
   - CloudFront serves content from S3

### Domain Validation

**Format Validation:**

- Must be a valid FQDN (Fully Qualified Domain Name)
- Regex: `^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$`
- Example: `mysalon.com`, `www.mysalon.com`, `salon.example.co.uk`

**Environment Restrictions:**

- Custom domain registration only available in **production** environment
- Disabled in dev/test/staging environments

### SSL Certificate Validation

**Method:** DNS validation

**Process:**

1. ACM requests certificate
2. ACM provides validation records (CNAME records)
3. Route53 automatically creates validation records (if using Route53)
4. ACM validates DNS records
5. Certificate is issued (typically 15-30 minutes)

**Validation Records Format:**

```json
{
  "name": "_abc123.mysalon.com",
  "type": "CNAME",
  "value": "_xyz789.acm-validations.aws."
}
```

### CloudFront Distribution Update

**Process:**

1. Get current CloudFront distribution configuration
2. Add custom domain to alternate domain names (aliases)
3. Update viewer certificate to use ACM certificate
4. Update distribution (takes 15-30 minutes to deploy globally)

**Configuration:**

- SSL support method: `sni-only`
- Minimum protocol version: `TLSv1.2_2021`

### Route53 DNS Record

**Record Type:** A (alias)

**Configuration:**

- Points to CloudFront distribution
- Uses CloudFront hosted zone ID: `Z2FDTNDATAQYW2`
- Evaluate target health: `false`

---

## Workflow Example

### Complete Custom Domain Setup

```python
# Step 1: Ensure content exists
POST /static-web-generator/{salon_id}/rebuild
# Returns: { "message": "Website content updated successfully" }
# Duration: ~5-10 seconds

# Step 2: Register custom domain
POST /static-web-generator/{salon_id}/register-domain
Body: { "custom_domain": "mysalon.com", "domain_type": "production" }
# Returns: { "status": "pending", "estimated_completion": "15-30 minutes" }
# Duration: ~30-60 seconds (API calls complete, deployment continues in background)

# Step 3: Poll status (every 1-2 minutes)
GET /static-web-generator/{salon_id}/deploy-status?domain=mysalon.com
# Returns: { "status": "pending", "cloudfront_status": "InProgress", ... }
# ... wait 1-2 minutes ...

GET /static-web-generator/{salon_id}/deploy-status?domain=mysalon.com
# Returns: { "status": "pending", "ssl_status": "ISSUED", ... }
# ... wait 1-2 minutes ...

GET /static-web-generator/{salon_id}/deploy-status?domain=mysalon.com
# Returns: { "status": "active", "cloudfront_status": "Deployed", ... }
# ✅ Domain is now LIVE: https://mysalon.com
```

### Timeline

```
T=0:00 - POST /rebuild
  → Content deployed to S3
  → Duration: ~5-10 seconds

T=0:10 - POST /register-domain
  → Infrastructure setup initiated
  → Returns: { "status": "pending" }
  → Duration: ~30-60 seconds (API calls)

T=0:15 - GET /deploy-status (first poll)
  → Returns: { "status": "pending", "cloudfront_status": "InProgress" }

T=0:20 - GET /deploy-status (poll)
  → Returns: { "status": "pending", "ssl_status": "ISSUED" }

T=0:30 - GET /deploy-status (poll)
  → Returns: { "status": "active", "cloudfront_status": "Deployed" }
  → ✅ Domain is LIVE
```

---

## Legacy: Deploy Endpoint `custom_url` Parameter

### Current Status: ⚠️ Legacy/Unused

**Location:** `endpoints/deploy/lambda_handler.py`

**What It Does:**

- Extracts `custom_url` from request body
- Returns it in the response (formatted as `https://{custom_url}`)
- **Does NOT register the domain**
- **Does NOT configure infrastructure**

**Current Implementation:**

```python
def __extract_custom_url_from_request(request: ProxyRequest) -> str:
    """Extract custom URL from request body."""
    request_body = request.body
    custom_url = request_body.get("custom_url")
    if not custom_url:
        raise BadRequestError("custom_url is required in request body")
    return custom_url

# In lambda_handler:
custom_url = __extract_custom_url_from_request(request)
# ... deployment logic ...
custom_domain_url = f"https://{custom_url}"  # Just formats it
return {
    "custom_url": custom_domain_url,  # Returns in response
    # ...
}
```

**Why It Exists:**

- Historical artifact from earlier implementation
- May have been intended for domain registration but was never fully implemented
- Actual domain registration moved to separate `register-domain` endpoint

**Recommendation:**

- Consider making `custom_url` parameter **optional** in deploy endpoint
- Or remove it entirely if not needed
- Use `register-domain` endpoint for actual custom domain registration

---

## Key Differences: Custom Domains vs Subdomains

| Feature             | Custom Domains              | Built-in Subdomains                   |
| ------------------- | --------------------------- | ------------------------------------- |
| **Format**          | `mysalon.com`               | `mysalon.getpagoda.site`              |
| **Registration**    | Full infrastructure setup   | Simple database claim                 |
| **SSL Certificate** | ACM certificate required    | Wildcard certificate (already exists) |
| **DNS**             | Route53 record required     | Wildcard DNS (already exists)         |
| **CloudFront**      | Alias added to distribution | Uses built-in domain                  |
| **Setup Time**      | 15-30 minutes               | Instant (1-2 seconds)                 |
| **Status Polling**  | ✅ Required                 | ❌ Not needed                         |
| **Environment**     | Production only             | All environments                      |
| **Endpoint**        | `/register-domain`          | `/subdomains/claim`                   |

---

## Error Handling

### Common Errors

| Error                       | Cause                         | Solution                         |
| --------------------------- | ----------------------------- | -------------------------------- |
| `400 Bad Request`           | Invalid domain format         | Check domain format (valid FQDN) |
| `403 Forbidden`             | Not in production environment | Use production environment       |
| `400 Bad Request`           | Production content missing    | Run rebuild endpoint first       |
| `409 Conflict`              | Domain already registered     | Domain is already configured     |
| `500 Internal Server Error` | AWS API failure               | Check CloudWatch logs, retry     |

### Validation Failures

**Domain Format:**

- Must be valid FQDN
- Must match regex pattern
- Must not be reserved name

**Content Check:**

- Must have content in `external/{company_name}/index.html`
- If missing, returns error: "Production content missing. Run rebuild first."

---

## Best Practices

1. **Always Rebuild Before Registering Domain**

   ```python
   # Step 1: Ensure content exists
   POST /static-web-generator/{salon_id}/rebuild

   # Step 2: Register domain
   POST /static-web-generator/{salon_id}/register-domain
   ```

2. **Poll Status Regularly**

   ```python
   # Poll every 1-2 minutes
   while True:
       response = GET /static-web-generator/{salon_id}/deploy-status?domain=mysalon.com
       if response["status"] == "active":
           break  # Domain is ready!
       elif response["status"] == "failed":
           # Handle error
           break
       time.sleep(60)  # Wait 1 minute
   ```

3. **Handle Validation Records**
   - If using Route53, validation records are created automatically
   - If using external DNS, may need to add validation records manually

4. **Monitor Deployment Progress**
   - Check `cloudfront_status` and `ssl_status` separately
   - Domain is active when both are complete

---

## Related Documentation

- **Deploy Lifecycle:** `DEPLOY_LIFECYCLE.md` - Complete deployment lifecycle documentation
- **Deploy Implementation:** `DEPLOY_IMPLEMENTATION.md` - Technical implementation details
- **Custom Domain System Summary:** See "Custom Domain System Summary" section in this document

---

## Summary

Custom URLs (custom domains) are fully implemented through the `register-domain` endpoint, which:

- ✅ Sets up complete infrastructure (ACM, CloudFront, Route53)
- ✅ Handles SSL certificate validation
- ✅ Creates DNS records
- ✅ Tracks deployment status
- ✅ Provides status polling endpoint

The `custom_url` parameter in the deploy endpoint is **legacy/unused** and does not actually register domains. Use the `register-domain` endpoint for actual custom domain registration.
