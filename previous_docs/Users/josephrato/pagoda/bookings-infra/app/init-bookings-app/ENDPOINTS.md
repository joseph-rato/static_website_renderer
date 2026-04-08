# API Endpoint Mapping Guide

This document provides a comprehensive mapping of all API endpoints across the microservice architecture.

> ⚠️ **VERIFIED:** All endpoints in this document have been verified against the actual SAM templates.

## 🚀 Quick Reference - DEV Environment URLs

| Microservice        | Base URL                                                       |
| ------------------- | -------------------------------------------------------------- |
| **Core**            | `https://egf8y8a6m7.execute-api.us-east-1.amazonaws.com/Prod/` |
| **Payments**        | `https://10flr6lsa0.execute-api.us-east-1.amazonaws.com/Prod/` |
| **Marketing**       | `https://v6sor52n30.execute-api.us-east-1.amazonaws.com/Prod/` |
| **Notifications**   | `https://uo8sup1tyi.execute-api.us-east-1.amazonaws.com/Prod/` |
| **Static Site Gen** | `https://zk8yyxnk14.execute-api.us-east-1.amazonaws.com/Prod/` |
| **Payroll**         | `https://bwv0vaw78l.execute-api.us-east-1.amazonaws.com/Prod/` |

> **Legacy API (init-booking-stack):** `https://rpk7z4swpg.execute-api.us-east-1.amazonaws.com/Prod/`

---

## Architecture Overview

Each microservice has its **own API Gateway**. After deployment, you'll get separate base URLs for each microservice:

| Microservice          | Stack Name                            | API Gateway Name                  | Base URL Pattern                                            |
| --------------------- | ------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Core                  | `booking-core-stack`                  | `booking-core-api-{ENV}`          | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |
| Payments              | `booking-payments-stack`              | `booking-payments-api-{ENV}`      | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |
| Marketing             | `booking-marketing-stack`             | `booking-marketing-api-{ENV}`     | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |
| Notifications         | `booking-notifications-stack`         | `booking-notifications-api-{ENV}` | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |
| Static Site Generator | `booking-static-site-generator-stack` | `booking-ssg-api-{ENV}`           | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |
| Payroll               | `booking-payroll-stack`               | `booking-payroll-api-{ENV}`       | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |
| Onboarding            | `booking-onboarding-stack`            | `booking-onboarding-api-{ENV}`    | `https://{api-id}.execute-api.{region}.amazonaws.com/Prod/` |

---

## Getting API URLs After Deployment

After deploying each stack, retrieve the API URL from CloudFormation outputs:

```bash
# Get Core API URL
aws cloudformation describe-stacks --stack-name booking-core-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`CoreApiUrl`].OutputValue' --output text

# Get Payments API URL
aws cloudformation describe-stacks --stack-name booking-payments-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`PaymentsApiUrl`].OutputValue' --output text

# Repeat for other microservices...
```

---

## Endpoint Reference by Microservice

### 🏢 CORE (`booking-core-api`)

#### Staff Management

| Method | Path                       | Description                 | Auth    |
| ------ | -------------------------- | --------------------------- | ------- |
| GET    | `/staff/{staff_id}`        | Get individual staff member | Cognito |
| GET    | `/salons/{salon_id}/staff` | Get all staff for a salon   | Hybrid  |
| PUT    | `/staff`                   | Edit staff member           | Cognito |
| PUT    | `/staff/phone-email`       | Edit staff phone/email      | Cognito |
| POST   | `/confirm-email`           | Confirm email address       | None    |
| DELETE | `/staff/{staff_id}`        | Delete staff member         | Cognito |
| POST   | `/staff/invite`            | Invite new staff            | Cognito |

**Staff photo:** Staff responses (GET `/staff/{staff_id}`, GET `/salons/{salon_id}/staff`) include `staff_photo_s3_uri` (string \| null) and `staff_photo_url` (string \| null)—full URL for frontend display, no client-side URL construction. PUT `/staff` accepts optional `staff_photo_s3_uri` (string \| null) to set or clear the photo. POST `/staff/invite` accepts optional `staff_photo_s3_uri` in the body. See `app/docs/onboarding/STAFF_PHOTO_FEATURE_SUMMARY.md` and `app/docs/onboarding/STAFF_PHOTO_IMPLEMENTATION_SUMMARY.md` for details.

#### Access / Feature Permissions

| Method | Path      | Description                                                                                   | Auth    |
| ------ | --------- | --------------------------------------------------------------------------------------------- | ------- |
| GET    | `/access` | Get feature permissions and access for the current user (tier, onboarding, unlocked features) | Cognito |

**GET /access** returns the payload used by the frontend for feature paywall and routing. Call early after sign-in (e.g. with onboarding/salon). Response includes: `user_level`, `subscription_tier`, `trial_end_dt`, `number_of_active_employees`, `max_allowed_employees`, `onboarding` (from salon_onboarding), `unlocked_features` (per-feature booleans, snake_case keys including `role_permissions`), and **`permissions`** — a flat object of capability flags (`can_edit_salon`, `can_view_clients`, `can_manage_role_permissions`, etc.) derived from the same role-permission logic as backend enforcement (defaults + salon overrides, gated by subscription). See `app/docs/authorization/FEATURE_PAYWALL.md` for full request/response and error behavior.

#### Role Permissions (RBAC) - Workflow-Based

| Method | Path                                       | Description                                           | Auth    |
| ------ | ------------------------------------------ | ----------------------------------------------------- | ------- |
| GET    | `/salons/{salon_id}/role-permissions`      | Get workflow permissions for all roles                | Cognito |
| PUT    | `/salons/{salon_id}/role-permissions`      | Update workflow permissions for a role                | Cognito |
| DELETE | `/salons/{salon_id}/role-permissions/{role}` | Reset role permissions to defaults                  | Cognito |

**Authorization:** Owner and Manager only (role check). Additionally, the **role-permissions feature** is gated by subscription: only **trial**, **business_essentials**, and **business_growth** tiers can use these endpoints. **Independent** tier receives **402 Payment Required** or **403 Forbidden** (with `feature: "role_permissions"`) when calling GET/PUT/DELETE. Use `unlocked_features.role_permissions` from GET /access to show/hide the role-permissions UI.

**GET /salons/{salon_id}/role-permissions**

Returns workflow-level permissions for all roles, with defaults and overrides merged.

Response:

```json
{
  "salon_id": "salon-uuid",
  "permissions": {
    "Owner": {
      "calendar": { "scope": "all", "canManageTimeBlocks": true, "canDeleteTimeBlocks": true },
      "products": { "canView": true, "canEdit": true },
      "clients": { "canView": true, "canDelete": true },
      "settingsStaff": { "scope": "all", "canEdit": true }
    },
    "Manager": {
      "calendar": { "scope": "all", "canManageTimeBlocks": true, "canDeleteTimeBlocks": true },
      "settingsStaff": { "scope": "all", "canEdit": true }
    },
    "Employee": {
      "calendar": { "scope": "own", "canManageTimeBlocks": true, "canDeleteTimeBlocks": false },
      "settingsStaff": { "scope": "own", "canEdit": false }
    },
    "Assistant": {
      "calendar": { "scope": "all", "canManageTimeBlocks": true, "canDeleteTimeBlocks": true },
      "settingsStaff": { "scope": "own", "canEdit": false }
    }
  },
  "overrides": [
    {
      "id": 1,
      "role": "Employee",
      "workflow": "calendar",
      "permission_key": "scope",
      "value": "own"
    }
  ]
}
```

**PUT /salons/{salon_id}/role-permissions**

Updates workflow permissions for a single role. Send all permissions for that role.

Request Body:

```json
{
  "role": "Employee",
  "permissions": {
    "calendar": { "scope": "own", "canManageTimeBlocks": true, "canDeleteTimeBlocks": false },
    "products": { "canView": true, "canEdit": false },
    "clients": { "canView": true, "canDelete": false },
    "settingsStaff": { "scope": "own", "canEdit": false },
    "settingsServices": { "scope": "own", "canManageServices": false }
  }
}
```

Response: Returns `{ "message": "Permissions updated successfully" }`

**DELETE /salons/{salon_id}/role-permissions/{role}**

Resets all permission overrides for a role to defaults.

Response:

```json
{
  "message": "Permission overrides deleted successfully",
  "role": "Employee"
}
```

**Workflow Permission Keys:**

| Workflow | Permission Keys |
|----------|-----------------|
| `calendar` | `scope` (own/all), `canManageTimeBlocks`, `canDeleteTimeBlocks` |
| `products` | `canView`, `canEdit` |
| `clients` | `canView`, `canDelete` |
| `marketing` | `canView`, `canCreate`, `canCancel` |
| `reports` | `scope` (none/own/all), `canDownload` |
| `payroll` | `clockScope` (own/all), `canSyncToPayroll` |
| `payments` | `canView` |
| `notifications` | `scope` (own/all) |
| `settingsStudio` | `canView`, `canEdit`, `canSeeBilling` |
| `settingsStaff` | `scope` (own/all), `canEdit` |
| `settingsServices` | `scope` (own/all), `canManageServices`, `canViewAdjustmentForms`, `canManageAdjustmentForms` |
| `settingsSSG` | `canAccess` |
| `settingsDeposits` | `canAccess` |
| `settingsCommissions` | `scope` (none/own/all), `canEdit` |
| `settingsPayroll` | `canAccess` |

**Scope Values:**

- `all`: User can access all data within the salon
- `own`: User can only access their own data (e.g., their own appointments, clients they created)
- `none`: User cannot access this workflow (reports only)

See `app/docs/authorization/FRONTEND_MIGRATION_GUIDE.md` for full implementation details.

#### Salon Management

| Method | Path                 | Description       | Auth    |
| ------ | -------------------- | ----------------- | ------- |
| POST   | `/salons`            | Create salon      | Cognito |
| GET    | `/salons/{salon_id}` | Get salon details | Hybrid  |
| GET    | `/salons`            | Get all salons    | Cognito |
| PUT    | `/salons`            | Edit salon        | Cognito |

**GET /salons Response:**
Returns an array of salon objects. The first salon object (`salons[0]`) is typically used as `businessInfo` in the frontend.

**Response Fields:**

- `id`: Salon UUID
- `salon_name`: Name of the salon
- `logo_url`: Optional string - URL of the salon logo (mapped from `logo_s3_uri` for frontend compatibility)
- `logo_s3_uri`: Internal S3 URI (also available as `logo_url`)
- `status`: Salon status (Active, Inactive, Trial)
- `legal_business_name`: Legal business name
- Address fields: `street_address_1`, `street_address_2`, `city`, `state`, `zip_code`
- `timezone`: Salon timezone
- `email`: Contact email
- `phone_number`: Contact phone
- `website_url`: Website URL
- `google_review_link`: Google review link
- `thumbnail_url`: Thumbnail image URL
- `created_dt`: Creation timestamp
- `free_trial_end_date`: Calculated free trial end date
- Additional fields based on user permissions (for authenticated requests)

**Note:** The `logo_url` field is included for frontend compatibility and is automatically mapped from `logo_s3_uri`. Logo updates must be done via the `/create-image` endpoint with `image_type=salon_logo`, not via PUT /salons (logo_s3_uri is excluded from updatable fields).

#### Policies

| Method | Path                          | Description           | Auth    |
| ------ | ----------------------------- | --------------------- | ------- |
| POST   | `/policies`                   | Create policies       | Cognito |
| GET    | `/salons/{salon_id}/policies` | Get salon policies    | Hybrid  |
| PUT    | `/policies`                   | Edit policies         | Cognito |
| GET    | `/policies/defaults`          | List default policies | Cognito |
| DELETE | `/policies/{policy_id}`       | Delete policy         | Cognito |

#### Services

| Method | Path                                 | Description          | Auth    |
| ------ | ------------------------------------ | -------------------- | ------- |
| POST   | `/services`                          | Create service       | Cognito |
| PUT    | `/services`                          | Edit service         | Cognito |
| GET    | `/salons/{salon_id}/services`        | Get salon services   | Hybrid  |
| DELETE | `/salon-services/{salon_service_id}` | Delete salon service | Cognito |
| DELETE | `/staff-services/{staff_service_id}` | Delete staff service | Cognito |

#### Products

| Method | Path                          | Description        | Auth    |
| ------ | ----------------------------- | ------------------ | ------- |
| GET    | `/salons/{salon_id}/products` | Get salon products | Cognito |
| POST   | `/products`                   | Create product     | Cognito |
| PUT    | `/products`                   | Edit product       | Cognito |

#### Deposit Configs

| Method | Path                                                     | Description           | Auth    |
| ------ | -------------------------------------------------------- | --------------------- | ------- |
| GET    | `/salons/{salon_id}/deposit-configs`                     | Get deposit configs   | Cognito |
| POST   | `/salons/{salon_id}/deposit-configs`                     | Create deposit config | Cognito |
| PUT    | `/salons/{salon_id}/deposit-configs`                     | Edit deposit config   | Cognito |
| DELETE | `/salons/{salon_id}/deposit-configs/{deposit_config_id}` | Delete deposit config | Cognito |

#### Service Adjustment Forms

| Method | Path                                                                 | Description                  | Auth    |
| ------ | -------------------------------------------------------------------- | ---------------------------- | ------- |
| POST   | `/salons/{salon_id}/service-adjustment-forms`                        | Create form                  | Cognito |
| GET    | `/salons/{salon_id}/service-adjustment-forms`                        | Get forms for salon          | Cognito |
| DELETE | `/salons/{salon_id}/service-adjustment-forms/{form_id}`              | Delete form                  | Cognito |
| POST   | `/salons/{salon_id}/service-adjustment-form-junctions`               | Create form-service junction | Cognito |
| DELETE | `/salons/{salon_id}/service-adjustment-form-junctions/{junction_id}` | Delete form-service junction | Cognito |
| GET    | `/salons/{salon_id}/service-adjustment-form-junctions`               | Get form-service junctions   | Cognito |

#### Time Off

| Method | Path                              | Description              | Auth    |
| ------ | --------------------------------- | ------------------------ | ------- |
| POST   | `/timeoff`                        | Create time off          | Cognito |
| GET    | `/salons/{salon_id}/timeoff`      | Get salon time off       | Cognito |
| GET    | `/staff/{staff_id}/timeoff`       | Get staff time off       | Cognito |
| PUT    | `/timeoff`                        | Edit time off            | Cognito |
| DELETE | `/timeoff/{timeoff_id}/single`    | Delete single occurrence | Cognito |
| DELETE | `/timeoff/{timeoff_id}/hereafter` | Delete this & future     | Cognito |
| DELETE | `/timeoff/{timeoff_id}/all`       | Delete all occurrences   | Cognito |

#### Clients

| Method | Path                         | Description           | Auth    |
| ------ | ---------------------------- | --------------------- | ------- |
| GET    | `/clients/{client_id}`       | Get individual client | Cognito |
| GET    | `/salons/{salon_id}/clients` | Get salon clients     | Cognito |
| POST   | `/clients`                   | Create client         | Hybrid  |
| PUT    | `/clients/{client_id}`       | Edit client           | Cognito |

#### Appointments & Transactions

| Method | Path                              | Description              | Auth   |
| ------ | --------------------------------- | ------------------------ | ------ |
| POST   | `/appointments`                   | Create appointment       | Hybrid |
| GET    | `/transactions`                   | Get transactions (query) | Hybrid |
| GET    | `/salons/{salon_id}/transactions` | Get salon transactions   | Hybrid |
| PUT    | `/transactions`                   | Edit transaction         | Hybrid |
| PUT    | `/transactions/line-items`        | Edit line items          | Hybrid |
| DELETE | `/line-items/{line_item_uuid}`    | Delete line item         | Hybrid |
| POST   | `/add-line-item-to-transaction`   | Add line item            | Hybrid |

#### Availability

| Method | Path            | Description      | Auth   |
| ------ | --------------- | ---------------- | ------ |
| GET    | `/availability` | Get availability | Hybrid |

**GET /availability**

Returns available appointment slots for the requested services and date range.

**Query Parameters:**

| Parameter              | Type    | Required | Description                                                                   |
| ---------------------- | ------- | -------- | ----------------------------------------------------------------------------- |
| `start_date`           | string  | Yes      | Start date in YYYY-MM-DD format                                               |
| `end_date`             | string  | Yes      | End date in YYYY-MM-DD format (max 32 days from start_date)                   |
| `services`             | string  | Yes      | Comma-separated list of service UUIDs                                         |
| `timezone`             | string  | Yes      | Timezone identifier (e.g., "America/Los_Angeles")                             |
| `staff_id`             | string  | No       | Optional staff UUID to filter availability to specific staff member           |
| `service_adjustments`  | string  | No       | Comma-separated list of service adjustment form option UUIDs                  |
| `base_duration_mins`   | integer | No       | **Staff-only:** Override base duration in minutes (requires authentication)   |
| `processing_time_mins` | integer | No       | **Staff-only:** Override processing time in minutes (requires authentication) |
| `finishing_time_mins`  | integer | No       | **Staff-only:** Override finishing time in minutes (requires authentication)  |
| `buffer_time_mins`     | integer | No       | **Staff-only:** Override buffer time in minutes (requires authentication)     |

**Duration Override Parameters (Staff-Only):**

The duration override parameters allow authenticated staff members to temporarily override the default duration settings when checking availability. This is useful for:

- Testing different appointment durations
- Accommodating special scheduling scenarios
- Previewing availability with adjusted timing

**Important:**

- All duration overrides must be non-negative integers
- Requires valid Cognito JWT token in Authorization header
- Non-authenticated requests using these parameters will receive a `403 Forbidden` error
- Overrides apply to all staff members returned in the availability results

**Example Request 1 (Basic - Public/Customer):**

```http
GET /availability?start_date=2026-04-01&end_date=2026-04-07&services=abc123,def456&timezone=America/Los_Angeles
```

**Example Request 2 (With Staff Filter):**

```http
GET /availability?start_date=2026-04-01&end_date=2026-04-07&services=abc123,def456&staff_id=staff-uuid-123&timezone=America/Los_Angeles
```

**Example Request 3 (With Service Adjustments):**

```http
GET /availability?start_date=2026-04-01&end_date=2026-04-07&services=abc123,def456&service_adjustments=form-opt-1,form-opt-2&timezone=America/Los_Angeles
```

**Example Request 4 (Staff with Duration Overrides):**

```http
GET /availability?start_date=2026-04-01&end_date=2026-04-07&services=abc123,def456&timezone=America/Los_Angeles&base_duration_mins=60&processing_time_mins=15&finishing_time_mins=10&buffer_time_mins=5
Authorization: Bearer <cognito-jwt-token>
```

**Example Request 5 (Complete - All Parameters):**

```http
GET /availability?start_date=2026-04-01&end_date=2026-04-07&services=abc123,def456&staff_id=staff-uuid-123&service_adjustments=form-opt-1,form-opt-2&timezone=America/Los_Angeles&base_duration_mins=60&processing_time_mins=15&finishing_time_mins=10&buffer_time_mins=5
Authorization: Bearer <cognito-jwt-token>
```

This comprehensive example combines:

- **Required:** Date range, services, and timezone
- **Staff Filter:** Limits results to specific staff member (`staff_id=staff-uuid-123`)
- **Service Adjustments:** Form options that modify duration/price (`service_adjustments=form-opt-1,form-opt-2`)
- **Duration Overrides (Staff-only):** Custom timing for all four components

**Example Response:**

```json
{
  "availability": {
    "2026-04-01": [
      {
        "start_time": "9:00 AM",
        "end_time": "10:30 AM",
        "staff_name": "John Doe, Jane Smith",
        "staff_service_ids": ["staff-svc-uuid-1", "staff-svc-uuid-2"],
        "price": 125.0,
        "duration_mins": 90
      },
      {
        "start_time": "10:30 AM",
        "end_time": "12:00 PM",
        "staff_name": "John Doe, Jane Smith",
        "staff_service_ids": ["staff-svc-uuid-1", "staff-svc-uuid-2"],
        "price": 125.0,
        "duration_mins": 90
      }
    ],
    "2026-04-02": [
      {
        "start_time": "9:00 AM",
        "end_time": "10:30 AM",
        "staff_name": "John Doe, Jane Smith",
        "staff_service_ids": ["staff-svc-uuid-1", "staff-svc-uuid-2"],
        "price": 125.0,
        "duration_mins": 90
      }
    ]
  }
}
```

**Response Fields:**

- `availability`: Object keyed by date (YYYY-MM-DD format)
  - Each date contains an array of available time slots
  - `start_time`: Formatted start time (e.g., "9:00 AM")
  - `end_time`: Formatted end time (e.g., "10:30 AM")
  - `staff_name`: Comma-separated names of staff for this slot
  - `staff_service_ids`: Array of staff service UUIDs
  - `price`: Total price for all services
  - `duration_mins`: Total appointment duration in minutes

**Error Responses:**

```json
// 400 Bad Request - Invalid parameters
{
  "message": "start_date and end_date are required"
}

// 403 Forbidden - Non-staff user trying to use duration overrides
{
  "message": "Duration override parameters are only available to staff"
}

// 404 Not Found - Services not found or no qualified staff
{
  "message": "Not Found"
}

// 500 Internal Server Error
{
  "message": "Internal Server Error"
}
```

**Parameter Interaction Notes:**

When multiple optional parameters are combined:

1. **Service Adjustments + Duration Overrides:** Both are applied independently. Service adjustments modify the base duration via deltas, then duration overrides replace the entire timing components if provided.
2. **Staff Filter + Duration Overrides:** Duration overrides apply to the filtered staff member's services.
3. **Service Adjustments + Staff Filter:** Service adjustment deltas are applied when calculating availability for the specific staff member.

**Additional Notes:**

- If no qualified staff members exist for the requested services, returns `{"availability": {}}`
- The endpoint respects salon booking delay and booking horizon settings
- Service adjustments can add or subtract time from base durations (negative values allowed)
- Duration overrides must be non-negative integers (positive or zero only)
- When multiple services are requested, the system finds staff combinations that can fulfill all services
- All timing modifications affect the availability calculation and the returned slot times

#### Payments (Non-Card)

| Method | Path                        | Description              | Auth   |
| ------ | --------------------------- | ------------------------ | ------ |
| POST   | `/process-non-card-payment` | Process non-card payment | Hybrid |

---

### 💳 PAYMENTS (`booking-payments-api`)

#### Subscriptions

| Method | Path                                        | Description                  | Auth    |
| ------ | ------------------------------------------- | ---------------------------- | ------- |
| POST   | `/get-subscribe-url`                        | Get Stripe subscription URL  | Cognito |
| POST   | `/stripe/webhook-endpoint/subscription`     | Webhook for subscriptions    | None    |
| POST   | `/stripe/webhook-endpoint/checkout`         | Webhook for checkout         | None    |
| POST   | `/stripe/webhook-endpoint/connect-checkout` | Webhook for connect checkout | None    |

#### Stripe Connect

| Method | Path                                       | Description                 | Auth    |
| ------ | ------------------------------------------ | --------------------------- | ------- |
| POST   | `/create-stripe-connect-account`           | Create connect account      | Cognito |
| POST   | `/create-stripe-connect-account-session`   | Create account session      | Cognito |
| POST   | `/get-stripe-connect-account-link`         | Get account onboarding link | Cognito |
| POST   | `/stripe/webhook-endpoint/connect-account` | Webhook for account events  | None    |

#### Terminal Devices

| Method | Path                               | Description                    | Auth    |
| ------ | ---------------------------------- | ------------------------------ | ------- |
| POST   | `/register-stripe-terminal-device` | Register terminal device       | Cognito |
| POST   | `/get-stripe-terminal-device`      | Get terminal device            | Cognito |
| POST   | `/set-terminal-configuration`      | Set tip config & splash screen | Cognito |
| POST   | `/remove-stripe-terminal-device`   | Remove terminal device         | Cognito |

#### Payment Intents

| Method | Path                                      | Description           | Auth   |
| ------ | ----------------------------------------- | --------------------- | ------ |
| POST   | `/create-payment-intent`                  | Create payment intent | Hybrid |
| POST   | `/update-payment-intent`                  | Update payment intent | Hybrid |
| POST   | `/cancel-payment-intent`                  | Cancel payment intent | Hybrid |
| POST   | `/process-payment`                        | Process payment       | Hybrid |
| POST   | `/simulate-payment`                       | Simulate payment      | Hybrid |
| POST   | `/stripe/webhook-endpoint/payment-intent` | Webhook for intents   | None   |
| POST   | `/poll-stripe-payment-status`             | Poll payment status   | Hybrid |

#### Deposits

| Method | Path                     | Description           | Auth   |
| ------ | ------------------------ | --------------------- | ------ |
| POST   | `/generate-deposit-link` | Generate deposit link | Hybrid |

#### Card-on-File

| Method | Path                                        | Description                           | Auth    |
| ------ | ------------------------------------------- | ------------------------------------- | ------- |
| POST   | `/create-setup-intent`                      | Create SetupIntent for adding card    | Cognito |
| GET    | `/clients/{client_id}/payment-methods`      | List client's stored payment methods  | Cognito |
| DELETE | `/clients/{client_id}/payment-methods/{pm_id}` | Remove a payment method            | Cognito |
| PUT    | `/clients/{client_id}/payment-methods/{pm_id}/default` | Set default payment method | Cognito |
| POST   | `/charge-card-on-file`                      | Charge amount from stored card        | Cognito |
| POST   | `/stripe/webhook-endpoint/setup-intent`    | Webhook for SetupIntent events        | Hybrid  |

**Card-on-File Endpoints (client/salon identifiers are UUIDs, same as Core API):**

- `POST /create-setup-intent`: Creates a Stripe SetupIntent for adding a card. Body: `{ clientId, salonId }` (both **UUIDs**). Returns `{ clientSecret, setupIntentId }` for Stripe Elements.
- `GET /clients/{client_id}/payment-methods`: Returns stored payment methods. Path `client_id` is the **client UUID**. Response: `{ paymentMethods: [{ id, uuid, stripePaymentMethodId, cardBrand, cardLast4, cardExpMonth, cardExpYear, isDefault }], count }`.
- `DELETE /clients/{client_id}/payment-methods/{pm_id}`: Removes a payment method. Path `client_id` is the **client UUID**; `pm_id` is the payment method id (integer from list response). Returns 400 if salon requires card and this is the last valid card.
  - **Implementation:** After validation, the API Lambda **synchronously invokes** internal `booking-detach-payment-method-stripe` (**not** on API Gateway), which runs **outside the VPC** and calls Stripe `PaymentMethod.detach`. The VPC handler then deletes the DB row. Clients still call only this DELETE URL.
- `PUT /clients/{client_id}/payment-methods/{pm_id}/default`: Sets which stored payment method is the client's default. Path `client_id` is the **client UUID**; `pm_id` is the payment method id (integer from list response). Returns `{ defaultPaymentMethodId }`.
- `POST /charge-card-on-file`: Charges a stored card. Body: `{ transactionId }` (**UUID**, same as Core API), `amountCents | percentage`, optional `paymentMethodId` (integer). Returns `{ status, paymentIntentId, clientSecret? }`.
  - **Implementation:** The API Lambda (in the VPC) loads the transaction and payment-method rows from RDS, then **synchronously invokes** an internal Lambda (`booking-create-card-on-file-payment-intent`, **not** exposed on API Gateway) that runs **outside the VPC** and creates/confirms the Stripe PaymentIntent. This avoids requiring public internet egress from the VPC to `api.stripe.com`. Clients still call only `POST /charge-card-on-file`.
#### Quick Sale

| Method | Path                 | Description                     | Auth    |
| ------ | -------------------- | ------------------------------- | ------- |
| POST   | `/create-quick-sale` | Create product-only transaction | Cognito |

#### Endpoint Details

**POST /set-terminal-configuration**

Configure tipping options and/or a custom splash screen for a salon's Stripe Terminal devices. At least one of `tipping` or `splashscreen` must be provided. The configuration applies to all terminals at the account's location.

Request Body:

```json
{
  "accountId": "acct_xxx",
  "tipping": {
    "percentages": [15, 20, 25],
    "fixed_amounts": [100, 200, 300],
    "smart_tip_threshold": 1000
  },
  "splashscreen": {
    "data": "<base64-encoded-png>",
    "filename": "splash.png"
  }
}
```

| Field                         | Type     | Required              | Description                                                            |
| ----------------------------- | -------- | --------------------- | ---------------------------------------------------------------------- |
| `accountId`                   | string   | Yes                   | Stripe Connect account ID                                              |
| `tipping`                     | object   | No\*                  | Tip configuration for terminal checkout                                |
| `tipping.percentages`         | number[] | No                    | 1-3 tip percentage options (0-100)                                     |
| `tipping.fixed_amounts`       | number[] | No                    | 1-3 fixed tip amounts in cents                                         |
| `tipping.smart_tip_threshold` | number   | No                    | Threshold in cents: below shows fixed amounts, above shows percentages |
| `splashscreen`                | object   | No\*                  | Custom splash screen for terminal display                              |
| `splashscreen.data`           | string   | Yes (if splashscreen) | Base64-encoded PNG image data (max 5MB decoded)                        |
| `splashscreen.filename`       | string   | No                    | Original filename. Defaults to `"splashscreen.png"`                    |

\*At least one of `tipping` or `splashscreen` must be provided.

Response (200):

```json
{
  "message": "Terminal configured successfully",
  "configurationId": "tmc_xxx",
  "locationId": "tml_xxx",
  "fileId": "file_xxx"
}
```

> `fileId` is only present when a splash screen was uploaded.

> **Full integration guide:** See [`docs/SET_TERMINAL_CONFIGURATION_API.md`](../../docs/SET_TERMINAL_CONFIGURATION_API.md) for TypeScript examples, error reference, and UI/UX recommendations.

---

### 📢 MARKETING (`booking-marketing-api`)

#### Templates & Values

| Method | Path                                      | Description             | Auth    |
| ------ | ----------------------------------------- | ----------------------- | ------- |
| GET    | `/marketing/templated-values/{salonUuid}` | Get templated values    | Cognito |
| GET    | `/marketing/templates`                    | Get marketing templates | Cognito |

#### Compliance

| Method | Path                             | Description              | Auth    |
| ------ | -------------------------------- | ------------------------ | ------- |
| GET    | `/marketing/compliance-messages` | Get compliance messages  | Cognito |
| POST   | `/marketing/check-compliance`    | Check message compliance | Cognito |

#### Campaigns

| Method | Path                                 | Description          | Auth    |
| ------ | ------------------------------------ | -------------------- | ------- |
| POST   | `/marketing/campaigns`               | Create campaign      | Cognito |
| GET    | `/salons/{salon_id}/campaigns`       | Get salon campaigns  | Cognito |
| GET    | `/marketing/campaigns/{campaign_id}` | Get campaign details | Cognito |
| PUT    | `/marketing/campaigns`               | Update campaign      | Cognito |
| DELETE | `/marketing/campaigns/{campaign_id}` | Delete campaign      | Cognito |

#### Rebook Links

| Method | Path                | Description                   | Auth |
| ------ | ------------------- | ----------------------------- | ---- |
| GET    | `/r/{reference_id}` | Redirect for rebook reference | None |

---

### 🔔 NOTIFICATIONS (`booking-notifications-api`)

| Method | Path             | Description                   | Auth    |
| ------ | ---------------- | ----------------------------- | ------- |
| POST   | `/pusher/auth`   | Pusher channel authentication | Cognito |
| GET    | `/notifications` | Get notifications             | Cognito |
| PUT    | `/notifications` | Edit notifications            | Cognito |

---

### 🌐 STATIC SITE GENERATOR (`booking-ssg-api`)

#### Preview & Deployment

| Method | Path                                                | Description            | Auth    |
| ------ | --------------------------------------------------- | ---------------------- | ------- |
| POST   | `/static-web-generator/{salon_id}/generate-preview` | Generate preview       | Hybrid  |
| GET    | `/salons/{salon_id}/preview-data`                   | Get preview data       | Hybrid  |
| GET    | `/static-web-generator/{salon_id}/deploy-status`    | Get deployment status  | Cognito |
| POST   | `/static-web-generator/{salon_id}/rebuild`          | Rebuild website        | Cognito |
| POST   | `/populate-site-template/{salon_id}`                | Populate site template | Cognito |

#### Domain & Subdomain Management

| Method | Path                                                    | Description                  | Auth    |
| ------ | ------------------------------------------------------- | ---------------------------- | ------- |
| POST   | `/static-web-generator/{salon_id}/register-domain`      | Register custom domain       | Cognito |
| GET    | `/static-web-generator/{salon_id}/domains`              | Get domains                  | Cognito |
| POST   | `/static-web-generator/{salon_id}/subdomains`           | Create subdomain             | Cognito |
| GET    | `/static-web-generator/{salon_id}/subdomains/current`   | Get current subdomain        | Cognito |
| GET    | `/static-web-generator/subdomains/check`                | Check subdomain availability | Cognito |
| GET    | `/static-web-generator/subdomain/{salon_id}`            | Get subdomain for salon      | Cognito |
| POST   | `/static-web-generator/{salon_id}/add-google-analytics` | Add Google Analytics         | Cognito |

#### Domain Router

| Method | Path                      | Description         | Auth   |
| ------ | ------------------------- | ------------------- | ------ |
| GET    | `/domain-router/mappings` | Get domain mappings | Hybrid |

#### Images

| Method | Path                            | Description      | Auth    |
| ------ | ------------------------------- | ---------------- | ------- |
| POST   | `/create-image`                 | Upload image     | Cognito |
| GET    | `/images/{salon_id}`            | Get salon images | Cognito |
| DELETE | `/images/{salon_id}/{filename}` | Delete image     | Cognito |

---

### 💰 PAYROLL (`booking-payroll-api`)

#### RollFi Integration

| Method | Path                     | Description                    | Auth    |
| ------ | ------------------------ | ------------------------------ | ------- |
| POST   | `/rollfi/payroll-period` | Get current payroll period     | Cognito |
| POST   | `/rollfi/active-users`   | Get active users for company   | Cognito |
| POST   | `/rollfi/sync-payroll`   | Sync payroll data with RollFi  | Cognito |
| POST   | `/rollfi/business`       | Create/onboard RollFi business | Cognito |

#### Payroll Prep

| Method | Path                 | Description                                  | Auth   |
| ------ | -------------------- | -------------------------------------------- | ------ |
| POST   | `/prep-payroll-sync` | Compute payroll preview & build sync payload | Hybrid |

#### Time Tracking

| Method | Path                      | Description                   | Auth    |
| ------ | ------------------------- | ----------------------------- | ------- |
| POST   | `/time-tracking`          | Clock in/out, breaks, approve | Cognito |
| POST   | `/time-tracking/employee` | Get time tracking status      | Cognito |

#### SSO (Single Sign-On)

| Method | Path   | Description                 | Auth   |
| ------ | ------ | --------------------------- | ------ |
| POST   | `/sso` | Initiate SSO flow to RollFi | Hybrid |

---

#### Endpoint Details

**POST /rollfi/payroll-period**

Get current payroll period information from RollFi.

Request Body:

```json
{
  "companyId": "AFB94AFD-D9EE-4018-A718-304D43702C9C",
  "workerType": "W2"
}
```

Response:

```json
{
  "payPeriodId": "BFDCD0C4-7B82-47B9-8B63-2C216AA9AAE8",
  "payPeriod": "01/08/2026 - 01/14/2026",
  "payBeginDate": "2026-01-08",
  "payEndDate": "2026-01-14",
  "payDate": "2026-01-16",
  "deadLineToRunPayroll": "2026-01-14",
  "payPeriodStatus": "new",
  "payrollAmount": 859.42
}
```

**POST /rollfi/active-users**

Get list of active users for a company from RollFi.

Request Body:

```json
{
  "companyId": "AFB94AFD-D9EE-4018-A718-304D43702C9C"
}
```

**POST /rollfi/sync-payroll**

Sync payroll data between your system and RollFi.

Request Body:

```json
{
  "companyId": "AFB94AFD-D9EE-4018-A718-304D43702C9C",
  "salonId": "salon-uuid-here"
}
```

**POST /rollfi/business**

Create and onboard a new business with RollFi. This endpoint handles the full business registration flow and updates local salon records.

Request Body:

```json
{
  "salonId": "salon-uuid",
  "registration": {
    "company": {
      "name": "My Salon LLC",
      "dba": "My Salon",
      "ein": "12-3456789",
      "entityType": "LLC"
    }
  },
  "companyLocation": {
    "companyLocation": "Main Location",
    "address1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zipcode": "90001"
  },
  "businessUser": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "555-0100"
  }
}
```

**POST /time-tracking**

Perform time tracking actions (clock in/out, breaks, approve entries).

Supported Methods:

- `clockInV2`: Clock in an employee
- `clockOutV2`: Clock out an employee
- `startBreakV2`: Start a break
- `endBreakV2`: End a break
- `approveTimeEntries`: Approve time entries
- `deleteTimeEntry`: Delete a time entry

Request Body (Clock In):

```json
{
  "method": "clockInV2",
  "companyId": "company-uuid",
  "employeeId": "employee-uuid"
}
```

Request Body (Clock Out):

```json
{
  "method": "clockOutV2",
  "timeEntryId": "time-entry-uuid"
}
```

Request Body (Approve):

```json
{
  "method": "approveTimeEntries",
  "timeEntryIds": ["uuid1", "uuid2"],
  "isApproved": true
}
```

**POST /time-tracking/employee**

Get current time tracking status for an employee.

Request Body:

```json
{
  "companyId": "company-uuid",
  "employeeId": "employee-uuid"
}
```

Response:

```json
{
  "status": "clocked_in",
  "currentTimeEntry": {
    "timeEntryId": "uuid",
    "clockInTime": "2026-01-27T10:00:00Z",
    "isOnBreak": false
  }
}
```

**POST /sso**

Initiate Single Sign-On flow to RollFi. Generates a JWT assertion token and returns a redirect URL.

Response:

```json
{
  "redirect_url": "https://sandbox.rollfi.xyz/auth/callback?token=..."
}
```

---

### 📋 ONBOARDING (`booking-onboarding-api`)

| Method | Path                                        | Description                          | Auth   |
| ------ | ------------------------------------------- | ------------------------------------ | ------ |
| GET    | `/onboardings`                              | Get onboarding progress              | Hybrid |
| PUT    | `/onboardings`                              | Update onboarding progress           | Hybrid |
| PUT    | `/onboardings/initial_onboarding/answers`   | Upsert onboarding answer             | Hybrid |
| GET    | `/onboardings/initial_onboarding/questions` | Get onboarding questions for a stage | Hybrid |

**Query Parameters:**

- All endpoints support `staffId` (pre-salon) or `salonId` (post-salon) query parameters
- `GET /onboardings/initial_onboarding/questions` requires `onboardingStage` (1-5) and optional `includeAnswers` (default: true)

---

## Frontend Configuration

### Environment Variables

Create environment-specific configuration files with the API URLs:

```typescript
// config/api.ts
export const API_CONFIG = {
  development: {
    core: "https://egf8y8a6m7.execute-api.us-east-1.amazonaws.com/Prod",
    payments: "https://10flr6lsa0.execute-api.us-east-1.amazonaws.com/Prod",
    marketing: "https://v6sor52n30.execute-api.us-east-1.amazonaws.com/Prod",
    notifications:
      "https://uo8sup1tyi.execute-api.us-east-1.amazonaws.com/Prod",
    ssg: "https://zk8yyxnk14.execute-api.us-east-1.amazonaws.com/Prod",
    payroll: "https://bwv0vaw78l.execute-api.us-east-1.amazonaws.com/Prod",
  },
  test: {
    // TEST environment URLs (populate after deploying to test)
    core: "",
    payments: "",
    marketing: "",
    notifications: "",
    ssg: "",
    payroll: "",
  },
  production: {
    // PROD environment URLs (populate after deploying to prod)
    core: "",
    payments: "",
    marketing: "",
    notifications: "",
    ssg: "",
    payroll: "",
  },
};
```

### API Client Example

```typescript
// services/api.ts
import { API_CONFIG } from "./config/api";

const env = process.env.NODE_ENV || "development";
const config = API_CONFIG[env];

export const coreApi = axios.create({ baseURL: config.core });
export const paymentsApi = axios.create({ baseURL: config.payments });
export const marketingApi = axios.create({ baseURL: config.marketing });
export const notificationsApi = axios.create({ baseURL: config.notifications });
export const ssgApi = axios.create({ baseURL: config.ssg });
export const payrollApi = axios.create({ baseURL: config.payroll });

// Usage:
// coreApi.get('/staff/123')
// paymentsApi.post('/create-payment-intent', data)
```

---

## Migration from Monolithic API

If migrating from the existing monolithic API (`rpk7z4swpg`), update your frontend API calls:

| Old Endpoint    | New Microservice | New Base URL Variable  |
| --------------- | ---------------- | ---------------------- |
| `/staff/*`      | Core             | `config.core`          |
| `/salons/*`     | Core             | `config.core`          |
| `/stripe/*`     | Payments         | `config.payments`      |
| `/marketing/*`  | Marketing        | `config.marketing`     |
| `/pusher/*`     | Notifications    | `config.notifications` |
| `/static-web/*` | SSG              | `config.ssg`           |
| `/rollfi/*`     | Payroll          | `config.payroll`       |

---

## Authorization Types

- **Cognito**: Requires valid Cognito JWT token in `Authorization` header
- **Hybrid**: Supports both Cognito JWT and API Key authentication
- **None**: Public endpoint, no authentication required

---

## CORS Configuration

All API Gateways are configured with the following CORS settings:

- **Allowed Origins**: `*`
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token`

All gateway responses (4XX, 5XX, UNAUTHORIZED, ACCESS_DENIED, MISSING_AUTHENTICATION_TOKEN, EXPIRED_TOKEN) include CORS headers.
