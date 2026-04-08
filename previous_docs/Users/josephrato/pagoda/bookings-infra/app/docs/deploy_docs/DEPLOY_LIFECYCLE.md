# Deploy Lifecycle Documentation

## Overview

This document describes the complete deployment lifecycle for static websites. There are **three distinct workflows**:

1. **Updates** - Fast content updates (works for both custom domains and subdomains)
2. **Custom URL Deploy Lifecycle** - Full setup for custom domains like `mysalon.com` (requires DNS/SSL infrastructure)
3. **Subdomain URL Deploy Lifecycle** - Quick setup for built-in subdomains like `crownofbeauty.getpagoda.site` (uses existing wildcard infrastructure)

The key difference:

- **Custom domains** require infrastructure setup (15-30 minutes) and status polling
- **Built-in subdomains** are instant (no infrastructure setup needed)

---

## Updates

### Overview

The **Rebuild** operation updates website content for both custom domains and built-in subdomains. This is a fast operation that regenerates HTML and updates S3.

### Endpoint

**`POST /static-web-generator/{salon_id}/rebuild`**

### What It Does

- Regenerates HTML from salon data (loads preview data from database)
- Uploads to `internal/{company}/index.html` (preview)
- Copies to `external/{company}/index.html` (production)
- Invalidates CloudFront cache for both preview and production paths
- Records rebuild metadata in `salon_website_rebuilds` table

### Duration

**5-10 seconds** (S3 upload + cache invalidation)

### When to Use

- Salon updates services/pricing
- Content changes
- After preview generation
- **Any time you want to update website content**
- Works for both custom domains and built-in subdomains

### What It Does NOT Do

- ❌ Change DNS records
- ❌ Update CloudFront distribution configuration
- ❌ Modify SSL certificates
- ❌ Require status polling (completes immediately)

### Request/Response

**Request**: No body required (uses salon_id from path)

**Response**:

```json
{
  "message": "Website content updated successfully",
  "company": "My Salon",
  "cache_invalidation_id": "I1234567890"
}
```

### Complete Flow

```
POST /static-web-generator/{salon_id}/rebuild
  ↓
Lambda Handler:
  1. Loads preview data from database (get_preview_data)
  2. Converts to PreviewInputModel
  3. Calls StaticWebGenerator.generate_company_website()
  4. Uploads to internal/{company}/index.html
  5. Copies to external/{company}/index.html
  6. Invalidates CloudFront cache
  7. Records rebuild event
  ↓
Returns: { "message": "Website content updated successfully" }
  ↓
Duration: ~5-10 seconds
  ↓
CloudFront cache invalidation: 1-2 minutes to propagate globally
  ↓
Users see updated content (after cache invalidation completes)
```

### Notes

- **No status polling needed** - operation completes in seconds
- Works identically for both custom domains and built-in subdomains
- Must have preview data saved in database (from previous `generate_preview` call)
- CloudFront cache invalidation happens automatically (1-2 minute propagation)

---

## Custom URL Deploy Lifecycle

### Overview

This lifecycle is for setting up **custom domains** like `mysalon.com`. It requires infrastructure setup (DNS, CloudFront, SSL certificates) which takes 15-30 minutes and requires status polling.

### When to Use

- Setting up a custom domain (e.g., `mysalon.com`)
- Changing to a new custom domain
- **One-time per domain**

### Complete Lifecycle Flow

#### Step 1: Ensure Content Exists (Rebuild)

```
POST /static-web-generator/{salon_id}/rebuild
  → Regenerates HTML from salon data
  → Uploads to S3 (internal/ + external/)
  → Invalidates CloudFront cache
  → Returns: { "message": "Website content updated", "cache_invalidation_id": "..." }
  ↓
Duration: ~5-10 seconds
```

**Why First**: The register-domain endpoint checks that content exists before setting up infrastructure.

#### Step 2: Register Custom Domain (Infrastructure Setup)

```
POST /static-web-generator/{salon_id}/register-domain
  Body: { "custom_domain": "mysalon.com" }
  ↓
Lambda Handler:
  1. Validates domain format
  2. Checks if content exists (if not, returns error)
  3. Requests ACM certificate (DNS validation)
  4. Adds domain to CloudFront distribution alternate domain names
  5. Creates Route53 A/AAAA alias record pointing to CloudFront
  6. Stores configuration in database (status: "pending")
  ↓
Returns: {
    "message": "Custom domain registration initiated",
    "custom_domain": "mysalon.com",
    "status": "pending",
    "estimated_completion": "15-30 minutes",
    "cloudfront_distribution_id": "E1234",
    "certificate_arn": "arn:aws:acm:...",
    "deployment_started_at": "2025-11-07T18:04:00Z"
  }
  ↓
Duration: ~30-60 seconds (API calls complete, but deployment continues in background)
```

**What Happens in Background**:

- CloudFront distribution update propagates globally (15-30 minutes)
- ACM certificate validation (minutes to hours, typically completes within 15-30 minutes)

#### Step 3: Poll Deployment Status (Wait for Completion)

```
GET /static-web-generator/{salon_id}/deploy-status
  ↓
Lambda Handler:
  1. Fetches domain config from database
  2. Checks CloudFront distribution status
  3. Checks ACM certificate status
  4. Verifies Route53 record exists
  5. Updates DB status to "active" if all complete
  ↓
Returns (Initial - Still Pending):
  {
    "custom_domain": "mysalon.com",
    "status": "pending",
    "cloudfront_status": "InProgress",
    "ssl_status": "PENDING_VALIDATION",
    "dns_status": "active",
    "estimated_completion": "10-20 minutes",
    "deployment_started_at": "2025-11-07T18:04:00Z",
    "last_checked_at": "2025-11-07T18:09:30Z",
    "validation_records": [
      {
        "name": "_abc123.mysalon.com",
        "type": "CNAME",
        "value": "_xyz789.acm-validations.aws."
      }
    ]
  }
  ↓
Client polls every 1-2 minutes...
  ↓

Returns (After 15-20 minutes - Complete):
  {
    "custom_domain": "mysalon.com",
    "status": "active",
    "cloudfront_status": "Deployed",
    "ssl_status": "ISSUED",
    "dns_status": "active",
    "estimated_completion": "Complete",
    "deployment_started_at": "2025-11-07T18:04:00Z",
    "deployment_completed_at": "2025-11-07T18:19:45Z",
    "last_checked_at": "2025-11-07T18:19:45Z"
  }
  ↓
Domain is now LIVE: https://mysalon.com
```

### Timeline Example

```
T=0:00 - POST /register-domain
  → Returns: { "status": "pending", "estimated_completion": "15-30 minutes" }
  → CloudFront distribution update starts
  → ACM certificate requested

T=0:01 - GET /deploy-status
  → Returns: {
      "status": "pending",
      "cloudfront_status": "InProgress",
      "ssl_status": "PENDING_VALIDATION",
      "estimated_completion": "15-29 minutes"
    }

T=0:05 - GET /deploy-status (polling)
  → Returns: {
      "status": "pending",
      "cloudfront_status": "InProgress",
      "ssl_status": "PENDING_VALIDATION",
      "estimated_completion": "10-25 minutes"
    }

T=0:10 - GET /deploy-status (polling)
  → Returns: {
      "status": "pending",
      "cloudfront_status": "InProgress",
      "ssl_status": "ISSUED",  ← Certificate validated!
      "estimated_completion": "5-20 minutes"
    }

T=0:20 - GET /deploy-status (polling)
  → Returns: {
      "status": "active",  ← All complete!
      "cloudfront_status": "Deployed",
      "ssl_status": "ISSUED",
      "deployment_completed_at": "2025-11-07T18:24:00Z"
    }
  → Domain is now LIVE
```

### Status Values and Meanings

#### Overall Status (`status`)

| Value     | Meaning                       | Next Action                |
| --------- | ----------------------------- | -------------------------- |
| `pending` | Deployment in progress        | Continue polling           |
| `active`  | Domain is live and ready      | No action needed           |
| `failed`  | Deployment encountered errors | Check error details, retry |

#### CloudFront Status (`cloudfront_status`)

| Value        | Meaning                                | Duration      |
| ------------ | -------------------------------------- | ------------- |
| `InProgress` | Distribution update deploying globally | 15-30 minutes |
| `Deployed`   | Distribution update complete           | -             |

#### SSL Status (`ssl_status`)

| Value                | Meaning                                | Action Required                      |
| -------------------- | -------------------------------------- | ------------------------------------ |
| `PENDING_VALIDATION` | Certificate waiting for DNS validation | Wait for ACM to validate DNS records |
| `ISSUED`             | Certificate validated and active       | -                                    |
| `FAILED`             | Certificate validation failed          | Check DNS records, retry             |

#### DNS Status (`dns_status`)

| Value       | Meaning                                    |
| ----------- | ------------------------------------------ |
| `active`    | Route53 record exists and is configured    |
| `not_found` | Route53 record missing (should not happen) |

### What Happens During Status Polling

When you call `GET /deploy-status`, the Lambda handler:

1. **Fetches Domain Configuration** from database
2. **Checks CloudFront Distribution Status** via AWS API
3. **Checks ACM Certificate Status** via AWS API
4. **Verifies Route53 DNS Record** exists
5. **Determines Overall Status** (active when CloudFront deployed + SSL issued)
6. **Calculates Estimated Completion** based on elapsed time
7. **Updates Database** if status changed to "active"

### Error Handling

| Error                       | Cause                     | Solution                                                      |
| --------------------------- | ------------------------- | ------------------------------------------------------------- |
| `400 Bad Request`           | Invalid domain format     | Check domain format (lowercase, valid TLD)                    |
| `404 Not Found`             | Salon or content missing  | Ensure salon exists and content is built (call rebuild first) |
| `409 Conflict`              | Domain already registered | Domain is already configured                                  |
| `500 Internal Server Error` | AWS API failure           | Check CloudWatch logs, retry                                  |

### Best Practices

1. **Always Rebuild Before Registering Domain**

   ```python
   # Step 1: Ensure content exists
   POST /static-web-generator/{salon_id}/rebuild
   # Wait for success response

   # Step 2: Register domain
   POST /static-web-generator/{salon_id}/register-domain
   # Returns: { "status": "pending" }
   ```

2. **Poll Status Regularly**

   ```python
   # Poll every 1-2 minutes
   while True:
       response = GET /static-web-generator/{salon_id}/deploy-status
       if response["status"] == "active":
           break  # Domain is ready!
       elif response["status"] == "failed":
           # Handle error
           break
       time.sleep(60)  # Wait 1 minute before next poll
   ```

3. **Handle Validation Records**

   If `ssl_status` is `PENDING_VALIDATION`, the response includes `validation_records`:

   ```json
   {
     "validation_records": [
       {
         "name": "_abc123.mysalon.com",
         "type": "CNAME",
         "value": "_xyz789.acm-validations.aws."
       }
     ]
   }
   ```

   **Note**: If using Route53, these records are typically created automatically. If using external DNS, you may need to add them manually.

### Duration Summary

| Step            | Duration      | Status Polling Required?        |
| --------------- | ------------- | ------------------------------- |
| Rebuild         | 5-10 seconds  | ❌ No                           |
| Register Domain | 15-30 minutes | ✅ Yes (poll every 1-2 minutes) |
| Deploy Status   | Instant       | N/A (this IS the status check)  |

---

## Subdomain URL Deploy Lifecycle

### Overview

This lifecycle is for setting up **built-in subdomains** like `crownofbeauty.getpagoda.site` or `crownofbeauty--preview.getpagoda.site` (with environment prefixes like `dev--crownofbeauty--preview.getpagoda.site` for dev/test). These use existing wildcard DNS and SSL infrastructure, so setup is **instant** with no status polling required.

### When to Use

- Setting up a built-in subdomain (e.g., `crownofbeauty.getpagoda.site`)
- Changing to a new subdomain
- **Instant setup** - no infrastructure configuration needed

### Why It's Instant

Built-in subdomains don't require infrastructure setup because:

- ✅ **Wildcard DNS** (`*.getpagoda.site`) already points to CloudFront
- ✅ **Wildcard SSL certificate** already covers all subdomains
- ✅ **Lambda@Edge router** handles routing automatically
- ✅ **No Route53 records** needed per salon
- ✅ **No ACM certificate requests** needed

### Complete Lifecycle Flow

#### Step 1: Ensure Content Exists (Rebuild)

```
POST /static-web-generator/{salon_id}/rebuild
  → Regenerates HTML from salon data
  → Uploads to S3 (internal/ + external/)
  → Invalidates CloudFront cache
  → Returns: { "message": "Website content updated", "cache_invalidation_id": "..." }
  ↓
Duration: ~5-10 seconds
```

**Why First**: The claim subdomain endpoint may check that content exists (optional, depending on implementation).

#### Step 2: Check Subdomain Availability (Optional)

```
GET /static-web-generator/subdomains/check?name=crownofbeauty&environment=live
  ↓
Lambda Handler:
  1. Validates subdomain format
  2. Checks reserved names (admin, support, www, etc.)
  3. Queries salon_subdomains table for availability
  4. Returns availability status
  ↓
Returns: {
    "available": true,
    "reason": null,
    "normalized": "crownofbeauty",
    "environment": "live"
  }
  ↓
Duration: Instant
```

**Note**: This step is optional but recommended to check availability before claiming.

#### Step 3: Claim Built-in Subdomain (Instant Setup)

```
POST /static-web-generator/{salon_id}/subdomains/claim
  Body: { "subdomain": "crownofbeauty", "environment": "live" }
  ↓
Lambda Handler:
  1. Validates subdomain format
  2. Checks availability (transactional to avoid race conditions)
  3. Inserts/updates record in salon_subdomains table
  4. Sets status: "active" immediately
  ↓
Returns: {
    "subdomain": "crownofbeauty",
    "host": "crownofbeauty.getpagoda.site",
    "environment": "live",
    "status": "active",
    "target": "external/Crown Of Beauty/index.html"
  }
  ↓
Duration: Instant (~1-2 seconds)
  ↓
Domain is LIVE immediately: https://crownofbeauty.getpagoda.site
```

**No Step 3 (Status Polling) Needed**: The subdomain is active immediately because:

- DNS is already configured (wildcard)
- SSL is already configured (wildcard certificate)
- Lambda@Edge router picks up the new mapping from Domain Lookup API
- Domain Lookup API cache refreshes within 30 seconds

### Timeline Example

```
T=0:00 - POST /rebuild
  → Content uploaded to S3
  → Returns: { "message": "Website content updated" }
  ↓
T=0:05 - GET /subdomains/check?name=crownofbeauty
  → Returns: { "available": true }
  ↓
T=0:06 - POST /subdomains/claim
  → Subdomain claimed in database
  → Returns: { "status": "active", "host": "crownofbeauty.getpagoda.site" }
  ↓
T=0:07 - Domain is LIVE
  → https://crownofbeauty.getpagoda.site works immediately
  → Lambda@Edge router picks up mapping (within 30 seconds via Domain Lookup API cache refresh)
```

### Environment Types

Built-in subdomains support two environments:

1. **Live** (`environment: "live"`)
   - Host: `crownofbeauty.getpagoda.site`
   - Target: `external/{company}/index.html`
   - Public-facing production website

2. **Draft** (`environment: "draft"`)
   - Host: `crownofbeauty--preview.getpagoda.site` (or `dev--crownofbeauty--preview.getpagoda.site` for dev/test)
   - Target: `internal/{company}/index.html`
   - Preview/staging website

### Subdomain Format Rules

- **Format**: Lowercase alphanumeric + hyphens
- **Length**: 3-63 characters
- **Reserved Names**: `admin`, `support`, `www`, `pagoda`, `api`, etc.
- **Validation**: Must match regex: `^[a-z0-9](?:-?[a-z0-9]){1,61}[a-z0-9]$`

### Error Handling

| Error                       | Cause                    | Solution                                                     |
| --------------------------- | ------------------------ | ------------------------------------------------------------ |
| `400 Bad Request`           | Invalid subdomain format | Check format (lowercase, alphanumeric + hyphens, 3-63 chars) |
| `409 Conflict`              | Subdomain already taken  | Choose a different subdomain                                 |
| `400 Bad Request`           | Reserved name            | Choose a different subdomain (not in reserved list)          |
| `500 Internal Server Error` | Database error           | Check CloudWatch logs, retry                                 |

### Best Practices

1. **Check Availability First**

   ```python
   # Step 1: Check availability
   GET /static-web-generator/subdomains/check?name=crownofbeauty
   # Returns: { "available": true }

   # Step 2: Claim if available
   POST /static-web-generator/{salon_id}/subdomains/claim
   # Returns: { "status": "active" }
   ```

2. **Rebuild Before Claiming** (Optional but recommended)

   ```python
   # Ensure content exists
   POST /static-web-generator/{salon_id}/rebuild
   # Then claim subdomain
   POST /static-web-generator/{salon_id}/subdomains/claim
   ```

3. **No Status Polling Needed**
   - Subdomain is active immediately
   - Lambda@Edge router picks up changes within 30 seconds (Domain Lookup API cache TTL)
   - No infrastructure deployment to wait for

### Duration Summary

| Step               | Duration     | Status Polling Required?                       |
| ------------------ | ------------ | ---------------------------------------------- |
| Rebuild            | 5-10 seconds | ❌ No                                          |
| Check Availability | Instant      | ❌ No                                          |
| Claim Subdomain    | 1-2 seconds  | ❌ No                                          |
| Domain Live        | Immediate    | ❌ No (Lambda@Edge picks up within 30 seconds) |

### Comparison: Custom Domain vs Built-in Subdomain

| Aspect              | Custom Domain              | Built-in Subdomain             |
| ------------------- | -------------------------- | ------------------------------ |
| **Example**         | `mysalon.com`              | `crownofbeauty.getpagoda.site` |
| **Setup Time**      | 15-30 minutes              | Instant (1-2 seconds)          |
| **Status Polling**  | ✅ Required                | ❌ Not needed                  |
| **DNS Setup**       | Per-domain Route53 record  | Wildcard (already done)        |
| **SSL Certificate** | Per-domain ACM certificate | Wildcard (already done)        |
| **Infrastructure**  | Requires setup             | Uses existing                  |
| **Endpoint**        | `/register-domain`         | `/subdomains/claim`            |

---

## Database Schema

### `salon_custom_domains` Table

Tracks custom domain infrastructure setup:

```sql
CREATE TABLE salon_custom_domains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    custom_domain VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,

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

### `salon_subdomains` Table

Tracks built-in subdomain assignments:

```sql
CREATE TABLE salon_subdomains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    environment VARCHAR(16) NOT NULL CHECK (environment IN ('draft', 'live')),
    subdomain VARCHAR(63) NOT NULL,
    company_name VARCHAR(255) NOT NULL,

    -- Constraints
    UNIQUE (subdomain, environment),
    UNIQUE (salon_id, environment),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### `salon_website_rebuilds` Table

Tracks content updates (rebuild operations):

```sql
CREATE TABLE salon_website_rebuilds (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    company_name VARCHAR(255) NOT NULL,
    html_size INTEGER,
    preview_path VARCHAR(255),
    production_path VARCHAR(255),
    cache_invalidation_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'success',  -- success, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Summary

### Key Points

1. **Updates (Rebuild)** = Fast content updates (seconds) - Works for both custom domains and subdomains
2. **Custom URL Deploy** = Slow infrastructure setup (15-30 minutes) - Requires status polling
3. **Subdomain URL Deploy** = Instant setup (1-2 seconds) - No status polling needed

### Workflow Comparison

**Custom Domain Workflow**:

```
1. Rebuild (ensure content exists)
2. Register Domain (set up infrastructure) - 15-30 minutes
3. Poll Deploy Status (wait for completion)
```

**Built-in Subdomain Workflow**:

```
1. Rebuild (ensure content exists)
2. Claim Subdomain (instant) - 1-2 seconds
Done! Domain is live immediately
```

### Duration Summary

| Operation      | Custom Domain | Built-in Subdomain |
| -------------- | ------------- | ------------------ |
| Rebuild        | 5-10 seconds  | 5-10 seconds       |
| Domain Setup   | 15-30 minutes | 1-2 seconds        |
| Status Polling | ✅ Required   | ❌ Not needed      |
| Total Time     | 15-30 minutes | ~10 seconds        |

This architecture provides:

- ✅ Fast content updates (rebuild)
- ✅ Flexible domain options (custom or built-in)
- ✅ Proper infrastructure setup for custom domains
- ✅ Instant setup for built-in subdomains
- ✅ Clear separation of concerns (content vs infrastructure)
