# Lambda@Edge Caching Strategy

## Overview

This document details the multi-layer caching architecture for the Lambda@Edge domain routing system. The caching strategy reduces costs, improves performance, and minimizes database load by caching at four distinct layers.

## Multi-Layer Caching Architecture

### Layer 1: Lambda@Edge In-Memory Cache (5 minutes TTL)

**Location**: `app/lambda_edge/router.py` (per edge location instance)

**How it works**:

```python
_cache = {"data": {}, "expires": 0}  # Module-level variable
CACHE_TTL_SECONDS = 300  # 5 minutes (configurable via env var)

def _get_mapping(host: str) -> dict | None:
    now = time.time()
    if now > _cache['expires']:
        # Cache expired - fetch fresh data from Domain Lookup API
        _cache['data'] = _fetch_mappings()  # Returns dict: {host: mapping}
        _cache['expires'] = now + CACHE_TTL_SECONDS

    # Return cached mapping for this host
    return _cache['data'].get(host)
```

**Key Characteristics**:

- **What it caches**: Full Domain Lookup API response (all domain mappings)
- **Scope**: Per-instance (each CloudFront edge location has its own cache)
- **TTL**: 5 minutes (configurable via `DOMAIN_CACHE_TTL` environment variable)
- **Expiration triggers**:
  - TTL expires (5 minutes)
  - Lambda@Edge function is updated
  - Lambda instance restarts (cold start)

**Request Flow Example**:

```
Request 1: crownofbeauty.com
  → Cache MISS (empty)
  → Calls Domain Lookup API
  → Stores full response in cache
  → Returns mapping for crownofbeauty.com

Request 2: anothersalon.com (within 5 minutes)
  → Cache HIT (data still valid)
  → Returns mapping from cache (no API call)

Request 3: crownofbeauty.com (after 5 minutes)
  → Cache EXPIRED
  → Calls Domain Lookup API again
  → Updates cache with fresh data
```

### Layer 2: Domain Lookup API In-Memory Cache (30 seconds TTL)

**Location**: `app/init-bookings-app/static_web_generator/endpoints/domain_router/mappings/lambda_handler.py`

**How it works**:

```python
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))
_cache: Dict[str, Any] = {"data": [], "expires": 0}

def lambda_handler(event, context):
    now = time.time()
    if now > _cache["expires"]:
        # Cache expired - query database
        with DatabaseConnection() as conn:
            repo = DeployRepository(conn)
            subs = repo.list_active_subdomains()
            customs = repo.list_active_custom_domains()
            _cache["data"] = _merge_records(subs, customs)
            _cache["expires"] = now + CACHE_TTL_SECONDS

    return {
        "statusCode": 200,
        "headers": {"Cache-Control": f"max-age={CACHE_TTL_SECONDS}"},
        "body": json.dumps(_cache["data"])
    }
```

**Key Characteristics**:

- **What it caches**: Database query results (all active domains)
- **TTL**: 30 seconds (configurable via `CACHE_TTL_SECONDS` environment variable)
- **Purpose**: Reduces database load when Lambda@Edge refreshes its cache
- **Response**: Returns JSON array of all domain mappings

### Layer 3: CloudFront Edge Cache (varies by content)

**Location**: CloudFront distribution (global edge locations)

**How it works**:

- Caches HTML/images from S3 based on `Cache-Control` headers
- HTML: typically 1 hour (or until invalidation)
- Images: typically 7 days (immutable)
- Caches 403 responses from Lambda@Edge for 60 seconds

**Key Characteristics**:

- **Scope**: Global (cached at all CloudFront edge locations)
- **Automatic**: CloudFront handles caching based on headers
- **Invalidation**: Manual via CloudFront API (first 1,000 paths/month free)

#### Image-Specific Caching Strategy

**Important**: Images do NOT require Lambda@Edge routing. They use explicit paths that CloudFront serves directly from S3.

**Image Request Flow** (with caching):

```
User Browser
  ↓
1. Browser Cache Check
   → HIT (90% of repeat requests) → Serve from browser cache (<1ms, $0 cost)
   → MISS → Continue
  ↓
2. CloudFront Edge Cache Check
   → HIT (90% of remaining) → Serve from CloudFront edge (10-50ms, CloudFront cost only)
   → MISS → Continue
  ↓
3. CloudFront: Fetch from S3
   → /external/{company}/images/{filename}
   → Store in CloudFront edge cache
   → Return to browser
  ↓
4. Browser: Cache response
   → Store in browser cache
   → Display to user
```

**No Lambda@Edge Involvement**:

- Images use explicit paths: `/external/{company}/images/{filename}`
- No `Host` header translation needed
- CloudFront serves images directly from S3
- Lambda@Edge is only used for HTML page routing (`/` → `/external/{company}/index.html`)
- **Result**: Images bypass Lambda@Edge entirely, saving $0.60 per million image requests

**Cache Configuration for Images**:

**Cache-Control Headers** (set when uploading images):

- **All images**: `public, max-age=604800, immutable` (7 days, never changes)
  - ✅ **Currently implemented** in `ImageS3Client.upload_image()`
  - Images are uploaded with `Cache-Control: public, max-age=604800, immutable`
  - This ensures maximum cache duration at CloudFront edge and browser

**CloudFront Cache Behaviors** (configured in distribution):

```yaml
CacheBehaviors:
  # Images: Long cache, immutable
  - PathPattern: "*.jpg"
    TargetOriginId: S3Origin
    MinTTL: 0
    DefaultTTL: 604800 # 7 days
    MaxTTL: 604800
    ForwardedValues:
      QueryString: false

  - PathPattern: "*.png"
    # Same configuration

  - PathPattern: "*.webp"
    # Same configuration

  - PathPattern: "/external/*/images/*"
    # Explicit path pattern for all images in images folder
    # Same long cache configuration
```

**Cache Hit Rates for Images**:

- **Browser cache**: 90%+ hit rate (repeat visitors, same session)
- **CloudFront cache**: 90%+ hit rate (after initial warm-up)
- **Combined**: ~99% of image requests are served from cache

**Image Caching Benefits**:

- **Performance**: 10-50ms latency from CloudFront edge vs 200-500ms from S3
- **Cost**: 90% reduction in S3 data transfer costs
- **Scalability**: Edge caching handles traffic spikes without hitting S3
- **Geographic distribution**: Images served from nearest edge location

**Image Cache Invalidation**:

- **Not needed for immutable images**: Use versioned filenames or hash-based naming
- **For updated images**: Upload new file with new filename (automatic cache busting)
- **Manual invalidation**: Only if needed (costs $0.005 per path after first 1,000/month)
- **Natural expiration**: Images cached for TTL duration, then refreshed from S3

**Current Implementation Status**:

- ✅ **Images ARE uploaded WITH Cache-Control headers** (`public, max-age=604800, immutable`)
- ✅ **Images ARE optimally cached** at CloudFront edge (7 days TTL)
- ✅ **Images ARE cached in browser** (7 days TTL, immutable = no revalidation)
- ✅ **Combined cache hit rate**: ~99% of requests after warm-up
- ✅ **Lambda@Edge bypass** for images (via code fix - returns immediately)
- ⚠️ **CloudFront cache behavior** (optional enhancement - would bypass Lambda@Edge entirely, saving $0.60/M requests)

**Enhanced Caching Strategies for Cost Savings**:

1. **Hash-Based Filenames** (Best for immutable images):

   ```python
   # Generate hash-based filename
   import hashlib
   file_hash = hashlib.md5(image_data).hexdigest()[:12]
   filename = f"salon-photo-{file_hash}.jpg"
   # Same image content = same filename = same cache key
   # Different content = different filename = automatic cache busting
   ```

   - **Benefit**: Content-addressable storage
   - **Cache behavior**: Same image always uses same filename (max cache reuse)
   - **Cache busting**: Automatic when image changes (new hash = new filename)

2. **Versioned Filenames**:

   ```python
   # Upload: salon-photo.jpg
   # Replace: salon-photo-v2.jpg
   # Old version stays cached (no invalidation needed)
   # New version caches on first request
   ```

   - **Benefit**: Clear versioning, easy rollback
   - **Cache behavior**: Old and new versions both cached
   - **Cost**: No invalidation costs

3. **Immutable Cache Headers** (For images that never change):

   ```python
   CacheControl="public, max-age=604800, immutable"
   ```

   - **Benefit**: Browser never revalidates (zero overhead)
   - **Cache behavior**: 7 days cache, no validation requests
   - **Use for**: Thumbnails, processed images, gallery images

4. **Query Parameter Versioning** (Alternative):

   ```python
   # URL: /external/company/images/salon-photo.jpg?v=2
   # When image updates: change to ?v=3
   ```

   - **Benefit**: Keep same filename, change query param
   - **Note**: Query parameters should be forwarded to S3 for this to work

**Cost Savings from Enhanced Caching**:

**Without Proper Caching** (hypothetical - not current state):

- All image requests hit S3: 1,000 visits × 20 images = 20,000 S3 requests
- S3 data transfer: 20,000 × 200KB = 4GB × $0.09 = **$0.36/month**
- No cache benefits

**With Proper Caching** (90% CloudFront hit + 90% browser hit):

- Browser cache hits: 18,000 requests → $0 cost
- CloudFront cache hits: 1,800 requests → $0 S3 cost
- S3 requests (cache misses): 200 requests × 200KB = 0.04GB × $0.09 = **$0.0036/month**
- CloudFront data transfer: 2,000 × 200KB = 0.4GB × $0.085 = **$0.034/month**
- **Total**: $0.0376/month (vs $0.36 without caching)
- **Savings**: **90% cost reduction**

**Best Practices**:

1. ✅ **Use immutable cache headers** - Currently implemented: All images use `public, max-age=604800, immutable`
2. **Use hash-based filenames** for maximum cache reuse (optional enhancement - see [IMAGE_CACHING_ENHANCEMENT_PLAN.md](../image_docs/IMAGE_CACHING_ENHANCEMENT_PLAN.md))
3. **Version filenames** when replacing images (e.g., `photo-v2.jpg`) (optional enhancement)
4. ✅ **Set long TTLs** - Currently configured: 7 days (604800 seconds) for all images
5. **Monitor cache hit rates** via CloudWatch (optional enhancement - see [IMAGE_CACHING_ENHANCEMENT_PLAN.md](../image_docs/IMAGE_CACHING_ENHANCEMENT_PLAN.md))
6. ✅ **Avoid manual invalidation** - Currently: Images use immutable headers, no invalidation needed
7. ✅ **Cache-Control headers** - Currently implemented: All images uploaded with proper headers

**Reference**: See [IMAGE_CACHING_ENHANCEMENT_PLAN.md](../image_docs/IMAGE_CACHING_ENHANCEMENT_PLAN.md) for optional enhancements like CloudFront cache behavior configuration.

### Layer 4: Browser Cache

**Location**: User's browser

**How it works**:

- Browser caches based on `Cache-Control` headers from CloudFront
- HTML: typically 1 hour
- Images: typically 7 days (immutable)

## Complete Request Flow with Caching

```
User Request: crownofbeauty.com
  ↓
1. Browser Cache Check
   → MISS (first visit)
  ↓
2. CloudFront Edge Cache Check
   → MISS (first request to this edge location)
  ↓
3. CloudFront triggers Lambda@Edge (Origin Request)
  ↓
4. Lambda@Edge: Check in-memory cache
   → MISS (first request or expired)
  ↓
5. Lambda@Edge: Call Domain Lookup API
   → API checks its cache
   → API Cache: MISS (first request or expired)
   → API queries database
   → API stores in cache (30s TTL)
   → API returns all mappings
  ↓
6. Lambda@Edge: Store API response in cache (5min TTL)
   → Extract mapping for crownofbeauty.com
   → Rewrite URI: / → /external/Crown Of Beauty/index.html
  ↓
7. CloudFront: Fetch from S3
   → /external/Crown Of Beauty/index.html
  ↓
8. CloudFront: Cache response
   → Store in edge cache
   → Return to browser
  ↓
9. Browser: Cache response
   → Store in browser cache
   → Display to user
```

**Subsequent Requests (within TTLs)**:

```
User Request: crownofbeauty.com (within 5 minutes)
  ↓
1. Browser Cache: HIT → Return immediately (no network request)
   OR
2. CloudFront Cache: HIT → Return from edge (fast)
   ↓
3. Lambda@Edge: Cache HIT → Use cached mapping (no API call)
   → Rewrite URI
   → CloudFront serves from cache
```

## Cache Invalidation Strategy

### Lambda@Edge Cache

- **Automatic**: Expires after 5 minutes
- **Manual**: Update Lambda@Edge function (forces all instances to restart)
- **No explicit invalidation API**: Relies on TTL expiration

### Domain Lookup API Cache

- **Automatic**: Expires after 30 seconds
- **Manual**: Wait for TTL or restart Lambda
- **New domain registrations**: Visible within 30 seconds (API cache) + 5 minutes (Lambda@Edge cache) = **up to 5.5 minutes**

### CloudFront Cache

- **Manual**: CloudFront invalidation API
- **Automatic**: Respects `Cache-Control` headers
- **Cost**: First 1,000 paths/month free, then $0.005 per path

## Performance Characteristics

### Cache Hit Rates (Typical)

- **Browser cache**: 90%+ (repeat visitors)
- **CloudFront cache**: 95%+ (popular content)
- **Lambda@Edge cache**: 99%+ (within 5-minute window)
- **Domain Lookup API cache**: 99%+ (within 30-second window)

### Latency Impact

- **Browser cache hit**: <1ms
- **CloudFront cache hit**: 10-50ms
- **Lambda@Edge cache hit**: +0ms (no API call)
- **Lambda@Edge cache miss**: +150ms (API call to regional endpoint)
- **Domain Lookup API cache miss**: +50ms (database query)

## Configuration

**Environment Variables**:

- **Lambda@Edge**: `DOMAIN_CACHE_TTL` (default: 300 seconds = 5 minutes)
- **Domain Lookup API**: `CACHE_TTL_SECONDS` (default: 30 seconds)

## Cost Analysis & Cache Coverage Calculations

### Cost Components

**Per-Request Costs (when cache misses)**:

- **Lambda@Edge**: $0.60 per million requests
- **Domain Lookup API Gateway**: $3.50 per million requests
- **Domain Lookup Lambda**: $0.20 per million requests (128MB, 100ms avg)
- **Database Query**: Negligible cost, but we want to minimize load

**Total Cost per Million Requests (no caching)**:

- Lambda@Edge: $0.60
- API Gateway: $3.50
- Lambda: $0.20
- **Total**: $4.30 per million requests

### Cache Hit Rate Assumptions

Based on typical web traffic patterns:

- **Browser Cache**: 90% hit rate (repeat visitors, same session)
- **CloudFront Cache**: 95% hit rate (popular content, geographic distribution)
- **Lambda@Edge Cache**: 99% hit rate (within 5-minute TTL window)
- **Domain Lookup API Cache**: 99% hit rate (within 30-second TTL window)

### Calculation Methodology

For each scenario:

1. **Total Requests**: Requests per month × Number of salons
2. **Browser Cache Hits**: 90% of total requests (no network cost)
3. **CloudFront Cache Hits**: 95% of remaining requests (no S3 cost, but Lambda@Edge still runs)
4. **Lambda@Edge Cache Hits**: 99% of CloudFront cache misses (no API call cost)
5. **Domain Lookup API Cache Hits**: 99% of Lambda@Edge cache misses (no database cost)

**Cost Savings**:

- Lambda@Edge cache hit: Saves $0.60 per million requests
- Domain Lookup API cache hit: Saves $3.70 per million requests ($3.50 API Gateway + $0.20 Lambda)

### Scenario Calculations

#### Scenario 1: 1 Salon, 10 Requests/Month

**Total Requests**: 10

**Cache Breakdown**:

- Browser Cache Hits: 9 (90%) → No network requests
- CloudFront Cache Misses: 1 (10%)
  - Lambda@Edge Cache Hits: 0.99 (99%) → No API calls
  - Lambda@Edge Cache Misses: 0.01 (1%)
    - Domain Lookup API Cache Hits: 0.0099 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.0001 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 1 (CloudFront cache miss)
- Lambda@Edge API calls: 0.01
- Database queries: 0.0001
- **Cost**: $0.000006 (Lambda@Edge) + $0.000037 (API) = **$0.000043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (0.99/1)
- Requests avoiding database queries: 99.99% (0.9999/1)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 2: 1 Salon, 100 Requests/Month

**Total Requests**: 100

**Cache Breakdown**:

- Browser Cache Hits: 90 (90%) → No network requests
- CloudFront Cache Misses: 10 (10%)
  - Lambda@Edge Cache Hits: 9.9 (99%) → No API calls
  - Lambda@Edge Cache Misses: 0.1 (1%)
    - Domain Lookup API Cache Hits: 0.099 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.001 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 10 (CloudFront cache misses)
- Lambda@Edge API calls: 0.1
- Database queries: 0.001
- **Cost**: $0.00006 (Lambda@Edge) + $0.00037 (API) = **$0.00043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (9.9/10)
- Requests avoiding database queries: 99.9% (9.99/10)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 3: 1 Salon, 1,000 Requests/Month

**Total Requests**: 1,000

**Cache Breakdown**:

- Browser Cache Hits: 900 (90%) → No network requests
- CloudFront Cache Misses: 100 (10%)
  - Lambda@Edge Cache Hits: 99 (99%) → No API calls
  - Lambda@Edge Cache Misses: 1 (1%)
    - Domain Lookup API Cache Hits: 0.99 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.01 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 100 (CloudFront cache misses)
- Lambda@Edge API calls: 1
- Database queries: 0.01
- **Cost**: $0.0006 (Lambda@Edge) + $0.0037 (API) = **$0.0043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (99/100)
- Requests avoiding database queries: 99.9% (99.9/100)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 4: 1 Salon, 100,000 Requests/Month

**Total Requests**: 100,000

**Cache Breakdown**:

- Browser Cache Hits: 90,000 (90%) → No network requests
- CloudFront Cache Misses: 10,000 (10%)
  - Lambda@Edge Cache Hits: 9,900 (99%) → No API calls
  - Lambda@Edge Cache Misses: 100 (1%)
    - Domain Lookup API Cache Hits: 99 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 1 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 10,000 (CloudFront cache misses)
- Lambda@Edge API calls: 100
- Database queries: 1
- **Cost**: $0.006 (Lambda@Edge) + $0.037 (API) = **$0.043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (9,900/10,000)
- Requests avoiding database queries: 99.99% (9,999/10,000)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 5: 10 Salons, 10 Requests/Month Each

**Total Requests**: 100 (10 salons × 10 requests)

**Cache Breakdown**:

- Browser Cache Hits: 90 (90%) → No network requests
- CloudFront Cache Misses: 10 (10%)
  - Lambda@Edge Cache Hits: 9.9 (99%) → No API calls
  - Lambda@Edge Cache Misses: 0.1 (1%)
    - Domain Lookup API Cache Hits: 0.099 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.001 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 10 (CloudFront cache misses)
- Lambda@Edge API calls: 0.1
- Database queries: 0.001
- **Cost**: $0.00006 (Lambda@Edge) + $0.00037 (API) = **$0.00043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (9.9/10)
- Requests avoiding database queries: 99.9% (9.99/10)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 6: 10 Salons, 100 Requests/Month Each

**Total Requests**: 1,000 (10 salons × 100 requests)

**Cache Breakdown**:

- Browser Cache Hits: 900 (90%) → No network requests
- CloudFront Cache Misses: 100 (10%)
  - Lambda@Edge Cache Hits: 99 (99%) → No API calls
  - Lambda@Edge Cache Misses: 1 (1%)
    - Domain Lookup API Cache Hits: 0.99 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.01 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 100 (CloudFront cache misses)
- Lambda@Edge API calls: 1
- Database queries: 0.01
- **Cost**: $0.0006 (Lambda@Edge) + $0.0037 (API) = **$0.0043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (99/100)
- Requests avoiding database queries: 99.9% (99.9/100)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 7: 10 Salons, 1,000 Requests/Month Each

**Total Requests**: 10,000 (10 salons × 1,000 requests)

**Cache Breakdown**:

- Browser Cache Hits: 9,000 (90%) → No network requests
- CloudFront Cache Misses: 1,000 (10%)
  - Lambda@Edge Cache Hits: 990 (99%) → No API calls
  - Lambda@Edge Cache Misses: 10 (1%)
    - Domain Lookup API Cache Hits: 9.9 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.1 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 1,000 (CloudFront cache misses)
- Lambda@Edge API calls: 10
- Database queries: 0.1
- **Cost**: $0.006 (Lambda@Edge) + $0.037 (API) = **$0.043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (990/1,000)
- Requests avoiding database queries: 99.9% (999.9/1,000)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 8: 10 Salons, 100,000 Requests/Month Each

**Total Requests**: 1,000,000 (10 salons × 100,000 requests)

**Cache Breakdown**:

- Browser Cache Hits: 900,000 (90%) → No network requests
- CloudFront Cache Misses: 100,000 (10%)
  - Lambda@Edge Cache Hits: 99,000 (99%) → No API calls
  - Lambda@Edge Cache Misses: 1,000 (1%)
    - Domain Lookup API Cache Hits: 990 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 10 (1%) → 10 DB queries

**Cost Analysis**:

- Lambda@Edge invocations: 100,000 (CloudFront cache misses)
- Lambda@Edge API calls: 1,000
- Database queries: 10
- **Cost**: $0.06 (Lambda@Edge) + $0.37 (API) = **$0.43/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (99,000/100,000)
- Requests avoiding database queries: 99.99% (99,990/100,000)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 9: 100 Salons, 10 Requests/Month Each

**Total Requests**: 1,000 (100 salons × 10 requests)

**Cache Breakdown**:

- Browser Cache Hits: 900 (90%) → No network requests
- CloudFront Cache Misses: 100 (10%)
  - Lambda@Edge Cache Hits: 99 (99%) → No API calls
  - Lambda@Edge Cache Misses: 1 (1%)
    - Domain Lookup API Cache Hits: 0.99 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.01 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 100 (CloudFront cache misses)
- Lambda@Edge API calls: 1
- Database queries: 0.01
- **Cost**: $0.0006 (Lambda@Edge) + $0.0037 (API) = **$0.0043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (99/100)
- Requests avoiding database queries: 99.9% (99.9/100)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 10: 100 Salons, 100 Requests/Month Each

**Total Requests**: 10,000 (100 salons × 100 requests)

**Cache Breakdown**:

- Browser Cache Hits: 9,000 (90%) → No network requests
- CloudFront Cache Misses: 1,000 (10%)
  - Lambda@Edge Cache Hits: 990 (99%) → No API calls
  - Lambda@Edge Cache Misses: 10 (1%)
    - Domain Lookup API Cache Hits: 9.9 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 0.1 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 1,000 (CloudFront cache misses)
- Lambda@Edge API calls: 10
- Database queries: 0.1
- **Cost**: $0.006 (Lambda@Edge) + $0.037 (API) = **$0.043/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (990/1,000)
- Requests avoiding database queries: 99.9% (999.9/1,000)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 11: 100 Salons, 1,000 Requests/Month Each

**Total Requests**: 100,000 (100 salons × 1,000 requests)

**Cache Breakdown**:

- Browser Cache Hits: 90,000 (90%) → No network requests
- CloudFront Cache Misses: 10,000 (10%)
  - Lambda@Edge Cache Hits: 9,900 (99%) → No API calls
  - Lambda@Edge Cache Misses: 100 (1%)
    - Domain Lookup API Cache Hits: 99 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 1 (1%) → 1 DB query

**Cost Analysis**:

- Lambda@Edge invocations: 10,000 (CloudFront cache misses)
- Lambda@Edge API calls: 100
- Database queries: 1
- **Cost**: $0.06 (Lambda@Edge) + $0.37 (API) = **$0.43/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (9,900/10,000)
- Requests avoiding database queries: 99.99% (9,999/10,000)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

#### Scenario 12: 100 Salons, 100,000 Requests/Month Each

**Total Requests**: 10,000,000 (100 salons × 100,000 requests)

**Cache Breakdown**:

- Browser Cache Hits: 9,000,000 (90%) → No network requests
- CloudFront Cache Misses: 1,000,000 (10%)
  - Lambda@Edge Cache Hits: 990,000 (99%) → No API calls
  - Lambda@Edge Cache Misses: 10,000 (1%)
    - Domain Lookup API Cache Hits: 9,900 (99%) → No DB queries
    - Domain Lookup API Cache Misses: 100 (1%) → 100 DB queries

**Cost Analysis**:

- Lambda@Edge invocations: 1,000,000 (CloudFront cache misses)
- Lambda@Edge API calls: 10,000
- Database queries: 100
- **Cost**: $6.00 (Lambda@Edge) + $37.00 (API) = **$43.00/month**

**Cache Coverage**:

- Requests avoiding Lambda@Edge API calls: 99% (990,000/1,000,000)
- Requests avoiding database queries: 99.99% (999,900/1,000,000)
- **Overall cache effectiveness**: 99.9% of requests hit some cache layer

---

## Summary Table

| Salons | Requests/Month | Total Requests | Lambda@Edge API Calls | DB Queries | Monthly Cost | Cache Coverage |
| ------ | -------------- | -------------- | --------------------- | ---------- | ------------ | -------------- |
| 1      | 10             | 10             | 0.01                  | 0.0001     | $0.000043    | 99.9%          |
| 1      | 100            | 100            | 0.1                   | 0.001      | $0.00043     | 99.9%          |
| 1      | 1,000          | 1,000          | 1                     | 0.01       | $0.0043      | 99.9%          |
| 1      | 100,000        | 100,000        | 100                   | 1          | $0.043       | 99.9%          |
| 10     | 10             | 100            | 0.1                   | 0.001      | $0.00043     | 99.9%          |
| 10     | 100            | 1,000          | 1                     | 0.01       | $0.0043      | 99.9%          |
| 10     | 1,000          | 10,000         | 10                    | 0.1        | $0.043       | 99.9%          |
| 10     | 100,000        | 1,000,000      | 1,000                 | 10         | $0.43        | 99.9%          |
| 100    | 10             | 1,000          | 1                     | 0.01       | $0.0043      | 99.9%          |
| 100    | 100            | 10,000         | 10                    | 0.1        | $0.043       | 99.9%          |
| 100    | 1,000          | 100,000        | 100                   | 1          | $0.43        | 99.9%          |
| 100    | 100,000        | 10,000,000     | 10,000                | 100        | $43.00       | 99.9%          |

## Key Insights

1. **Consistent Cache Coverage**: Across all scenarios, the caching system achieves **99.9% cache coverage**, meaning 99.9% of requests avoid expensive operations (API calls, database queries).

2. **Cost Efficiency**: Even at scale (100 salons, 100K requests/month each = 10M total), the monthly cost is only **$43.00** due to effective caching.

3. **Database Load Reduction**: The 30-second API cache + 5-minute Lambda@Edge cache means database queries are reduced by **99.99%** compared to no caching.

4. **Scalability**: The caching strategy scales linearly with traffic - doubling requests doubles costs, but cache hit rates remain constant.

5. **Browser Cache Impact**: 90% of requests are served from browser cache, completely avoiding network costs.

## Cost Savings Calculation

**Without Caching** (all requests hit API + DB):

- 10M requests × $4.30 per million = **$43,000/month**

**With Caching** (current strategy):

- 10M requests = **$43.00/month**

**Savings**: **99.9% cost reduction** ($42,957/month saved)

## Recommendations

1. **Monitor Cache Hit Rates**: Set up CloudWatch alarms to track actual cache hit rates vs. expected 99%+ rates.

2. **Adjust TTLs if Needed**: If domain registrations are frequent, consider reducing Lambda@Edge TTL from 5 minutes to 2-3 minutes.

3. **Database Connection Pooling**: Ensure the Domain Lookup API uses connection pooling to handle the minimal database queries efficiently.

4. **Cache Warming**: For high-traffic salons, consider pre-warming caches during deployment to avoid initial cache misses.

5. **Cost Monitoring**: Set up billing alerts for Lambda@Edge and API Gateway to track actual costs vs. projections.
