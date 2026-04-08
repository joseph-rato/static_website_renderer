# Deploy Status Endpoint Execution Plan

## Goal & Outcome

- Provide a polling endpoint that surfaces DNS / CloudFront / ACM certificate progress for a salon’s custom domain.
- Support operations in checking whether a domain is active, pending validation, or failed, with actionable metadata (validation records, timestamps).

## Endpoint Details

- **Path**: `/static-web-generator/{salon_id}/deploy-status`
- **Method**: `GET`
- **Query Parameters (optional)**:
  - `custom_domain` – return status for a specific domain (default to newest domain if omitted).
- **Response (200)**:
  ```json
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
  ```
- **Error Cases**: `400` if `salon_id` missing, `404` if no domain config exists, `500` for AWS/unknown failures.

## Pre-Implementation Checklist

- [ ] Repository functions available:
  - `get_custom_domain_config(salon_id, custom_domain=None)` to fetch single row.
  - `update_domain_status(salon_id, custom_domain, status)` to mark active/failed.
- [ ] IAM policy for Lambda includes read-only access:
  - CloudFront: `GetDistribution`
  - ACM: `DescribeCertificate`
  - Route 53: `ListResourceRecordSets`
- [ ] Confirm domain configuration table stores `deployment_started_at`, `ssl_certificate_arn`, `cloudfront_distribution_id`, `hosted_zone_id`, `record_name`.

## High-Level Flow

1. **Bootstrap**
   - Initialize `ProxyRequest`, validate origin, extract `salon_id`.
   - Parse optional `custom_domain` query parameter.
2. **Fetch Configuration**
   - Lookup domain row (latest or matching `custom_domain`).
   - If absent, return `404` with helpful message.
3. **CloudFront Status**
   - Call `cloudfront.get_distribution(Id=distribution_id)`.
   - Capture `Status` (`Deployed`, `InProgress`, etc.) and distribution domain.
4. **ACM Status**
   - `acm.describe_certificate(CertificateArn=...)`.
   - Extract `Status` and `DomainValidationOptions.ResourceRecord` list for operations.
5. **Route 53 Status**
   - `route53.list_resource_record_sets` against `hosted_zone_id`, filter record by name.
   - Flag as `active` if record exists.
6. **Integrate Results**
   - Determine overall `status`:
     - `active` when CloudFront `Deployed` AND ACM `ISSUED`.
     - Otherwise use stored DB status (`pending/failed`).
   - Compute `estimated_completion` based on elapsed time since `deployment_started_at`.
7. **Persistence Update**
   - If overall status now `active`, call `update_domain_status` to mark row as active.
8. **Respond**
   - Return JSON containing all status fragments and `validation_records` (for manual DNS help).

## Detailed Implementation Steps

1. Create module `endpoints/deploy_status/lambda_handler.py` with logger (INFO level).
2. Helper functions:
   - `__get_custom_domain_config(salon_id, custom_domain=None)`
   - `__check_cloudfront_status(distribution_id)`
   - `__check_ssl_certificate_status(certificate_arn)`
   - `__check_dns_status(hosted_zone_id, record_name)`
   - `__calculate_estimated_completion(deployment_started_at, cloudfront_status, ssl_status)`
   - `__update_domain_status_if_complete(...)`
3. Use `datetime` for timestamp operations; ensure ISO 8601 formatting with trailing `Z`.
4. Map exceptions using `ProxyRequest.format_response` (400/404/500).
5. Add CloudFormation/SAM entry with method GET and relevant policies.

## Data Requirements

- `salon_custom_domains` needs columns:
  - `custom_domain`, `cloudfront_distribution_id`, `ssl_certificate_arn`, `hosted_zone_id`, `record_name`, `status`, `deployment_started_at` (ISO string), `updated_at`.

## Testing Strategy

- **Unit Tests**:
  - Domain absent -> 404.
  - CloudFront `Deployed`, ACM `ISSUED` -> response `status="active"`, DB status updated.
  - ACM pending validation -> response includes `validation_records`.
  - DNS record missing -> `dns_status="not_found"`.
- **Mock AWS** via `botocore.stubber`/moto for deterministic responses.
- **Integration**: Validate endpoint outputs align with real route53/acm states (in staging).

## Observability

- Log domain + distribution ID for each AWS call.
- Warn if ACM validation missing DNS records (helpful for ops).
- Future: expose CloudWatch metrics (`deploy_status_checks`, `domains_active`).

## Rollout Considerations

- Endpoint safe to deploy anytime; read-only operations.
- Ensure rate limits acceptable (CloudFront/ACM API quotas). Consider caching results if high frequency.
