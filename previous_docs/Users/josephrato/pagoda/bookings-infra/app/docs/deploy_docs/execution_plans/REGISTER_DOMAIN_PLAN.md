# Register Custom Domain Endpoint Execution Plan

## Goal & Outcome

- Provide a public (origin-validated) API endpoint that lets salons initiate custom domain registration.
- Handle all infrastructure tasks (ACM certificate request, CloudFront alias, Route 53 records) and persist configuration to Postgres.
- Return a consistent response structure with deployment status tracking metadata.

## Endpoint Details

- **Path**: `/static-web-generator/{salon_id}/register-domain`
- **Method**: `POST`
- **Request Body**:

  ```json
  {
    "custom_domain": "mysalon.com",
    "domain_type": "production"
  }
  ```

  - `custom_domain` is required; must be lower-case domain string.
  - `domain_type` optional (`production` default, `preview` supported for internal subdomains).

- **Response (200)**:
  ```json
  {
    "message": "Custom domain registration initiated",
    "custom_domain": "mysalon.com",
    "status": "pending",
    "estimated_completion": "15-30 minutes",
    "cloudfront_distribution_id": "E1234",
    "certificate_arn": "arn:aws:acm:...",
    "deployment_started_at": "2025-11-07T18:04:00Z"
  }
  ```
- **Error Cases**: `400` for missing/invalid fields, `404` for missing salon or content, `500` for AWS/unknown failure.

## Pre-Implementation Checklist

- [ ] Confirm `StaticWebGeneratorRepository` exposes helper methods or add stubs for:
  - `get_company_data(salon_id)`
  - `get_custom_domain_config(salon_id, custom_domain=None)`
  - `save_custom_domain_config(...)`
- [ ] Verify environment variables: `CloudFrontDistributionId`, `StaticWebS3BucketName`, `StaticWebS3Region`.
- [ ] Ensure IAM policy coverage for Lambda: CloudFront (`GetDistribution`, `UpdateDistribution`), ACM (`RequestCertificate`, `DescribeCertificate`), Route 53 (`ListHostedZonesByName`, `CreateHostedZone`, `ChangeResourceRecordSets`, `ListResourceRecordSets`).
- [ ] Align with existing `ProxyRequest` origin validation flow.

## High-Level Flow

1. **Bootstrap**
   - Instantiate `ProxyRequest`, validate origin.
   - Extract `salon_id` from path; raise `BadRequestError` if missing.
2. **Parse Request**
   - Pull JSON body via `ProxyRequest` for consistent parsing.
   - Validate `custom_domain`; ensure ASCII, lower-case, matches basic domain regex.
   - Default `domain_type` to `production`.
3. **Pre-flight Checks**
   - Use repository to fetch company info for `salon_id`; raise `NotFoundError` if missing.
   - Ensure preview/production HTML exists (`StaticWebS3Client.object_exists` or fallback to rebuild call later phase).
   - Query repository for existing domain config; short-circuit if already active/pending.
4. **AWS Operations**
   - **ACM**: `request_certificate` (DNS validation). Capture ARN.
   - **CloudFront**: `get_distribution_config`, append alias, update `ViewerCertificate` to new ARN, `update_distribution`.
   - **Route 53**:
     - Determine hosted zone (`list_hosted_zones_by_name` or `create_hosted_zone`).
     - Upsert A/AAAA alias record pointing to CloudFront domain.
   - Record DNS validation CNAME from ACM response (for status endpoint display).
5. **Persist Configuration**
   - Save row in `salon_custom_domains` with status `pending`, store distribution ID, certificate ARN, hosted zone ID, record name, domain type, timestamp.
6. **Respond**
   - Return standardized JSON with `status="pending"`, `estimated_completion`, and relevant IDs.

## Detailed Implementation Steps

1. Create endpoint module `endpoints/register_domain/lambda_handler.py`.
2. Copy logger setup pattern (INFO level) from other endpoints.
3. Implement helper functions:
   - `__extract_domain_from_request`
   - `__validate_domain_format`
   - `__get_company_info`
   - `__check_existing_domain`
   - `__ensure_website_content_exists`
   - `__request_ssl_certificate`
   - `__add_domain_to_cloudfront`
   - `__create_route53_record`
   - `__get_or_create_hosted_zone`
   - `__save_domain_configuration`
4. Handle structured exceptions and map to HTTP responses via `ProxyRequest.format_response`.
5. Update repository with needed CRUD methods (SQL for insert/select/update).
6. Add CloudFormation/SAM entry in `template.yaml` with correct policies and environment variables.

## Database Changes

- Table `salon_custom_domains` columns required:
  - `salon_id`, `custom_domain`, `company_name`, `domain_type`, `cloudfront_distribution_id`, `ssl_certificate_arn`, `hosted_zone_id`, `record_name`, `status`, timestamps.
- Ensure unique constraint on `custom_domain`.

## Testing Strategy

- **Unit** (pytest):
  - Valid input triggers AWS mocks and DB insert.
  - Existing active domain returns early.
  - Missing HTML triggers 400 recommendation.
  - AWS failures raise `BaseHttpError` -> 500 response.
- **Integration**: Use mocked AWS services (moto/localstack) to verify certificate request + distribution update.
- **Manual**: Deploy to dev, run via API Gateway console with sample domain.

## Observability

- INFO logs for each AWS step.
- Error logs containing domain + salon context.
- Recommended future enhancement: emit metrics (`register_domain.success/failure`).

## Rollout Considerations

- Feature flag optional; ensure idempotent behavior (repeated POSTs safe).
- Document necessary DNS validation steps for operations (CNAME records in response/status endpoint).
