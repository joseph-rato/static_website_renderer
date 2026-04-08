# Custom URL Deployment with CloudFront & Route 53 - Brainstorming Document

## Goal

Enable each salon's website to be accessible via their custom URL using CloudFront distributions and Route 53 DNS configuration. Each salon's folder (`external/{company_name}/index.html`) should be accessible through their provided custom domain.

## Current Architecture

- **S3 Structure**: `external/{company_name}/index.html` in a single S3 bucket
- **Current Access**: S3 website endpoint URLs (http://bucket.s3-website-region.amazonaws.com/external/{company}/index.html)
- **Custom URLs**: Provided but not configured (TODO in `get_custom_domain_url()`)

## Architecture Options

### Option 1: Single CloudFront Distribution with Custom Origins (Recommended)

**Approach**: One CloudFront distribution with origin path-based routing using Lambda@Edge or CloudFront Functions.

**Pros**:

- Single distribution to manage
- Lower cost (one distribution vs hundreds)
- Easier SSL certificate management
- Centralized cache invalidation
- Simpler IAM permissions

**Cons**:

- Requires custom logic to route requests to correct S3 path
- More complex origin configuration
- Potential cache collision issues if not handled properly

**Implementation**:

- CloudFront Distribution with S3 bucket as origin
- Lambda@Edge or CloudFront Function to:
  - Extract custom domain from request
  - Map custom domain → company_name
  - Rewrite request path to `external/{company_name}/index.html`
- CloudFront Origin Request trigger to modify S3 path

**Database Schema Addition**:

```sql
CREATE TABLE salon_custom_domains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    custom_domain VARCHAR(255) NOT NULL UNIQUE,
    cloudfront_distribution_id VARCHAR(255),
    route53_hosted_zone_id VARCHAR(255),
    route53_record_name VARCHAR(255),
    ssl_certificate_arn VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, failed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Flow**:

1. User provides `custom_url` (e.g., `mysalon.com`)
2. Lambda creates/updates Route 53 record pointing to CloudFront distribution
3. CloudFront Lambda@Edge function maps domain to company_name
4. Request routed to `external/{company_name}/index.html`

**Cost Estimates**:

| Salons | Visits/Month | CloudFront Data Transfer | CloudFront Requests | Route 53 | Lambda@Edge | DynamoDB | ACM   | **Total/Month** |
| ------ | ------------ | ------------------------ | ------------------- | -------- | ----------- | -------- | ----- | --------------- |
| 1      | 100          | $0.13                    | $0.01               | $0.50    | $0.00       | $0.00    | $0.00 | **$0.64**       |
| 1      | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00       | $0.00    | $0.00 | **$0.64**       |
| 1      | 10,000       | $1.28                    | $0.16               | $0.50    | $0.01       | $0.00    | $0.00 | **$1.95**       |
| 1      | 100,000      | $12.75                   | $1.58               | $0.50    | $0.13       | $0.00    | $0.00 | **$14.96**      |
| 10     | 100          | $0.13                    | $0.01               | $0.50    | $0.00       | $0.00    | $0.00 | **$0.64**       |
| 10     | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00       | $0.00    | $0.00 | **$0.64**       |
| 10     | 10,000       | $1.28                    | $0.16               | $0.50    | $0.01       | $0.00    | $0.00 | **$1.95**       |
| 10     | 100,000      | $12.75                   | $1.58               | $0.50    | $0.13       | $0.00    | $0.00 | **$14.96**      |
| 100    | 100          | $0.13                    | $0.01               | $0.50    | $0.00       | $0.25    | $0.00 | **$0.89**       |
| 100    | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00       | $0.25    | $0.00 | **$0.89**       |
| 100    | 10,000       | $12.75                   | $1.58               | $0.50    | $0.13       | $0.25    | $0.00 | **$15.21**      |
| 100    | 100,000      | $127.50                  | $15.75              | $0.50    | $1.26       | $0.25    | $0.00 | **$145.26**     |

**Assumptions**:

- **Page Content**: 1MB HTML + 20 images (200KB each = 4MB) = 5MB total per page
- **CloudFront Caching**: 90% cache hit ratio (images cached effectively)
- **Average Transfer per Visit**: 1.5MB (accounts for cache misses on first loads and HTML updates)
- **Requests per Visit**: 21 requests (1 HTML + 20 images)
- CloudFront data transfer: $0.085/GB (first 10TB)
- CloudFront requests: $0.0075 per 10,000 HTTPS requests
- Route 53: $0.50/month hosted zone (shared across all salons for subdomains)
- Lambda@Edge: $0.60 per million requests, $0.00000625/GB-second (avg 50ms execution, 128MB memory)
- DynamoDB: $0.25/month for 100 salons (On-Demand pricing, minimal reads)
- ACM: Free for public certificates

**Breakdown Example (100,000 visits/month)**:

- Data transfer: 100,000 visits × 1.5MB = 150GB = $12.75
- Requests: 100,000 visits × 21 requests = 2.1M requests = $1.58
- Lambda@Edge: 2.1M requests × $0.60/M = $1.26

---

### Option 2: Multiple CloudFront Distributions (One Per Salon)

**Approach**: Create a new CloudFront distribution for each salon's custom domain.

**Pros**:

- Simpler path routing (each distribution has specific origin path)
- Independent cache invalidation per salon
- Easier to debug individual salon issues
- More granular control per distribution

**Cons**:

- Higher cost (CloudFront charges per distribution)
- More complex infrastructure management
- SSL certificate management per distribution (or use ACM wildcard)
- Scaling challenges (CloudFront has distribution limits)
- More IAM complexity

**Implementation**:

- On deploy, create CloudFront distribution with:
  - Origin: S3 bucket
  - Origin Path: `external/{company_name}`
  - Custom domain in alternate domain names (CNAMEs)
- Create Route 53 A/AAAA record (Alias) pointing to CloudFront
- Store distribution ID in database

**Database Schema**:

```sql
CREATE TABLE salon_custom_domains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    custom_domain VARCHAR(255) NOT NULL UNIQUE,
    cloudfront_distribution_id VARCHAR(255) NOT NULL,
    route53_hosted_zone_id VARCHAR(255),
    route53_record_name VARCHAR(255),
    ssl_certificate_arn VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Flow**:

1. User provides `custom_url`
2. Lambda creates CloudFront distribution (if doesn't exist)
3. Lambda creates Route 53 record pointing to distribution
4. Wait for distribution deployment (can take 15-30 minutes)
5. Return custom domain URL

**Cost Estimates**:

| Salons | Visits/Month | CloudFront Data Transfer | CloudFront Requests | Route 53 | ACM   | CloudFormation | **Total/Month** |
| ------ | ------------ | ------------------------ | ------------------- | -------- | ----- | -------------- | --------------- |
| 1      | 100          | $0.13                    | $0.01               | $0.50    | $0.00 | $0.00          | **$0.64**       |
| 1      | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00 | $0.00          | **$0.64**       |
| 1      | 10,000       | $1.28                    | $0.16               | $0.50    | $0.00 | $0.00          | **$1.94**       |
| 1      | 100,000      | $12.75                   | $1.58               | $0.50    | $0.00 | $0.00          | **$14.83**      |
| 10     | 100          | $0.13                    | $0.01               | $0.50    | $0.00 | $0.00          | **$0.64**       |
| 10     | 1,000        | $1.28                    | $0.16               | $0.50    | $0.00 | $0.00          | **$1.94**       |
| 10     | 10,000       | $12.75                   | $1.58               | $0.50    | $0.00 | $0.00          | **$14.83**      |
| 10     | 100,000      | $127.50                  | $15.75              | $0.50    | $0.00 | $0.00          | **$143.75**     |
| 100    | 100          | $0.13                    | $0.01               | $5.00    | $0.00 | $0.00          | **$5.14**       |
| 100    | 1,000        | $1.28                    | $0.16               | $5.00    | $0.00 | $0.00          | **$6.44**       |
| 100    | 10,000       | $127.50                  | $15.75              | $5.00    | $0.00 | $0.00          | **$148.25**     |
| 100    | 100,000      | $1,275.00                | $157.50             | $5.00    | $0.00 | $0.00          | **$1,437.50**   |

**Assumptions**:

- Each salon gets its own CloudFront distribution
- **Page Content**: 1MB HTML + 20 images (200KB each = 4MB) = 5MB total per page
- **CloudFront Caching**: 90% cache hit ratio (images cached effectively)
- **Average Transfer per Visit**: 1.5MB (accounts for cache misses on first loads and HTML updates)
- **Requests per Visit**: 21 requests (1 HTML + 20 images)
- CloudFront data transfer: $0.085/GB (first 10TB)
- CloudFront requests: $0.0075 per 10,000 HTTPS requests
- Route 53: $0.50/month per hosted zone (assuming 100 salons = 10 hosted zones for shared subdomains, or 100 for full custom domains)
- ACM: Free for public certificates
- No Lambda@Edge costs (no routing needed)
- Distribution creation/deployment: Free (one-time cost is time, not money)

**Important Notes**:

- CloudFront distribution limit: 200 distributions per account (soft limit, can be increased)
- Each distribution update takes 15-30 minutes to deploy globally
- Higher cost at scale due to multiple distributions
- **Cost scales linearly with number of salons** (each salon has independent distribution and traffic)

---

### Option 3: CloudFront with S3 Website Endpoint Origin

**Approach**: Use S3 website endpoint as CloudFront origin instead of S3 REST API endpoint.

**Detailed Explanation**:
This option uses the S3 website hosting endpoint (e.g., `bucket.s3-website-region.amazonaws.com`) as the CloudFront origin instead of the S3 REST API endpoint (`bucket.s3.amazonaws.com`). This leverages S3's built-in website hosting features.

**Key Differences from S3 REST API Origin**:

1. **S3 Website Endpoint**:
   - Format: `{bucket}.s3-website-{region}.amazonaws.com`
   - Supports index documents (automatically serves `index.html` for directory requests)
   - Supports error documents (custom 404 pages)
   - Supports redirect rules (S3 routing rules)
   - HTTP-only (CloudFront terminates SSL)

2. **S3 REST API Endpoint**:
   - Format: `{bucket}.s3.{region}.amazonaws.com`
   - Direct object access
   - Requires explicit path (`/external/{company}/index.html`)
   - More control over caching headers
   - Supports bucket policies with Origin Access Identity (OAI)

**Implementation Details**:

**CloudFront Origin Configuration**:

```json
{
  "Origins": {
    "Items": [
      {
        "Id": "S3-Website-Origin",
        "DomainName": "static-web-bucket.s3-website-us-east-1.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSSLProtocols": {
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  }
}
```

**Path Routing with Lambda@Edge**:
Since S3 website endpoints don't support path-based routing directly, you still need Lambda@Edge to:

1. Extract custom domain from Host header
2. Map domain to company_name
3. Rewrite request URI to `/external/{company_name}/index.html`

**S3 Website Configuration** (bucket website settings):

```json
{
  "IndexDocument": {
    "Suffix": "index.html"
  },
  "ErrorDocument": {
    "Key": "error.html"
  },
  "RoutingRules": [
    {
      "Condition": {
        "KeyPrefixEquals": "external/"
      },
      "Redirect": {
        "ReplaceKeyWith": "external/index.html"
      }
    }
  ]
}
```

**Error Handling**:

- S3 website endpoints automatically handle 404s with error documents
- CloudFront can cache error responses (with proper cache headers)
- Custom error pages per company (if using S3 routing rules)

**Caching Behavior**:

- Less granular control over cache headers
- S3 website endpoints don't support custom cache control headers as easily
- CloudFront default cache behavior applies
- May need CloudFront cache policies for fine-grained control

**Security Considerations**:

- S3 website endpoints are public (no OAI needed)
- CloudFront handles HTTPS termination
- S3 bucket policies can restrict access to CloudFront IP ranges
- No need for Origin Access Control (OAC) or Origin Access Identity (OAI)

**Pros**:

- Leverages existing S3 website hosting configuration
- Simpler error handling (S3 website handles 404s automatically)
- Can use S3 website redirect rules for URL rewrites
- Automatic index document support
- No Origin Access Identity needed (simpler IAM setup)

**Cons**:

- S3 website endpoints are HTTP only (CloudFront handles HTTPS termination)
- Less control over caching behavior compared to REST API
- Origin request Lambda@Edge still needed for path routing
- S3 website endpoints don't support advanced features like Requester Pays
- Limited to HTTP-only communication between CloudFront and S3 (though end users get HTTPS)

**Use Case**:
Best suited when:

- You want to leverage S3 website hosting features
- You need simple error page handling
- You want to use S3 redirect rules
- You don't need advanced caching control
- You want simpler IAM configuration (no OAI/OAC)

**Cost Estimates**:

| Salons | Visits/Month | CloudFront Data Transfer | CloudFront Requests | Route 53 | Lambda@Edge | ACM   | **Total/Month** |
| ------ | ------------ | ------------------------ | ------------------- | -------- | ----------- | ----- | --------------- | ----------- |
| 1      | 100          | $0.13                    | $0.01               | $0.50    | $0.00       | $0.00 | **$0.64**       |
| 1      | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00       | $0.00 | **$0.64**       |
| 1      | 10,000       | $1.28                    | $0.16               | $0.50    | $0.01       | $0.00 | **$1.95**       |
| 1      | 100,000      | $12.75                   | $1.58               | $0.50    | $0.13       | $0.00 | **$14.96**      |
| 10     | 100          | $0.13                    | $0.01               | $0.50    | $0.00       | $0.25 | $0.00           | **$0.89**   |
| 10     | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00       | $0.25 | $0.00           | **$0.89**   |
| 10     | 10,000       | $1.28                    | $0.16               | $0.50    | $0.01       | $0.25 | $0.00           | **$2.20**   |
| 10     | 100,000      | $12.75                   | $1.58               | $0.50    | $0.13       | $0.25 | $0.00           | **$15.21**  |
| 100    | 100          | $0.13                    | $0.01               | $0.50    | $0.00       | $0.25 | $0.00           | **$0.89**   |
| 100    | 1,000        | $0.13                    | $0.01               | $0.50    | $0.00       | $0.25 | $0.00           | **$0.89**   |
| 100    | 10,000       | $12.75                   | $1.58               | $0.50    | $0.13       | $0.25 | $0.00           | **$15.21**  |
| 100    | 100,000      | $127.50                  | $15.75              | $0.50    | $1.26       | $0.25 | $0.00           | **$145.26** |

**Assumptions**:

- **Page Content**: 1MB HTML + 20 images (200KB each = 4MB) = 5MB total per page
- **CloudFront Caching**: 90% cache hit ratio (images cached effectively)
- **Average Transfer per Visit**: 1.5MB (accounts for cache misses on first loads and HTML updates)
- **Requests per Visit**: 21 requests (1 HTML + 20 images)
- Same pricing structure as Option 1 (single distribution with Lambda@Edge)
- S3 website endpoint: Same data transfer costs as REST API
- CloudFront: Same pricing structure
- Lambda@Edge: $0.60 per million requests for domain routing
- DynamoDB: $0.25/month for 100 salons (On-Demand pricing, minimal reads)
- No additional costs for using website endpoint vs REST API

**Breakdown Example (100,000 visits/month)**:

- Data transfer: 100,000 visits × 1.5MB = 150GB = $12.75
- Requests: 100,000 visits × 21 requests = 2.1M requests = $1.58
- Lambda@Edge: 2.1M requests × $0.60/M = $1.26

---

## Recommended Solution: Option 1 with Enhancements

### Architecture Components

#### 1. CloudFront Distribution

- **Single Distribution**: One CloudFront distribution for all salons
- **Origin**: S3 bucket (REST API endpoint, not website endpoint)
- **Alternate Domain Names**: List of all active custom domains
- **SSL Certificate**: ACM certificate (wildcard or SAN) for all domains
- **Cache Behaviors**: Default behavior with Lambda@Edge for path rewriting

#### 2. Lambda@Edge Function

**Purpose**: Route requests to correct S3 path based on custom domain.

**Trigger**: CloudFront Origin Request

**Logic**:

```python
def lambda_handler(event, context):
    request = event['Records'][0]['cf']['request']
    headers = request['headers']

    # Get custom domain from Host header
    host = headers.get('host', [{}])[0].get('value', '')

    # Query database/cache to get company_name from custom_domain
    # This could be:
    # 1. DynamoDB lookup (fast, scalable)
    # 2. CloudFront cache (via response headers)
    # 3. Pre-loaded in Lambda environment

    company_name = get_company_name_from_domain(host)

    if company_name:
        # Rewrite path to company-specific location
        request['uri'] = f'/external/{company_name}/index.html'

    return request
```

**Considerations**:

- Lambda@Edge has execution time limits (5 seconds viewer request, 30 seconds origin request)
- Database lookup should be cached (DynamoDB or CloudFront cache)
- Consider using CloudFront Functions for simple lookups (cheaper, faster)

#### 3. Route 53 Configuration

**Approach**:

- Use hosted zone for parent domain (e.g., `getpagoda.site`)
- Create A/AAAA records (Alias) for each custom domain
- Point to CloudFront distribution

**Implementation**:

```python
def create_route53_record(custom_domain: str, cloudfront_distribution_id: str):
    # Parse domain to get hosted zone
    # For subdomains: salon.getpagoda.site → hosted zone: getpagoda.site
    # For custom domains: mysalon.com → hosted zone: mysalon.com (requires ownership)

    route53_client.create_record(
        HostedZoneId=hosted_zone_id,
        ChangeBatch={
            'Changes': [{
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': custom_domain,
                    'Type': 'A',
                    'AliasTarget': {
                        'DNSName': f'{cloudfront_distribution_id}.cloudfront.net',
                        'EvaluateTargetHealth': False,
                        'HostedZoneId': 'Z2FDTNDATAQYW2'  # CloudFront hosted zone ID
                    }
                }
            }]
        }
    )
```

**Domain Ownership**:

- **Subdomains** (e.g., `salon.getpagoda.site`): Easy - use existing hosted zone
- **Full Custom Domains** (e.g., `mysalon.com`): Requires domain ownership verification and hosted zone creation

#### 4. SSL/TLS Certificate Management

**ACM Certificate Strategy**:

- **Option A**: One wildcard certificate (`*.getpagoda.site`) for subdomains
- **Option B**: Multiple certificates (one per domain)
- **Option C**: SAN certificate with multiple domains (up to 100 domains per cert)

**Recommended**: Use wildcard certificate for subdomains, individual certificates for full custom domains.

**CloudFront Certificate Requirements**:

- Must be in `us-east-1` region (CloudFront requirement)
- Must request certificate before adding to CloudFront distribution

#### 5. Database Schema Enhancements

```sql
-- Store custom domain mappings
CREATE TABLE salon_custom_domains (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    custom_domain VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,

    -- CloudFront configuration
    cloudfront_distribution_id VARCHAR(255), -- Single distribution ID for all
    cloudfront_cache_key VARCHAR(255), -- For cache invalidation

    -- Route 53 configuration
    route53_hosted_zone_id VARCHAR(255),
    route53_record_name VARCHAR(255),
    route53_record_type VARCHAR(10) DEFAULT 'A',

    -- SSL configuration
    ssl_certificate_arn VARCHAR(255),
    ssl_certificate_status VARCHAR(50), -- pending, issued, failed

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, failed, deleted
    last_deployment_at TIMESTAMP,
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),

    -- Indexes
    INDEX idx_salon_id (salon_id),
    INDEX idx_custom_domain (custom_domain),
    INDEX idx_status (status)
);

-- Function to get company_name from domain (for Lambda@Edge)
CREATE OR REPLACE FUNCTION get_company_name_from_domain(domain_name VARCHAR(255))
RETURNS VARCHAR(255) AS $$
    SELECT company_name
    FROM salon_custom_domains
    WHERE custom_domain = domain_name AND status = 'active'
    LIMIT 1;
$$ LANGUAGE sql STABLE;
```

#### 6. DynamoDB Lookup Table (Alternative to Database)

For Lambda@Edge performance, consider a DynamoDB table:

```python
# DynamoDB table structure
Table: SalonCustomDomains
Partition Key: custom_domain (String)
Attributes:
  - company_name (String)
  - salon_id (String)
  - status (String)
  - ttl (Number) - for cache expiration
```

**Benefits**:

- Fast lookups (single-digit milliseconds)
- Global replication for Lambda@Edge
- TTL for automatic cleanup
- No database connection overhead

---

## Implementation Steps

### Phase 1: Infrastructure Setup

1. **Create CloudFront Distribution**
   - Origin: S3 bucket (REST API)
   - Default cache behavior
   - SSL certificate (wildcard or initial domains)
   - Lambda@Edge function (basic version)

2. **Create Route 53 Hosted Zone** (if subdomain approach)
   - For parent domain (e.g., `getpagoda.site`)
   - NS records configured

3. **ACM Certificate**
   - Request wildcard certificate in `us-east-1`
   - Validate domain ownership
   - Attach to CloudFront distribution

4. **Database Schema**
   - Create `salon_custom_domains` table
   - Add migration scripts

### Phase 2: Lambda Functions

1. **Lambda@Edge Function**
   - Create viewer request or origin request function
   - Implement domain → company_name lookup
   - Deploy to all CloudFront edge locations

2. **Deploy Lambda Enhancement**
   - Update `lambda_handler` in `deploy/lambda_handler.py`
   - Add CloudFront distribution update logic
   - Add Route 53 record creation
   - Add ACM certificate request/validation

3. **Domain Management Lambda** (Optional)
   - Separate Lambda for domain lifecycle management
   - Handle certificate renewal
   - Handle distribution updates

### Phase 3: Integration

1. **Update Deploy Lambda Handler**

   ```python
   def __configure_custom_domain(
       custom_url: str,
       company_name: str,
       salon_id: str
   ) -> Dict[str, Any]:
       """
       Configure custom domain with CloudFront and Route 53.
       """
       # 1. Store domain mapping in database
       # 2. Add domain to CloudFront distribution (if not exists)
       # 3. Request/validate ACM certificate (if needed)
       # 4. Create Route 53 record
       # 5. Invalidate CloudFront cache (optional)
       # 6. Update database with status
   ```

2. **Update StaticWebS3Client**
   - Add CloudFront invalidation method
   - Update `get_custom_domain_url()` to return actual custom domain

3. **Add Monitoring**
   - CloudWatch metrics for domain deployments
   - Alarms for failed deployments
   - Logging for Lambda@Edge debugging

### Phase 4: Testing & Validation

1. **Unit Tests**
   - Test domain mapping logic
   - Test Route 53 record creation
   - Test CloudFront distribution updates

2. **Integration Tests**
   - Test full deployment flow
   - Test custom domain access
   - Test SSL certificate validation

3. **Load Testing**
   - Test Lambda@Edge performance
   - Test database/DynamoDB lookup performance
   - Test cache invalidation

---

## Code Changes Required

### 1. New Lambda Function: Domain Configuration

**File**: `app/init-bookings-app/static_web_generator/endpoints/deploy/domain_configurator.py`

```python
import boto3
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class DomainConfigurator:
    """Manages CloudFront and Route 53 configuration for custom domains."""

    def __init__(self):
        self.cloudfront = boto3.client('cloudfront')
        self.route53 = boto3.client('route53')
        self.acm = boto3.client('acm', region_name='us-east-1')

    def configure_custom_domain(
        self,
        custom_domain: str,
        company_name: str,
        distribution_id: str
    ) -> Dict[str, Any]:
        """Configure custom domain with CloudFront and Route 53."""
        # Implementation here
        pass

    def add_domain_to_distribution(
        self,
        distribution_id: str,
        domain: str,
        certificate_arn: str
    ) -> bool:
        """Add custom domain to CloudFront distribution."""
        # Implementation here
        pass

    def create_route53_record(
        self,
        domain: str,
        distribution_id: str,
        hosted_zone_id: str
    ) -> bool:
        """Create Route 53 A record pointing to CloudFront."""
        # Implementation here
        pass
```

### 2. Update Deploy Lambda Handler

**File**: `app/init-bookings-app/static_web_generator/endpoints/deploy/lambda_handler.py`

Add after `__copy_internal_to_external()`:

```python
def __configure_custom_domain(
    custom_url: str,
    company_name: str,
    salon_id: str
) -> Dict[str, Any]:
    """Configure custom domain with CloudFront and Route 53."""
    configurator = DomainConfigurator()
    distribution_id = os.getenv('CloudFrontDistributionId')

    return configurator.configure_custom_domain(
        custom_url, company_name, distribution_id
    )
```

Update `lambda_handler` to call this function.

### 3. Lambda@Edge Function

**New File**: `app/init-bookings-app/static_web_generator/lambda_edge/domain_router.py`

```python
import json
import os
import boto3

# DynamoDB client (if using DynamoDB for lookups)
dynamodb = boto3.client('dynamodb')

def lambda_handler(event, context):
    """Lambda@Edge function to route requests to correct S3 path."""
    request = event['Records'][0]['cf']['request']
    headers = request['headers']

    # Get domain from Host header
    host = headers.get('host', [{}])[0].get('value', '')

    # Lookup company_name from domain
    company_name = lookup_company_name(host)

    if company_name:
        # Rewrite URI to company-specific path
        request['uri'] = f'/external/{company_name}/index.html'

    return request

def lookup_company_name(domain: str) -> str:
    """Lookup company_name from domain using DynamoDB or cache."""
    # Implementation using DynamoDB or cached lookup
    pass
```

### 4. Update Repository

**File**: `app/init-bookings-app/static_web_generator/repositories/static_web_generator.py`

Add methods:

```python
def save_custom_domain_mapping(
    self,
    salon_id: str,
    custom_domain: str,
    company_name: str
) -> Dict[str, Any]:
    """Save custom domain mapping to database."""
    # Implementation

def get_company_name_from_domain(self, domain: str) -> Optional[str]:
    """Get company_name from custom domain."""
    # Implementation
```

---

## Deploy vs Rebuild: Conceptual Separation

### Understanding the Two Operations

There are two distinct operations that should be separated:

1. **Rebuild/Update Website Content** (Frequent)
   - Regenerates HTML content from salon data
   - Updates files in S3 (`internal/{company_name}/index.html`)
   - Copies from internal to external folder (`external/{company_name}/index.html`)
   - **No DNS changes needed**
   - **No CloudFront distribution updates needed**
   - Fast operation (seconds)

2. **Deploy/Configure Custom Domain** (One-time per domain)
   - Sets up custom domain infrastructure (first time only)
   - Creates/updates Route 53 DNS records
   - Configures CloudFront distribution (adds domain to alternate domain names)
   - Requests/validates SSL certificates
   - **Slow operation** (15-30 minutes for CloudFront deployment)
   - **Only needed once per custom domain**

### Example: Separating Deploy vs Rebuild

**Current Flow (Combined)**:

```python
def lambda_handler(event, context):
    # 1. Extract parameters
    salon_id = extract_salon_id(event)
    custom_url = extract_custom_url(event)

    # 2. Rebuild website content
    company_info = get_company_info(salon_id)
    html_content = generate_html(company_info)
    upload_to_internal(html_content, company_info["company_name"])
    copy_internal_to_external(company_info["company_name"])

    # 3. Configure custom domain (DNS, CloudFront, SSL)
    configure_custom_domain(custom_url, company_info["company_name"])

    return success_response
```

**Separated Flow (Recommended)**:

**Rebuild/Update Endpoint** (`/static-web-generator/{salon_id}/rebuild`):

```python
def rebuild_handler(event, context):
    """
    Rebuilds website content and updates S3 files.
    Fast operation - no DNS/CloudFront changes.
    """
    logger.info("Processing website rebuild request")

    salon_id = extract_salon_id(event)
    company_info = get_company_info(salon_id)

    # Regenerate HTML content
    html_content = generate_html(company_info)

    # Update internal preview
    upload_to_internal(html_content, company_info["company_name"])

    # Deploy to external (production)
    copy_internal_to_external(company_info["company_name"])

    # Invalidate CloudFront cache (if custom domain already configured)
    custom_domain = get_custom_domain_from_db(salon_id)
    if custom_domain and custom_domain["status"] == "active":
        invalidate_cloudfront_cache(custom_domain["cloudfront_distribution_id"])

    return {
        "message": "Website content updated successfully",
        "company": company_info["company_name"],
        "html_size": len(html_content),
        "s3_url": get_s3_website_url(company_info["company_name"])
    }
```

**Deploy/Configure Endpoint** (`/static-web-generator/{salon_id}/deploy`):

```python
def deploy_handler(event, context):
    """
    Configures custom domain infrastructure (DNS, CloudFront, SSL).
    One-time setup per custom domain. Slow operation (15-30 min).
    """
    logger.info("Processing custom domain deployment request")

    salon_id = extract_salon_id(event)
    custom_url = extract_custom_url(event)

    # Check if domain already configured
    existing_domain = get_custom_domain_from_db(salon_id, custom_url)
    if existing_domain and existing_domain["status"] == "active":
        return {
            "message": "Custom domain already configured",
            "custom_url": f"https://{custom_url}",
            "status": "active"
        }

    company_info = get_company_info(salon_id)

    # Ensure website content exists in external folder
    if not website_exists_external(company_info["company_name"]):
        # Trigger rebuild first
        rebuild_website(company_info["company_name"])

    # Configure custom domain infrastructure
    config_result = configure_custom_domain(
        custom_url=custom_url,
        company_name=company_info["company_name"],
        salon_id=salon_id
    )

    # Store configuration in database
    save_domain_configuration(
        salon_id=salon_id,
        custom_domain=custom_url,
        company_name=company_info["company_name"],
        cloudfront_distribution_id=config_result["distribution_id"],
        route53_record_name=config_result["record_name"],
        ssl_certificate_arn=config_result["certificate_arn"],
        status="pending"  # Will be updated to "active" when deployment completes
    )

    return {
        "message": "Custom domain deployment initiated",
        "custom_url": f"https://{custom_url}",
        "status": "pending",
        "estimated_completion": "15-30 minutes",
        "note": "Domain will be accessible once CloudFront distribution deploys"
    }
```

**Deployment Status Check Endpoint** (`/static-web-generator/{salon_id}/deploy-status`):

```python
def deployment_status_handler(event, context):
    """
    Checks the status of custom domain deployment.
    """
    salon_id = extract_salon_id(event)
    custom_domain = get_custom_domain_from_db(salon_id)

    if not custom_domain:
        return {"status": "not_configured"}

    # Check CloudFront distribution status
    distribution_status = check_cloudfront_status(
        custom_domain["cloudfront_distribution_id"]
    )

    # Check SSL certificate status
    ssl_status = check_ssl_certificate_status(
        custom_domain["ssl_certificate_arn"]
    )

    # Update database if status changed
    if distribution_status == "deployed" and ssl_status == "issued":
        update_domain_status(salon_id, custom_domain["custom_domain"], "active")

    return {
        "custom_url": f"https://{custom_domain['custom_domain']}",
        "status": custom_domain["status"],
        "cloudfront_status": distribution_status,
        "ssl_status": ssl_status,
        "estimated_completion": calculate_remaining_time(custom_domain)
    }
```

### Benefits of Separation

1. **Performance**: Rebuild operations are fast (seconds) vs deploy (15-30 minutes)
2. **User Experience**: Users can update content frequently without waiting for DNS propagation
3. **Error Handling**: Failed rebuilds don't affect DNS configuration
4. **Cost**: Rebuild operations don't trigger CloudFront distribution updates (saves money)
5. **Flexibility**: Can rebuild content without custom domain configuration
6. **Monitoring**: Separate metrics for rebuild vs deploy operations

### Database Schema Enhancement

```sql
-- Track rebuild operations separately
CREATE TABLE salon_website_rebuilds (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    company_name VARCHAR(255) NOT NULL,
    html_size INTEGER,
    s3_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'success', -- success, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Custom domain deployments (one-time setup)
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
    last_rebuild_at TIMESTAMP, -- Last time website content was updated

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## File Deployment vs DNS Propagation

### Key Distinction

**File Deployment (Updating External Folder)**:

- **Operation**: Updates files in S3 bucket (`external/{company_name}/index.html`)
- **Frequency**: Can happen frequently (every time website content changes)
- **Speed**: Fast (seconds)
- **Impact**: Changes are immediately visible (after CloudFront cache invalidation)
- **No DNS Changes**: Does not require DNS propagation
- **No CloudFront Distribution Updates**: Only requires cache invalidation

**DNS/Infrastructure Deployment (One-Time Setup)**:

- **Operation**: Configures custom domain (Route 53, CloudFront, SSL)
- **Frequency**: One-time per custom domain (or when domain changes)
- **Speed**: Slow (15-30 minutes for CloudFront distribution deployment)
- **Impact**: Makes custom domain accessible for the first time
- **DNS Propagation**: Requires DNS changes to take effect globally
- **CloudFront Updates**: Requires distribution update and global deployment

### Example Scenario

**Scenario 1: First Time Setup**

1. Salon provides custom URL: `mysalon.com`
2. **Deploy Operation** (takes 15-30 minutes):
   - Create Route 53 record pointing to CloudFront
   - Add domain to CloudFront distribution alternate domain names
   - Request/validate SSL certificate
   - Wait for CloudFront distribution to deploy globally
   - Update database status to "active"
3. **Result**: Custom domain is now accessible at `https://mysalon.com`

**Scenario 2: Content Update (No DNS Changes)**

1. Salon updates their services/pricing
2. **Rebuild Operation** (takes seconds):
   - Regenerate HTML content
   - Upload to `internal/{company_name}/index.html`
   - Copy to `external/{company_name}/index.html`
   - Invalidate CloudFront cache for that path
3. **Result**: Updated content is immediately available (after cache invalidation, ~1-2 minutes)

**Scenario 3: Domain Change**

1. Salon wants to change from `old-salon.com` to `new-salon.com`
2. **Deploy Operation** (takes 15-30 minutes):
   - Remove old domain from CloudFront distribution
   - Remove old Route 53 record
   - Add new domain to CloudFront distribution
   - Create new Route 53 record
   - Request/validate new SSL certificate
   - Wait for CloudFront distribution to deploy
3. **Result**: New domain is accessible, old domain is removed

### Implementation Strategy

**Option A: Separate Endpoints** (Recommended)

- `/rebuild` - Fast content updates
- `/deploy` - Slow domain configuration
- `/deploy-status` - Check deployment progress

**Option B: Single Endpoint with Flags**

- `/deploy?action=rebuild` - Fast content update
- `/deploy?action=configure` - Slow domain configuration
- `/deploy?action=status` - Check status

**Option C: Automatic Detection**

- Check if custom domain already configured
- If yes: Only rebuild content
- If no: Full deployment (rebuild + configure)

### Code Example: Separate Operations

```python
def __rebuild_website_content(company_name: str) -> Dict[str, Any]:
    """
    Fast operation: Rebuilds and updates website content.
    No DNS or CloudFront distribution changes.
    """
    logger.info(f"Rebuilding website content for: {company_name}")

    # Generate HTML
    html_content = generate_html_content(company_name)

    # Update internal preview
    s3_client.upload_to_internal(html_content, company_name)

    # Deploy to external (production)
    s3_client.copy_internal_to_external(company_name)

    # Invalidate CloudFront cache (if domain configured)
    custom_domain = get_active_custom_domain(company_name)
    if custom_domain:
        cloudfront_client.invalidate_cache(
            distribution_id=custom_domain["cloudfront_distribution_id"],
            paths=[f"/external/{company_name}/*"]
        )

    return {
        "success": True,
        "html_size": len(html_content),
        "s3_location": f"external/{company_name}/index.html"
    }


def __configure_custom_domain(
    custom_url: str,
    company_name: str,
    salon_id: str
) -> Dict[str, Any]:
    """
    Slow operation: Configures custom domain infrastructure.
    One-time setup per domain. Takes 15-30 minutes.
    """
    logger.info(f"Configuring custom domain: {custom_url} for {company_name}")

    # Check if already configured
    existing = get_custom_domain_config(salon_id, custom_url)
    if existing and existing["status"] == "active":
        return {
            "success": True,
            "message": "Domain already configured",
            "custom_url": f"https://{custom_url}"
        }

    # Ensure website content exists
    if not s3_client.website_exists_external(company_name):
        logger.info("Website content missing, rebuilding first")
        __rebuild_website_content(company_name)

    # Configure infrastructure
    distribution_id = os.getenv("CloudFrontDistributionId")

    # 1. Request/validate SSL certificate
    certificate_arn = acm_client.request_certificate(custom_url)

    # 2. Add domain to CloudFront distribution
    cloudfront_client.add_alternate_domain_name(
        distribution_id=distribution_id,
        domain=custom_url,
        certificate_arn=certificate_arn
    )

    # 3. Create Route 53 record
    hosted_zone_id = get_or_create_hosted_zone(custom_url)
    route53_client.create_alias_record(
        hosted_zone_id=hosted_zone_id,
        domain=custom_url,
        distribution_id=distribution_id
    )

    # 4. Store configuration (status will be updated when deployment completes)
    save_domain_configuration(
        salon_id=salon_id,
        custom_url=custom_url,
        company_name=company_name,
        distribution_id=distribution_id,
        certificate_arn=certificate_arn,
        status="pending"
    )

    return {
        "success": True,
        "message": "Custom domain deployment initiated",
        "custom_url": f"https://{custom_url}",
        "status": "pending",
        "estimated_completion_minutes": 30
    }
```

### Benefits of This Separation

1. **User Experience**:
   - Content updates are fast (seconds)
   - Users don't wait 30 minutes for simple content changes

2. **Cost Optimization**:
   - Rebuild operations don't trigger CloudFront distribution updates
   - Distribution updates only happen when domain configuration changes

3. **Error Isolation**:
   - Failed content rebuilds don't affect DNS configuration
   - DNS/SSL issues don't prevent content updates

4. **Monitoring**:
   - Separate metrics for rebuild vs deploy operations
   - Better visibility into operation performance

5. **Flexibility**:
   - Can update content without custom domain
   - Can configure domain without immediate content update

## Cost Considerations

### CloudFront Costs

- **Data Transfer**: $0.085/GB for first 10TB (varies by region)
- **Requests**: $0.0075 per 10,000 HTTPS requests
- **Distribution**: No base cost (pay per use)
- **Cache Invalidation**: First 1,000 paths/month free, then $0.005 per path

### Route 53 Costs

- **Hosted Zone**: $0.50/month per hosted zone
- **Queries**: $0.40 per million queries (first billion)
- **Health Checks**: $0.50/month per health check

### Lambda@Edge Costs

- **Requests**: $0.60 per million requests
- **Compute**: $0.00000625 per GB-second
- **Free Tier**: 1M requests/month

### ACM Costs

- **Certificates**: Free (public certificates)
- **Private Certificates**: $400/month

### S3 Costs

- **Storage**: $0.023/GB/month (Standard storage)
- **PUT Requests**: $0.005 per 1,000 requests
- **GET Requests**: $0.0004 per 1,000 requests
- **Data Transfer Out**: $0.09/GB (first 10TB)

**Image Storage Costs** (per salon):

- 20 images × 200KB = 4MB per salon
- Storage: 4MB × $0.023/GB = $0.000092/month per salon
- For 100 salons: 100 × 4MB = 400MB = 0.4GB = $0.0092/month
- **Note**: Storage costs are minimal compared to data transfer costs

### DynamoDB Costs (if used for Lambda@Edge lookups)

- **On-Demand**: $1.25 per million read requests, $1.25 per million write requests
- **Provisioned**: $0.25 per million read units, $1.25 per million write units

### Cost Summary by Operation

**Rebuild Operation Cost** (per rebuild):

- S3 PUT: $0.000005 (1 HTML request)
- S3 PUT for images: $0.0001 (20 image requests if uploading new images)
- S3 COPY: $0.000005 (1 request to copy HTML)
- CloudFront Invalidation: Free (first 1,000/month)
- **Total**: ~$0.00011 per rebuild (with image uploads)
- **Note**: Image uploads typically happen less frequently than HTML updates

**Deploy Operation Cost** (one-time per domain):

- Route 53 Record: Included in hosted zone cost
- CloudFront Distribution Update: Free (but takes time)
- ACM Certificate: Free
- **Total**: Included in monthly infrastructure costs

---

## Cache Invalidation Strategy for Images

### Overview

Instead of invalidating all assets (HTML + images) when content updates, use a selective invalidation strategy that only invalidates what changed. This significantly reduces cache invalidation costs and improves cache hit ratios.

### Strategy: Versioned Images with Selective Invalidation

**Core Concept:**

1. **Image Versioning**: When an image changes, use a new filename (e.g., `salon-photo-v2.jpg`) or add a version query parameter (e.g., `salon-photo.jpg?v=2`)
2. **HTML Update**: When HTML references the new image, the HTML itself changes (new URL)
3. **Selective Invalidation**: Only invalidate the specific HTML file path, not all images
4. **Image Cache**: Old images stay cached until TTL expires (could be 90+ days), new images are cached on first request

### Implementation

**Image Update Flow:**

```python
def update_salon_image(
    salon_id: str,
    image_path: str,
    new_image_data: bytes,
    company_name: str
):
    """
    Update salon image with versioning and selective cache invalidation.
    """
    logger.info(f"Updating image for salon {salon_id}: {image_path}")

    # 1. Generate versioned filename
    version = get_next_version(salon_id, image_path)  # e.g., v2, v3
    base_name, extension = image_path.rsplit('.', 1)
    versioned_path = f"{base_name}-v{version}.{extension}"
    # Example: salon-photo.jpg -> salon-photo-v2.jpg

    # 2. Upload new versioned image to S3
    s3_key = f"external/{company_name}/images/{versioned_path}"
    s3_client.put_object(
        Bucket=bucket_name,
        Key=s3_key,
        Body=new_image_data,
        ContentType=f"image/{extension}",
        CacheControl="public, max-age=31536000, immutable"  # 1 year, immutable
    )

    # 3. Update HTML to reference new image path
    html_content = regenerate_html_with_new_image(
        company_name,
        old_image_path=image_path,
        new_image_path=versioned_path
    )

    # 4. Upload updated HTML
    s3_client.upload_html(html_content, company_name)

    # 5. Invalidate ONLY the HTML file (not images)
    custom_domain = get_active_custom_domain(company_name)
    if custom_domain:
        cloudfront_client.invalidate_cache(
            distribution_id=custom_domain["cloudfront_distribution_id"],
            paths=[f"/external/{company_name}/index.html"]  # Only HTML, not images
        )

    logger.info(f"Image updated: {versioned_path}, HTML invalidated")
    # Images are automatically cached on first request
    # Old image versions remain cached until TTL expires (no cost to serve)
```

**HTML Update Flow (without image changes):**

```python
def update_html_content(company_name: str, html_content: str):
    """
    Update HTML content without invalidating images.
    """
    # Upload updated HTML
    s3_client.upload_html(html_content, company_name)

    # Invalidate ONLY HTML
    custom_domain = get_active_custom_domain(company_name)
    if custom_domain:
        cloudfront_client.invalidate_cache(
            distribution_id=custom_domain["cloudfront_distribution_id"],
            paths=[f"/external/{company_name}/index.html"]
        )

    # Images remain cached and continue serving from cache
```

### Cache TTL Configuration

**Recommended Cache Headers:**

**Images (Long Cache with Immutable):**

```python
CacheControl="public, max-age=31536000, immutable"  # 1 year, immutable (recommended)
# Or for 90 days:
CacheControl="public, max-age=7776000, immutable"  # 90 days, immutable
#
# immutable directive tells browsers/CDNs:
# - This resource never changes (hash-based filename ensures this)
# - Never check if it's updated (no conditional requests)
# - Maximum cache efficiency
```

**HTML (Shorter Cache, Invalidated on Updates):**

```python
CacheControl="public, max-age=3600"  # 1 hour
# Or 24 hours if content changes less frequently
CacheControl="public, max-age=86400"  # 24 hours
```

**Alternative: Version Query Parameters**
Instead of versioned filenames, use query parameters:

```python
# Image URL in HTML: salon-photo.jpg?v=2
# When image updates, change to: salon-photo.jpg?v=3
# Browser treats as new resource, automatically fetches it
# No cache invalidation needed for images
```

### Cost Benefits

**Cache Invalidation Costs:**

- **Current Approach (Invalidate All)**:
  - HTML + 20 images = 21 paths
  - After free tier: 20 × $0.005 = $0.10 per update
- **Selective Invalidation (Invalidate HTML Only)**:
  - HTML only = 1 path
  - Within free tier: $0.00 per update (if < 1,000 invalidations/month)
  - **Cost Savings**: $0.10 per update × frequency

**Example Savings (100 salons, 10 updates/month each):**

- Current: 1,000 updates × 21 paths = 21,000 paths = $100/month
- Selective: 1,000 updates × 1 path = 1,000 paths = $0/month (free tier)
- **Savings: $100/month**

**Improved Cache Hit Ratios:**

- **Images**: 95%+ cache hit ratio (cached for 90 days)
- **HTML**: 80-90% cache hit ratio (cached for 1-24 hours, invalidated on updates)
- **Overall**: ~92-95% cache hit ratio vs ~90% without optimization

**Data Transfer Reduction:**

- With 95% cache hit ratio vs 90%:
  - At 100,000 visits/month: 5,000 cache misses vs 10,000
  - Data transfer: 25GB vs 50GB
  - **Cost savings: ~$2.13/month per 100K visits**

### Best Practices

1. **Image Versioning Strategy**:
   - Use filename versioning (`image-v2.jpg`) for permanent changes
   - Use query parameters (`image.jpg?v=2`) for temporary cache busting
   - Track versions in database to manage cleanup

2. **Cache Headers**:
   - Set very long TTL for images (90+ days)
   - Set shorter TTL for HTML (1-24 hours)
   - Use `public` directive for public assets
   - Use `immutable` for versioned assets that never change

3. **Selective Invalidation**:
   - Only invalidate paths that actually changed
   - Use path patterns for bulk invalidation when needed
   - Batch invalidations to stay within free tier

4. **Image Cleanup**:
   - Old image versions can remain in S3 (for rollback capability)
   - Implement cleanup policy for images older than X versions
   - Monitor S3 storage costs vs cache invalidation costs

5. **Monitoring**:
   - Track cache hit ratios per asset type
   - Monitor cache invalidation costs
   - Alert on excessive invalidations

### Database Schema for Image Versioning

```sql
CREATE TABLE salon_image_versions (
    id SERIAL PRIMARY KEY,
    salon_id UUID NOT NULL REFERENCES salons(uuid),
    image_name VARCHAR(255) NOT NULL,  -- Original name: "salon-photo.jpg"
    current_version INTEGER DEFAULT 1,
    s3_path VARCHAR(500) NOT NULL,  -- Full S3 path with version
    file_size INTEGER,  -- Size in bytes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(salon_id, image_name, current_version)
);

-- Get current version for an image
CREATE OR REPLACE FUNCTION get_current_image_version(
    p_salon_id UUID,
    p_image_name VARCHAR(255)
) RETURNS VARCHAR(500) AS $$
    SELECT s3_path
    FROM salon_image_versions
    WHERE salon_id = p_salon_id
      AND image_name = p_image_name
      AND current_version = (
          SELECT MAX(current_version)
          FROM salon_image_versions
          WHERE salon_id = p_salon_id
            AND image_name = p_image_name
      )
    LIMIT 1;
$$ LANGUAGE sql STABLE;
```

### Implementation Example

**Complete Image Update with Versioning:**

```python
def update_salon_image_with_versioning(
    salon_id: str,
    original_image_name: str,
    new_image_data: bytes,
    company_name: str
) -> Dict[str, Any]:
    """
    Update salon image with automatic versioning and selective cache invalidation.
    """
    with DatabaseConnection() as conn:
        with conn.cursor() as cursor:
            # Get current version
            cursor.execute("""
                SELECT COALESCE(MAX(current_version), 0)
                FROM salon_image_versions
                WHERE salon_id = %s AND image_name = %s
            """, (salon_id, original_image_name))
            current_version = cursor.fetchone()[0]
            next_version = current_version + 1

            # Generate versioned filename
            base_name, extension = original_image_name.rsplit('.', 1)
            versioned_filename = f"{base_name}-v{next_version}.{extension}"
            s3_path = f"external/{company_name}/images/{versioned_filename}"

            # Upload new image
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_path,
                Body=new_image_data,
                ContentType=f"image/{extension}",
                CacheControl="public, max-age=31536000, immutable"  # 1 year, immutable
            )

            # Record version in database
            cursor.execute("""
                INSERT INTO salon_image_versions
                (salon_id, image_name, current_version, s3_path, file_size)
                VALUES (%s, %s, %s, %s, %s)
            """, (salon_id, original_image_name, next_version, s3_path, len(new_image_data)))

            # Update HTML to reference new image
            html_content = regenerate_html_with_new_image(
                company_name,
                old_path=f"images/{original_image_name}",
                new_path=f"images/{versioned_filename}"
            )

            # Upload updated HTML
            s3_client.upload_html(html_content, company_name)

            # Invalidate ONLY HTML
            custom_domain = get_active_custom_domain(company_name)
            if custom_domain:
                cloudfront_client.invalidate_cache(
                    distribution_id=custom_domain["cloudfront_distribution_id"],
                    paths=[f"/external/{company_name}/index.html"]
                )

            conn.commit()

            return {
                "success": True,
                "image_version": next_version,
                "s3_path": s3_path,
                "message": "Image updated, HTML invalidated"
            }
```

### Summary

This strategy provides:

- **Cost Savings**: $0.10+ per update (avoiding image invalidation)
- **Improved Cache Hit Ratios**: 95%+ for images, 80-90% for HTML
- **Better Performance**: Reduced origin requests, faster page loads
- **Scalability**: Costs scale with HTML updates, not image updates

---

## Layered Caching Strategy

### Overview

CloudFront automatically provides a three-layer caching system that works together to minimize latency, reduce data transfer costs, and optimize performance. Understanding how these layers work helps configure optimal cache headers.

### The Three Layers

**Layer 1: Browser Cache (Client-Side)**

- **Location**: User's browser storage
- **Speed**: <1ms (instant)
- **Capacity**: Limited (~100MB-1GB, varies by browser)
- **Control**: Set via `Cache-Control` headers

**Layer 2: CloudFront Edge Cache (CDN)**

- **Location**: AWS edge locations worldwide (300+ locations)
- **Speed**: 10-50ms (from nearest edge location)
- **Capacity**: Very large (effectively unlimited for practical purposes)
- **Control**: Respects your `Cache-Control` headers, TTL configurable

**Layer 3: Origin (S3 Bucket)**

- **Location**: AWS S3 bucket (single region)
- **Speed**: 100-300ms (from origin region)
- **Capacity**: Unlimited
- **Control**: Always fresh, source of truth

### How Layers Work Together

**Request Flow:**

```
User Request
    ↓
┌─────────────────┐
│ Browser Cache   │ ← Layer 1: Check local cache
└────────┬────────┘
         │ (miss)
         ↓
┌─────────────────┐
│ CloudFront Edge │ ← Layer 2: Check edge cache
└────────┬────────┘
         │ (miss)
         ↓
┌─────────────────┐
│ Origin S3       │ ← Layer 3: Fetch from source
└─────────────────┘
```

**Response Flow:**

```
Origin S3
    ↓ (cached)
CloudFront Edge
    ↓ (cached)
Browser Cache
    ↓ (served)
User
```

### When Each Layer Is Used

**Scenario 1: First-Time User Visit**

```
User Request → Browser Cache (MISS)
            → CloudFront Edge (MISS)
            → Origin S3 (HIT)
            → Response flows back:
               Origin → CloudFront (cached at edge)
               CloudFront → Browser (cached locally)
               Browser → User (displayed)

Time: ~200ms total
Data Transfer: Full content (1MB HTML + 4MB images)
Cost: CloudFront data transfer charges apply
```

**Scenario 2: Same User, Same Session (Browser Cache Hit)**

```
User Request → Browser Cache (HIT - still fresh)
            → Serve instantly

Time: <1ms
Data Transfer: 0 bytes (from browser cache)
CloudFront: Not contacted
Origin: Not contacted
Cost: $0.00 (no AWS charges)
```

**Scenario 3: Same User, Hours Later (Browser Expired, CloudFront Fresh)**

```
User Request → Browser Cache (EXPIRED - but has ETag)
            → CloudFront Edge (HIT - still fresh)
            → CloudFront validates with browser:
               Browser: "If-None-Match: abc123"
               CloudFront: "ETag matches, 304 Not Modified"
            → Browser updates cache timestamp
            → Serve from browser cache

Time: ~20ms (CloudFront validation)
Data Transfer: ~200 bytes (304 headers only)
Origin: Not contacted
Cost: Minimal (request charges only, no data transfer)
```

**Scenario 4: Different User, Same Region (CloudFront Cache Hit)**

```
User Request → Browser Cache (MISS - new user)
            → CloudFront Edge (HIT - from previous user)
            → Serve from CloudFront

Time: ~20ms (from edge location)
Data Transfer: Full content (1MB HTML + 4MB images)
Origin: Not contacted
Cost: CloudFront data transfer charges apply
```

**Scenario 5: Content Updated, Cache Invalidated**

```
Admin Updates HTML → Invalidate CloudFront cache
                  → Upload new HTML to S3

User Request → Browser Cache (HIT - old version, may show stale)
            → CloudFront Edge (MISS - invalidated)
            → Origin S3 (HIT - new version)
            → CloudFront caches new version
            → User gets new content

Time: ~200ms (origin fetch)
Data Transfer: Full new content
Note: Browser may still show old content until its cache expires or is cleared
```

### Optimal Configuration for Each Layer

**Layer 1: Browser Cache Configuration**

**Images (Immutable, Long Cache):**

```python
s3_client.put_object(
    Key="images/salon-photo-abc123.jpg",  # Hash-based filename
    Body=image_data,
    CacheControl="public, max-age=31536000, immutable"
    # Tells browser:
    # - Cache for 1 year
    # - Never check if updated (this exact file never changes)
    # - Zero validation overhead
)
```

**HTML (Shorter Cache, with Validation):**

```python
s3_client.put_object(
    Key="external/{company_name}/index.html",
    Body=html_content,
    CacheControl="public, max-age=3600"  # 1 hour
    # ETag automatically set by S3/CloudFront
    # Browser will validate with ETag after expiration
)
```

**Layer 2: CloudFront Edge Cache Configuration**

CloudFront automatically respects your `Cache-Control` headers. Configure cache behaviors in CloudFront distribution:

```yaml
# CloudFront Distribution Configuration
CacheBehaviors:
  # Images: Long cache, immutable
  - PathPattern: "*.jpg"
    CachePolicyId: "cache-policy-images"
    # Respects: max-age=31536000, immutable

  # HTML: Shorter cache, invalidate on updates
  - PathPattern: "*.html"
    CachePolicyId: "cache-policy-html"
    # Respects: max-age=3600
    # Can be invalidated manually
```

**Layer 3: Origin S3 Configuration**

No special configuration needed - always serves fresh content:

- Served only when Layer 1 and 2 miss
- Set proper `Cache-Control` headers for downstream layers
- Use ETags for efficient validation

### Why Layering Is Effective

**1. Minimizes Origin Load**

- **Browser cache**: 90%+ of requests never leave browser
- **CloudFront cache**: 95%+ of remaining requests never reach origin
- **Origin**: Only handles <1% of total requests
- **Result**: Minimal origin costs, reduced load

**2. Reduces Latency**

- **Browser cache**: <1ms (instant)
- **CloudFront**: 10-50ms (from nearest edge location)
- **Origin**: 100-300ms (cross-region fetch)
- **Result**: Users experience fast page loads

**3. Reduces Data Transfer Costs**

- **Browser cache**: 0 bytes (user already has it)
- **CloudFront**: Full content (but cached, shared across users)
- **Origin**: Only on cache misses
- **Result**: Dramatic cost reduction

**4. Geographic Distribution**

- CloudFront caches at edge locations worldwide
- Users in Tokyo get content from Tokyo edge (not US origin)
- 10x faster than origin fetch
- **Result**: Consistent performance globally

### Real-World Impact Example

**Scenario: 1000 users, 10,000 visits/month**

**Without Layering (Direct to Origin):**

```
10,000 requests → 10,000 origin fetches
Average latency: 200ms
Total data: 10,000 × 5MB = 50,000MB = 50GB
Cost: 50GB × $0.085/GB = $4.25/month
```

**With Layering (Optimized):**

```
10,000 requests:
  - 9,000 browser cache hits (0ms, 0 bytes) = $0.00
  - 900 CloudFront cache hits (20ms, 4.5GB) = $0.38
  - 100 origin fetches (200ms, 500MB) = $0.04

Total data: 5GB
Cost: 5GB × $0.085/GB = $0.43/month
Average latency: 2ms (weighted average)

Savings: 90% cost reduction, 100x faster
```

### Automatic vs Manual Configuration

**Automatic (CloudFront Handles):**

- Edge location selection (routes to nearest edge)
- Cache storage at edge locations
- Request routing (checks cache, fetches if miss)
- ETag/Last-Modified handling (automatic validation)
- Geographic distribution (caches at all edge locations)

**You Configure:**

- `Cache-Control` headers when uploading files
- CloudFront cache behaviors (one-time setup)
- Cache invalidation when content changes

**Setup Required:**

**1. Set Cache-Control Headers (When Uploading):**

```python
# Images
s3_client.put_object(
    Key=f"images/{hashed_filename}.jpg",
    Body=image_data,
    CacheControl="public, max-age=31536000, immutable"
)

# HTML
s3_client.put_object(
    Key=f"external/{company_name}/index.html",
    Body=html_content,
    CacheControl="public, max-age=3600"
)
```

**2. Configure CloudFront Distribution (One-Time Setup):**

```yaml
# In CloudFront distribution configuration
Origins:
  - Id: S3Origin
    DomainName: bucket.s3.amazonaws.com

CacheBehaviors:
  - PathPattern: "*.jpg"
    TargetOriginId: S3Origin
    ForwardedValues:
      QueryString: false
    MinTTL: 0
    DefaultTTL: 31536000 # Respects origin Cache-Control
    MaxTTL: 31536000

  - PathPattern: "*.html"
    TargetOriginId: S3Origin
    ForwardedValues:
      QueryString: false
    MinTTL: 0
    DefaultTTL: 3600 # Respects origin Cache-Control
    MaxTTL: 86400
```

**3. Cache Invalidation (When Content Changes):**

```python
# Only invalidate HTML (images never need invalidation)
cloudfront_client.create_invalidation(
    DistributionId=distribution_id,
    Paths=["/external/{company_name}/index.html"]
)
```

### Summary: Layer Usage

**Browser Cache:**

- Used: Same user, same session, or recent visit
- Speed: Instant (<1ms)
- Best for: Repeat visitors, same-day returns
- Cost: $0.00 (no AWS charges)

**CloudFront:**

- Used: Browser cache miss, but another user requested recently
- Speed: Very fast (10-50ms)
- Best for: Popular content, geographic distribution
- Cost: Data transfer charges apply

**Origin:**

- Used: Both caches miss (new content, cache expired/invalidated)
- Speed: Slower (100-300ms)
- Best for: Initial cache population, updates, rare content
- Cost: Data transfer charges apply

**Key Takeaway:** Maximize hits at Layer 1 (browser), then Layer 2 (CloudFront), minimizing Layer 3 (origin) usage. Set proper `Cache-Control` headers, and CloudFront handles the rest automatically.

---

## Security Considerations

1. **Domain Validation**
   - Verify domain ownership before creating records
   - Validate custom domain format
   - Prevent domain hijacking

2. **SSL Certificate Management**
   - Automatic certificate renewal
   - Certificate expiration monitoring
   - Alerts for expiring certificates

3. **Access Control**
   - IAM roles with least privilege
   - CloudFront signed URLs (if needed)
   - S3 bucket policies for origin access

4. **Rate Limiting**
   - CloudFront rate limiting
   - WAF rules for DDoS protection
   - Origin request throttling

---

## Alternative: CloudFront Functions (Simpler, Cheaper)

If domain → company_name mapping is simple, use CloudFront Functions instead of Lambda@Edge:

**Pros**:

- Lower cost ($0.10 per million invocations vs $0.60)
- Lower latency (sub-millisecond)
- Simpler deployment

**Cons**:

- Limited execution time (1ms)
- Limited functionality (no external API calls)
- Requires domain mapping in function code or request headers

**Use Case**: If using subdomains with predictable pattern (e.g., `{company}.getpagoda.site`)

---

## Migration Strategy

1. **Phase 1**: Deploy infrastructure alongside existing S3 website
2. **Phase 2**: Test with one salon's custom domain
3. **Phase 3**: Gradual rollout to more salons
4. **Phase 4**: Monitor and optimize
5. **Phase 5**: Deprecate S3 website endpoints (optional)

---

## Monitoring & Observability

1. **CloudWatch Metrics**
   - CloudFront distribution metrics
   - Lambda@Edge execution metrics
   - Route 53 health check metrics

2. **CloudWatch Logs**
   - Lambda@Edge function logs
   - Deploy Lambda logs
   - CloudFront access logs

3. **Alarms**
   - Failed domain deployments
   - SSL certificate expiration
   - CloudFront error rates
   - Lambda@Edge error rates

---

## Questions to Resolve

1. **Domain Ownership**: Will salons provide their own domains, or use subdomains under your domain?
2. **Scale**: How many salons will need custom domains? (affects distribution strategy)
3. **Custom Domain Format**: What format will custom URLs take? (e.g., `salon.getpagoda.site` vs `mysalon.com`)
4. **SSL Certificate Strategy**: Wildcard or individual certificates?
5. **Cache Invalidation**: How often will sites be updated? (affects cache strategy)
6. **Budget**: What's the acceptable monthly cost for this feature?
7. **Deployment Time**: Can we accept 15-30 minute delays for CloudFront distribution updates?

---

## Next Steps

1. **Decision**: Choose Option 1 (single distribution) or Option 2 (multiple distributions)
2. **Proof of Concept**: Implement for one salon
3. **Database Schema**: Create migration scripts
4. **Infrastructure**: Set up CloudFront distribution and Route 53
5. **Code Implementation**: Update deploy Lambda and create Lambda@Edge
6. **Testing**: Comprehensive testing with multiple domains
7. **Documentation**: Update deployment guides
8. **Monitoring**: Set up CloudWatch dashboards and alarms
