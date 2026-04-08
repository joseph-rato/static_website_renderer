## Lambda@Edge Router

Routes CloudFront requests to the correct S3 prefix based on the `Host` header.
Fetches host → target mappings from the regional Domain Lookup API and caches
them for `DOMAIN_CACHE_TTL` seconds (default 300).

### Deployment

#### First-Time Deployment vs. Updates

**For first-time deployment** (function doesn't exist yet):

- Use `first-time-deploy.sh` - Creates IAM role and Lambda function, then runs regular deployment

**For subsequent deployments** (function already exists):

- Use `deploy.sh` - Updates existing function code and configuration

#### First-Time Deployment Guide

**Quick Start:**

```bash
cd app/lambda_edge
mkdir -p dist
zip dist/router.zip router.py
export DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"
export API_HOST="https://zk8yyxnk14.execute-api.us-east-1.amazonaws.com/Prod"
chmod +x first-time-deploy.sh
./first-time-deploy.sh dev
```

**What `first-time-deploy.sh` does:**

1. Creates IAM role (`pagoda-lambda-edge-execution-role`) if it doesn't exist
2. Creates Lambda function (`pagoda-edge-router-dev`) if it doesn't exist
3. Calls `deploy.sh` to complete the deployment

#### Regular Deployment Guide (Updates)

Follow these commands to update an existing Lambda@Edge function:

##### Step 1: Navigate to the Lambda@Edge directory

```bash
cd app/lambda_edge
```

##### Step 2: Create the distribution directory

```bash
mkdir -p dist
```

##### Step 3: Create the zip file

```bash
zip dist/router.zip router.py
```

##### Step 4: Set environment-specific variables

**For DEV environment:**

```bash
export DISTRIBUTION_ID="YOUR_DEV_DISTRIBUTION_ID"
export API_HOST="https://zk8yyxnk14.execute-api.us-east-1.amazonaws.com/Prod"
```

**Note:**

- Replace `YOUR_DEV_DISTRIBUTION_ID` with your actual CloudFront distribution ID. See instructions below on how to find it.
- The `API_HOST` is the Static Site Generator API Gateway URL. After deploying the Static Site Generator stack, you can get it from CloudFormation:
  ```bash
  aws cloudformation describe-stacks --stack-name booking-static-site-generator-stack-DEV \
    --query 'Stacks[0].Outputs[?OutputKey==`StaticSiteGeneratorApiUrl`].OutputValue' --output text
  ```

**For TEST environment:**

```bash
export DISTRIBUTION_ID="YOUR_TEST_DISTRIBUTION_ID"
export API_HOST="https://tvy9fm481c.execute-api.us-east-1.amazonaws.com/Prod"
export AWS_PROFILE="test"
```

**Note:** Replace `YOUR_TEST_DISTRIBUTION_ID` with your actual CloudFront distribution ID.

**For PROD environment:**

```bash
export DISTRIBUTION_ID="YOUR_PROD_DISTRIBUTION_ID"
export API_HOST="https://oqqdsbarb5.execute-api.us-east-1.amazonaws.com/Prod"
export AWS_PROFILE="prod"
```

**Note:** Replace `YOUR_PROD_DISTRIBUTION_ID` with your actual CloudFront distribution ID.

##### Step 5: Make the deploy script executable (first time only)

```bash
chmod +x deploy.sh
```

##### Step 6: Deploy to your environment

**Deploy to DEV:**

```bash
./deploy.sh dev
```

**Deploy to TEST:**

```bash
./deploy.sh test
```

**Deploy to PROD:**

```bash
./deploy.sh prod
```

##### Step 7: First-time CloudFront configuration

If this is your first deployment, the script will create `cloudfront-config.json`. You'll need to:

1. **Open the generated config file:**

   ```bash
   cat cloudfront-config.json
   ```

2. **Find the LambdaFunctionAssociation section and update it with the version ARN** (the script will print this)

3. **Run the deploy script again:**
   ```bash
   ./deploy.sh dev  # or test/prod
   ```

#### Complete Copy-Paste Examples

**Deploy to DEV:**

```bash
cd app/lambda_edge
mkdir -p dist
zip dist/router.zip router.py
export DISTRIBUTION_ID="YOUR_DEV_DISTRIBUTION_ID"
export API_HOST="https://zk8yyxnk14.execute-api.us-east-1.amazonaws.com/Prod"
chmod +x deploy.sh
./deploy.sh dev
```

**Note:** Replace `YOUR_DEV_DISTRIBUTION_ID` with your actual CloudFront distribution ID.

**Deploy to TEST:**

```bash
cd app/lambda_edge
mkdir -p dist
zip dist/router.zip router.py
export DISTRIBUTION_ID="YOUR_TEST_DISTRIBUTION_ID"
export API_HOST="https://tvy9fm481c.execute-api.us-east-1.amazonaws.com/Prod"
export AWS_PROFILE="test"
chmod +x deploy.sh
./deploy.sh test
```

**Deploy to PROD:**

```bash
cd app/lambda_edge
mkdir -p dist
zip dist/router.zip router.py
export DISTRIBUTION_ID="YOUR_PROD_DISTRIBUTION_ID"
export API_HOST="https://oqqdsbarb5.execute-api.us-east-1.amazonaws.com/Prod"
export AWS_PROFILE="prod"
chmod +x deploy.sh
./deploy.sh prod
```

**Note:** Replace `YOUR_*_DISTRIBUTION_ID` with your actual CloudFront distribution IDs. See instructions below on how to find them.

#### How to Find Your CloudFront Distribution ID

You can find your CloudFront distribution ID using one of these methods:

**Method 1: AWS Console**

1. Log in to the [AWS CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Navigate to the "Distributions" page
3. Find your distribution in the list
4. The Distribution ID is shown in the "ID" column (e.g., `E1234567890ABC`)

**Method 2: AWS CLI**

```bash
# List all CloudFront distributions with their IDs and domain names
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,DomainName,Comment]" --output table

# Or get just the IDs
aws cloudfront list-distributions --query "DistributionList.Items[*].Id" --output text
```

**Method 3: AWS CLI (with profile)**
If you're using AWS profiles (e.g., for test/prod):

```bash
# For test environment
aws cloudfront list-distributions --profile test --query "DistributionList.Items[*].[Id,DomainName]" --output table

# For prod environment
aws cloudfront list-distributions --profile prod --query "DistributionList.Items[*].[Id,DomainName]" --output table
```

The Distribution ID is a string that starts with `E` followed by alphanumeric characters (e.g., `E1234567890ABC`).

#### How to Find Your API Gateway URL (API_HOST)

The `API_HOST` should point to the **Static Site Generator API Gateway** (where the `/domain-router/mappings` endpoint is hosted).

**Method 1: From CloudFormation Outputs (Recommended)**
After deploying the Static Site Generator stack, get the API URL:

```bash
# For DEV
aws cloudformation describe-stacks --stack-name booking-static-site-generator-stack-DEV \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticSiteGeneratorApiUrl`].OutputValue' --output text

# For TEST
aws cloudformation describe-stacks --stack-name booking-static-site-generator-stack-TEST \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticSiteGeneratorApiUrl`].OutputValue' --output text \
  --profile test

# For PROD
aws cloudformation describe-stacks --stack-name booking-static-site-generator-stack-PROD \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticSiteGeneratorApiUrl`].OutputValue' --output text \
  --profile prod
```

**Method 2: From ENDPOINTS.md**
Check the `ENDPOINTS.md` file in the repository for the current API Gateway URLs for each environment.

**Method 3: AWS Console**

1. Go to API Gateway console
2. Find the API named `booking-ssg-api-{ENV}`
3. Copy the Invoke URL (should end with `/Prod/`)

#### Environment Configuration

The script uses environment-specific defaults. You can override them with environment variables:

```bash
# Example: Deploy to dev with custom values
FUNCTION_NAME="my-custom-router" \
DISTRIBUTION_ID="E123456ABCDEFG" \
API_HOST="https://api.example.com" \
./deploy.sh dev
```

#### Environment Variables

| Variable          | Description                 | Default (per environment)                      |
| ----------------- | --------------------------- | ---------------------------------------------- |
| `FUNCTION_NAME`   | Lambda function name        | `pagoda-edge-router-{env}`                     |
| `DISTRIBUTION_ID` | CloudFront distribution ID  | _Required_ (must be set)                       |
| `API_HOST`        | Domain lookup API base URL  | _Optional_                                     |
| `SECRET_NAME`     | Secrets Manager secret name | `{ENV}-domainLookupApiKey`                     |
| `AWS_PROFILE`     | AWS CLI profile to use      | `prod` for prod, `test` for test, none for dev |
| `ZIP_PATH`        | Path to zip file            | `dist/router.zip`                              |

#### First-Time Setup

On first deployment, the script will:

1. Fetch the current CloudFront distribution config
2. Save it to `cloudfront-config.json`
3. Prompt you to update the `LambdaFunctionAssociation` with the new version ARN
4. Run the script again to complete the deployment

#### What the Script Does

The `deploy.sh` script handles Lambda@Edge deployment automatically:

1. **Retrieves API key** from AWS Secrets Manager
2. **Updates function code** with latest `router.py`
3. **Builds published version** with embedded config values (API_HOST, API_KEY)
4. **Removes environment variables** temporarily (required for Lambda@Edge published versions)
5. **Publishes new version** (without env vars, but with embedded values in code)
6. **Updates CloudFront** distribution to use the new published version

**Important Notes:**

- **`$LATEST` vs Published Versions**:
  - `$LATEST` is the mutable default version (used for development/testing)
  - Published versions (1, 2, 3, etc.) are immutable snapshots (used by CloudFront)
  - Lambda@Edge **cannot use environment variables** in published versions
  - Solution: The script embeds `API_HOST` and `API_KEY` directly into code for published versions

- **No template.yaml changes needed**: Lambda@Edge is deployed separately using this script. Changes to `router.py` don't require `template.yaml` updates.

- **Deployment time**: CloudFront distribution updates take 15-20 minutes to propagate globally. You cannot deploy again until the current deployment completes.

### Testing

```
pytest tests/init_bookings_app/static_web_generator/test_lambda_edge_router.py
```

### Complete Workflow

**For code changes:**

1. Edit `router.py` with your changes
2. Create zip: `mkdir -p dist && zip dist/router.zip router.py`
3. Set environment variables: `export DISTRIBUTION_ID="..." && export API_HOST="..."`
4. Deploy: `./deploy.sh dev`
5. Wait 15-20 minutes for CloudFront deployment to complete

**What happens:**

- Script embeds `API_HOST` and `API_KEY` into code for published version
- Publishes version without environment variables (required for Lambda@Edge)
- Updates CloudFront to use new version
- Note: `$LATEST` is not used by CloudFront (only published versions are used)

**No template.yaml changes needed**: Lambda@Edge is deployed separately, so changes to `router.py` don't require SAM template updates.
