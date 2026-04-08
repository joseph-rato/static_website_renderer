# Deploy Lambda Handler - Execution Flow Summary

## Overview

The `lambda_handler` function in `deploy/lambda_handler.py` handles static website deployment requests. It processes HTML content from an internal S3 preview location and deploys it to an external S3 location for public access.

## Execution Flow

### 1. Request Validation & Initialization

- Creates a `ProxyRequest` instance from the API Gateway event
- Validates the request origin
- Logs environment configuration (ENVIRONMENT, StaticWebS3BucketName, StaticWebS3Region)

### 2. Parameter Extraction

- Extracts `salon_id` from path parameters (`event.pathParameters.salon_id`)
- Validates that `salon_id` is present, raises `BadRequestError` if missing
- Extracts `custom_url` from request body via `__extract_custom_url_from_request()`
  - Validates that `custom_url` is present in request body
  - Raises `BadRequestError` if missing

### 3. Company Information Retrieval

- Calls `__get_company_info_by_salon_id(salon_id)` to fetch company data
  - Uses `DatabaseConnection` to establish database connection
  - Queries `StaticWebGeneratorRepository.get_company_data()` to retrieve company information
  - Returns company data dictionary (includes `company_name`)

### 4. HTML Content Retrieval

- Calls `__fetch_html_content(company_name)` to retrieve HTML from S3
  - Constructs S3 location path: `internal/{company_name}/index.html`
  - Uses `StaticWebS3Client` to fetch HTML content from internal preview folder
  - Validates HTML content exists, raises `NotFoundError` if missing
  - Returns tuple: `(html_content, source_bucket)`

### 5. Website Deployment

- Calls `__copy_internal_to_external(company_name)` to deploy website
  - Uses `StaticWebS3Client.copy_internal_to_external()` to copy files from internal to external S3 folder
  - Validates copy operation success, raises `NotFoundError` if failed
  - Returns boolean indicating success

### 6. Response Generation

- If deployment successful (`copy_success` and `bucket_config_success` both True):
  - Creates `StaticWebS3Client` instance with source bucket and region
  - Generates website endpoint URL via `get_website_endpoint_url(company_name)`
  - Generates custom domain URL via `get_custom_domain_url(custom_url, company_name)`
  - Returns 200 response with:
    - Success message
    - Company name
    - HTML content size
    - Custom domain URL
    - S3 bucket website URL
    - Deployment status

### 7. Error Handling

- `BadRequestError`: Returns 400 status with error message
- `NotFoundError`: Returns 404 status (handled by exception propagation)
- `BaseHttpError`: Returns appropriate HTTP status code
- General `Exception`: Returns 500 status with generic error message

## Helper Functions

### `__extract_custom_url_from_request(request)`

- Extracts `custom_url` from request body
- Validates presence, raises `BadRequestError` if missing

### `__get_company_info_by_salon_id(salon_id)`

- Database operation to retrieve company information
- Uses `StaticWebGeneratorRepository` to query company data
- Returns company information dictionary

### `__fetch_html_content(company_name)`

- S3 operation to fetch HTML from internal preview folder
- Returns HTML content and source bucket name

### `__copy_internal_to_external(company_name)`

- S3 operation to copy website files from internal to external location
- Enables public access to the deployed website

## Dependencies

- `ProxyRequest`: Request handling and response formatting
- `DatabaseConnection`: Database connection management
- `StaticWebGeneratorRepository`: Database repository for company data
- `StaticWebS3Client`: S3 operations for file storage and retrieval
- Environment variables: `ENVIRONMENT`, `StaticWebS3BucketName`, `StaticWebS3Region`

## Key S3 Operations

1. **Read**: Fetches HTML from `internal/{company_name}/index.html`
2. **Copy**: Copies all website files from `internal/{company_name}/` to `external/{company_name}/`
3. **URL Generation**: Generates both S3 website endpoint URL and custom domain URL for response
