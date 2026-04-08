# Deployment vs Updates: Complete Workflow with Cache Invalidation

## Overview

The hybrid approach handles **two separate operations**:

1. **Deploy** (15-30 minutes): One-time DNS/CloudFront configuration
2. **Update** (seconds): Frequent content updates to S3

This document explains how both work together with proper cache invalidation.

---

## The Two Operations Explained

### Operation 1: Deploy (DNS/Infrastructure Setup)

**What It Does:**

- Configures custom domain infrastructure (one-time per domain)
- Creates Route 53 DNS records
- Adds domain to CloudFront distribution
- Requests/validates SSL certificates
- **Takes 15-30 minutes** (CloudFront distribution deployment)

**When It Runs:**

- First time setting up a custom domain
- Changing custom domain
- **NOT** when updating website content

**What Changes:**

- DNS records
- CloudFront distribution configuration
- SSL certificates
- **Does NOT change S3 content**

### Operation 2: Update (Content Changes)

**What It Does:**

- Updates HTML content in S3
- Copies from `internal/` to `external/` folder
- Invalidates CloudFront cache
- **Takes seconds** (S3 upload + cache invalidation)

**When It Runs:**

- Every time website content changes
- After preview is generated
- When salon updates services/pricing/etc.

**What Changes:**

- S3 files (`internal/{company}/index.html` and `external/{company}/index.html`)
- CloudFront cache (via invalidation)
- **Does NOT change DNS or CloudFront distribution**

---

## Complete Workflow

### Workflow 1: Initial Setup (Deploy Custom Domain)

**Step-by-Step:**

```
1. Admin provides custom_url: "mysalon.com"
   ↓
2. Deploy Lambda Handler:
   - Check if domain already configured
   - Ensure website content exists (if not, trigger rebuild)
   - Request ACM certificate for domain
   - Add domain to CloudFront distribution alternate domain names
   - Create Route 53 A/AAAA record pointing to CloudFront
   - Store configuration in database (status: "pending")
   ↓
3. CloudFront Distribution Update:
   - Distribution update initiated
   - Takes 15-30 minutes to deploy globally
   ↓
4. SSL Certificate Validation:
   - DNS validation records added to Route 53
   - ACM validates certificate (can take minutes to hours)
   ↓
5. Status Update:
   - Poll CloudFront distribution status
   - When deployed + certificate validated → status: "active"
   ↓
6. Domain is Live:
   - mysalon.com → CloudFront → Lambda@Edge → /external/My Salon/index.html
```

**Code Implementation:**

```python
def deploy_custom_domain_handler(event, context):
    """
    Deploy custom domain infrastructure (DNS, CloudFront, SSL).
    One-time setup per domain. Takes 15-30 minutes.
    """
    salon_id = extract_salon_id(event)
    custom_url = extract_custom_url(event)

    # Check if already configured
    existing = get_custom_domain_config(salon_id, custom_url)
    if existing and existing["status"] == "active":
        return {
            "message": "Custom domain already configured",
            "custom_url": f"https://{custom_url}",
            "status": "active"
        }

    company_info = get_company_info(salon_id)

    # Ensure content exists (if not, rebuild first)
    if not website_exists_external(company_info["company_name"]):
        rebuild_website_content(company_info["company_name"])

    # Configure infrastructure
    config_result = configure_custom_domain_infrastructure(
        custom_url=custom_url,
        company_name=company_info["company_name"],
        salon_id=salon_id
    )

    # Store in database
    save_domain_configuration(
        salon_id=salon_id,
        custom_domain=custom_url,
        company_name=company_info["company_name"],
        cloudfront_distribution_id=config_result["distribution_id"],
        certificate_arn=config_result["certificate_arn"],
        hosted_zone_id=config_result["hosted_zone_id"],
        status="pending"
    )

    return {
        "message": "Custom domain deployment initiated",
        "custom_url": f"https://{custom_url}",
        "status": "pending",
        "estimated_completion": "15-30 minutes"
    }

def configure_custom_domain_infrastructure(
    custom_url: str,
    company_name: str,
    salon_id: str
) -> Dict[str, Any]:
    """
    Configure DNS, CloudFront, and SSL for custom domain.
    """
    # 1. Request/validate SSL certificate
    certificate_arn = request_or_get_certificate(custom_url)

    # 2. Add domain to CloudFront distribution
    distribution_id = os.getenv("CloudFrontDistributionId")
    add_domain_to_cloudfront(distribution_id, custom_url, certificate_arn)

    # 3. Create Route 53 record
    hosted_zone_id = get_or_create_hosted_zone(custom_url)
    create_route53_record(custom_url, distribution_id, hosted_zone_id)

    return {
        "distribution_id": distribution_id,
        "certificate_arn": certificate_arn,
        "hosted_zone_id": hosted_zone_id
    }
```

### Workflow 2: Update Content (Rebuild Website)

**Step-by-Step:**

```
1. Admin updates salon data (services, pricing, etc.)
   ↓
2. Rebuild Lambda Handler:
   - Regenerate HTML from updated salon data
   - Upload to internal/{company}/index.html
   - Copy to external/{company}/index.html
   - Invalidate CloudFront cache for that path
   ↓
3. CloudFront Cache Invalidation:
   - Invalidation request sent
   - Takes 1-2 minutes to propagate
   ↓
4. Content Updated:
   - New content served from S3
   - CloudFront caches new content
   - Users see updated content
```

**Code Implementation:**

```python
def rebuild_website_handler(event, context):
    """
    Rebuild website content and update S3 files.
    Fast operation - no DNS/CloudFront distribution changes.
    """
    salon_id = extract_salon_id(event)
    company_info = get_company_info(salon_id)

    # Regenerate HTML content
    html_content = generate_html_from_salon_data(company_info)

    # Update internal preview
    upload_to_internal(html_content, company_info["company_name"])

    # Deploy to external (production)
    copy_internal_to_external(company_info["company_name"])

    # Invalidate CloudFront cache for BOTH preview and production
    invalidate_cache_for_company(company_info["company_name"], salon_id)

    return {
        "message": "Website content updated successfully",
        "company": company_info["company_name"],
        "html_size": len(html_content),
        "cache_invalidated": True
    }

def invalidate_cache_for_company(company_name: str, salon_id: str):
    """
    Invalidate CloudFront cache for both preview and production URLs.
    """
    distribution_id = os.getenv("CloudFrontDistributionId")

    # Invalidate preview URL (if preview subdomain configured)
    preview_path = f"/internal/{company_name}/index.html"

    # Invalidate production URL (if custom domain configured)
    production_path = f"/external/{company_name}/index.html"

    # Get custom domain config to check if production is active
    custom_domain = get_custom_domain_config(salon_id)

    paths_to_invalidate = [preview_path]  # Always invalidate preview

    if custom_domain and custom_domain["status"] == "active":
        paths_to_invalidate.append(production_path)  # Invalidate production if active

    # Create invalidation
    cloudfront = boto3.client('cloudfront')
    cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            'Paths': {
                'Quantity': len(paths_to_invalidate),
                'Items': paths_to_invalidate
            },
            'CallerReference': str(int(time.time()))  # Unique reference
        }
    )

    logger.info(f"Invalidated CloudFront cache for: {paths_to_invalidate}")
```

---

## Cache Invalidation Explained

### Important: Lambda@Edge Doesn't Cache!

**Lambda@Edge Function:**

- Runs on EVERY request
- Does NOT cache domain lookups (unless you implement in-memory cache)
- Rewrites path and passes to CloudFront
- **Lambda@Edge itself doesn't need cache invalidation**

**What DOES Cache:**

- **CloudFront Edge Cache**: Caches the HTML/images from S3
- **Browser Cache**: Caches content in user's browser

### Cache Invalidation Flow

**When Content Updates:**

```
1. HTML updated in S3:
   external/My Salon/index.html (new content)
   ↓
2. CloudFront Cache Invalidation:
   POST /cloudfront/invalidation
   Paths: ["/external/My Salon/index.html"]
   ↓
3. CloudFront Processes Invalidation:
   - Marks cached content as stale
   - Removes from edge cache
   - Takes 1-2 minutes to propagate globally
   ↓
4. Next User Request:
   - CloudFront cache MISS (invalidated)
   - Fetches fresh content from S3
   - Caches new content
   - Serves to user
```

**Lambda@Edge Cache (In-Memory):**

Lambda@Edge can cache domain lookups in memory:

```python
# In-memory cache for domain lookups
domain_cache = {}
CACHE_TTL = 300  # 5 minutes

def lookup_company_name(domain):
    # Check cache first
    cached = domain_cache.get(domain)
    if cached and not expired(cached):
        return cached['company_name']

    # Cache miss - lookup in database
    company_name = query_postgres(domain)

    # Update cache
    domain_cache[domain] = {
        'company_name': company_name,
        'timestamp': time.time()
    }

    return company_name
```

**Important Notes:**

- Lambda@Edge cache is per-instance (each edge location has its own)
- Cache expires after Lambda@Edge function update or instance restart
- For US-only users, cache TTL of 5 minutes is fine
- Cache invalidation not needed for Lambda@Edge (it's just routing logic)

---

## Complete Implementation

### Endpoint 1: Rebuild/Update Content

**Path**: `/static-web-generator/{salon_id}/rebuild`

**Purpose**: Update website content (fast operation)

**Implementation:**

```python
def rebuild_website_handler(event, context):
    """
    Rebuild website content and update S3 files.
    Fast operation - no DNS/CloudFront distribution changes.
    """
    salon_id = extract_salon_id(event)
    company_info = get_company_info(salon_id)

    # Regenerate HTML from current salon data
    html_content = generate_html_from_salon_data(company_info)

    # Update internal preview
    s3_client.upload_to_internal(html_content, company_info["company_name"])

    # Deploy to external (production)
    s3_client.copy_internal_to_external(company_info["company_name"])

    # Invalidate CloudFront cache
    invalidate_cloudfront_cache_for_company(
        company_info["company_name"],
        salon_id
    )

    return {
        "message": "Website content updated successfully",
        "company": company_info["company_name"],
        "html_size": len(html_content),
        "cache_invalidation_status": "initiated"
    }

def invalidate_cloudfront_cache_for_company(
    company_name: str,
    salon_id: str
):
    """
    Invalidate CloudFront cache for both preview and production URLs.
    """
    distribution_id = os.getenv("CloudFrontDistributionId")
    cloudfront = boto3.client('cloudfront')

    # Paths to invalidate
    paths = [
        f"/internal/{company_name}/index.html",  # Preview
        f"/external/{company_name}/index.html"    # Production
    ]

    # Create invalidation
    invalidation = cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            'Paths': {
                'Quantity': len(paths),
                'Items': paths
            },
            'CallerReference': f"{company_name}-{int(time.time())}"
        }
    )

    logger.info(f"Cache invalidation created: {invalidation['Invalidation']['Id']}")
    return invalidation
```

### Endpoint 2: Deploy Custom Domain

**Path**: `/static-web-generator/{salon_id}/deploy`

**Purpose**: Configure custom domain infrastructure (one-time, slow)

**Implementation:**

```python
def deploy_custom_domain_handler(event, context):
    """
    Configure custom domain infrastructure (DNS, CloudFront, SSL).
    One-time setup per domain. Takes 15-30 minutes.
    """
    salon_id = extract_salon_id(event)
    custom_url = extract_custom_url(event)

    # Check if already configured
    existing = get_custom_domain_config(salon_id, custom_url)
    if existing and existing["status"] == "active":
        return {
            "message": "Custom domain already configured",
            "custom_url": f"https://{custom_url}",
            "status": "active"
        }

    company_info = get_company_info(salon_id)

    # Ensure content exists
    if not s3_client.website_exists_external(company_info["company_name"]):
        rebuild_website_content(company_info["company_name"])

    # Configure infrastructure
    config_result = configure_custom_domain_infrastructure(
        custom_url=custom_url,
        company_name=company_info["company_name"],
        salon_id=salon_id
    )

    # Store configuration
    save_domain_configuration(
        salon_id=salon_id,
        custom_domain=custom_url,
        company_name=company_info["company_name"],
        cloudfront_distribution_id=config_result["distribution_id"],
        certificate_arn=config_result["certificate_arn"],
        hosted_zone_id=config_result["hosted_zone_id"],
        status="pending"
    )

    return {
        "message": "Custom domain deployment initiated",
        "custom_url": f"https://{custom_url}",
        "status": "pending",
        "estimated_completion": "15-30 minutes",
        "distribution_id": config_result["distribution_id"]
    }
```

### Endpoint 3: Check Deployment Status

**Path**: `/static-web-generator/{salon_id}/deploy-status`

**Purpose**: Check status of custom domain deployment

**Implementation:**

```python
def deployment_status_handler(event, context):
    """
    Check status of custom domain deployment.
    """
    salon_id = extract_salon_id(event)
    custom_domain = get_custom_domain_config(salon_id)

    if not custom_domain:
        return {"status": "not_configured"}

    # Check CloudFront distribution status
    cloudfront = boto3.client('cloudfront')
    distribution = cloudfront.get_distribution(
        Id=custom_domain["cloudfront_distribution_id"]
    )
    distribution_status = distribution['Distribution']['Status']

    # Check SSL certificate status
    acm = boto3.client('acm', region_name='us-east-1')
    certificate = acm.describe_certificate(
        CertificateArn=custom_domain["ssl_certificate_arn"]
    )
    ssl_status = certificate['Certificate']['Status']

    # Update database if status changed
    if distribution_status == "Deployed" and ssl_status == "ISSUED":
        update_domain_status(salon_id, custom_domain["custom_domain"], "active")
        custom_domain["status"] = "active"

    return {
        "custom_url": f"https://{custom_domain['custom_domain']}",
        "status": custom_domain["status"],
        "cloudfront_status": distribution_status,
        "ssl_status": ssl_status,
        "estimated_completion": calculate_remaining_time(custom_domain)
    }
```

---

## Cache Invalidation Strategy

### When to Invalidate

**Invalidate CloudFront Cache When:**

1. ✅ HTML content updated in S3
2. ✅ Website content regenerated
3. ✅ Content copied from internal to external

**Do NOT Invalidate When:**

1. ❌ DNS records updated (doesn't affect cached content)
2. ❌ CloudFront distribution updated (doesn't affect cached content)
3. ❌ SSL certificate updated (doesn't affect cached content)

### Selective Cache Invalidation

**Strategy: Invalidate Only What Changed**

```python
def update_html_content(company_name: str, html_content: str):
    """
    Update HTML content with selective cache invalidation.
    """
    # Upload updated HTML
    s3_client.upload_html(html_content, company_name)

    # Invalidate ONLY HTML (not images)
    invalidate_paths = [
        f"/internal/{company_name}/index.html",  # Preview
        f"/external/{company_name}/index.html"   # Production
    ]

    cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            'Paths': {
                'Quantity': len(invalidate_paths),
                'Items': invalidate_paths
            },
            'CallerReference': f"{company_name}-{int(time.time())}"
        }
    )

    # Images remain cached - no invalidation needed!
```

### Cache Invalidation Timing

**CloudFront Cache Invalidation:**

- Takes 1-2 minutes to propagate globally
- First 1,000 paths/month are FREE
- After that: $0.005 per path

**Best Practice:**

- Batch invalidations when possible
- Only invalidate HTML, not images
- Use versioned filenames for images (no invalidation needed)

---

## Lambda@Edge Cache Invalidation

### Important Clarification

**Lambda@Edge Function Cache:**

- Lambda@Edge functions can cache domain lookups in memory
- This cache is per-instance (each edge location)
- Cache expires when:
  - Lambda@Edge function is updated
  - Lambda instance restarts
  - Cache TTL expires (if implemented)

**Do You Need to Invalidate Lambda@Edge Cache?**

**For Preview Subdomains:**

- ❌ **NO** - No cache needed, just parse subdomain
- Extract company name directly from domain
- No database lookup = no cache needed

**For Custom Domains:**

- ⚠️ **Maybe** - If using in-memory cache for database lookups
- Cache TTL of 5 minutes is usually fine
- If domain mapping changes, wait 5 minutes or update Lambda@Edge function

**Recommendation:**

- Use short TTL (5 minutes) for Lambda@Edge cache
- Accept that domain mapping changes take up to 5 minutes to propagate
- For US-only users, this is acceptable

---

## Complete Workflow Diagram

### Initial Setup (First Time)

```
Admin Action: Deploy custom domain "mysalon.com"
    ↓
Deploy Lambda:
    1. Request SSL certificate
    2. Add domain to CloudFront distribution
    3. Create Route 53 record
    4. Store config in database (status: "pending")
    ↓
CloudFront Distribution Update (15-30 minutes)
    ↓
SSL Certificate Validation (minutes to hours)
    ↓
Status Check Lambda:
    - Poll CloudFront status
    - Poll SSL certificate status
    - When both ready → status: "active"
    ↓
Domain is Live:
    mysalon.com → CloudFront → Lambda@Edge → /external/My Salon/index.html
```

### Content Update (Frequent)

```
Admin Action: Update salon services/pricing
    ↓
Rebuild Lambda:
    1. Regenerate HTML from salon data
    2. Upload to internal/{company}/index.html
    3. Copy to external/{company}/index.html
    4. Invalidate CloudFront cache
    ↓
CloudFront Cache Invalidation (1-2 minutes)
    ↓
Content Updated:
    - New content served from S3
    - CloudFront caches new content
    - Users see updated content immediately
```

---

## Database Schema for Tracking

```sql
-- Track custom domain deployments (one-time setup)
CREATE TABLE salon_custom_domains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    custom_domain VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,

    -- Infrastructure configuration
    cloudfront_distribution_id VARCHAR(255),
    route53_hosted_zone_id VARCHAR(255),
    route53_record_name VARCHAR(255),
    ssl_certificate_arn VARCHAR(255),

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, failed
    deployment_started_at TIMESTAMP,
    deployment_completed_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Track rebuild operations (frequent updates)
CREATE TABLE salon_website_rebuilds (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    company_name VARCHAR(255) NOT NULL,
    html_size INTEGER,
    s3_location VARCHAR(255),
    cache_invalidation_id VARCHAR(255), -- CloudFront invalidation ID
    status VARCHAR(50) DEFAULT 'success', -- success, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Summary: What Gets Updated When

### Deploy Operation (15-30 minutes):

**Updates:**

- ✅ Route 53 DNS records
- ✅ CloudFront distribution configuration
- ✅ SSL certificates
- ✅ Database (domain configuration)

**Does NOT Update:**

- ❌ S3 content
- ❌ CloudFront cache (no invalidation needed)

### Rebuild Operation (seconds):

**Updates:**

- ✅ S3 content (`internal/` and `external/` folders)
- ✅ CloudFront cache (via invalidation)
- ✅ Database (rebuild tracking)

**Does NOT Update:**

- ❌ DNS records
- ❌ CloudFront distribution configuration
- ❌ SSL certificates

### Cache Invalidation:

**When Content Updates:**

- ✅ Invalidate CloudFront cache for HTML files
- ✅ Takes 1-2 minutes to propagate
- ✅ Users see new content after invalidation completes

**Lambda@Edge Cache:**

- ⚠️ In-memory cache for domain lookups (5-minute TTL)
- ⚠️ No explicit invalidation needed (short TTL is fine)
- ⚠️ Cache expires automatically

---

## Key Takeaways

1. **Deploy and Rebuild are Separate**: Deploy configures infrastructure (slow), Rebuild updates content (fast)

2. **Cache Invalidation is Automatic**: When you update S3 content, invalidate CloudFront cache - takes 1-2 minutes

3. **Lambda@Edge Doesn't Need Cache Invalidation**: It's just routing logic - cache domain lookups with short TTL (5 minutes)

4. **CloudFront Handles Caching Automatically**: You just need to invalidate when content changes

5. **Selective Invalidation Saves Money**: Only invalidate HTML, not images (use versioned filenames)

This architecture gives you:

- ✅ Fast content updates (seconds)
- ✅ Proper cache invalidation (1-2 minutes)
- ✅ Separate deploy operation (15-30 minutes, one-time)
- ✅ Simple architecture (no DynamoDB needed for US-only users)
