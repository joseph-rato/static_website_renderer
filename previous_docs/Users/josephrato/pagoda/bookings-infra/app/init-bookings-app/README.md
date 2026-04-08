# Booking Infrastructure - Microservices Architecture

This repository contains the AWS SAM infrastructure for the Pagoda Labs booking platform, organized into microservices.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INFRA STACK                             │
│  ┌──────────────────┐ ┌──────────────────────────────────────┐  │
│  │   VPC Endpoints  │ │   Scheduler Execution Role           │  │
│  │  (SecretsManager,│ │   (EventBridge Scheduler)            │  │
│  │   Lambda, etc.)  │ │                                      │  │
│  └──────────────────┘ └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│      CORE            │ │   NOTIFICATIONS │ │    PAYMENTS     │
│  2 Monolambda Routers│ │  Pusher Auth    │ │ Stripe Connect  │
│  Salons/Staff        │ │  Notifications  │ │ Payment Intent  │
│  Appointments        │ │  Own API GW     │ │ Webhooks        │
│  ─────────────────── │ │                 │ │ Own API GW      │
│  ALL LAMBDA LAYERS:  │ │                 │ │                 │
│  • DependencyLayer   │ │                 │ │                 │
│  • ServicesUtils     │ │                 │ │                 │
│  • AppointmentUtils  │ │                 │ │                 │
│  • TipUtils, etc.    │ │                 │ │                 │
│  Own API Gateway     │ │                 │ │                 │
└──────────────────────┘ └─────────────────┘ └─────────────────┘
          │
          ├───────────────────┬───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   MARKETING     │ │ STATIC SITE GEN │ │    PAYROLL      │
│   Campaigns     │ │  Website Gen    │ │  RollFi API     │
│   Templates     │ │  Image Upload   │ │  Own API GW     │
│   Own API GW    │ │  Own API GW     │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ MANUAL SCRIPTS  │
                    │  Admin Tools    │
                    │  DB Migrations  │
                    └─────────────────┘
```

> **Note:** Each microservice has its own API Gateway. Lambda layers are centralized in the **core** microservice.

## Directory Structure

```
app/init-bookings-app/
├── parameters-dev.json          # DEV environment parameters
├── parameters-test.json         # TEST environment parameters
├── parameters-prod.json         # PROD environment parameters
├── DEPLOYMENT.md                # Detailed deployment procedures
├── ENDPOINTS.md                 # API endpoint reference
├── shared/                      # Shared resources
│   ├── dependencies/            # Core dependency layer (psycopg2, stripe, etc.)
│   ├── layers/                  # Shared utility layers
│   ├── cognito_triggers/        # Cognito triggers
│   └── init_booking/            # Authorizer code
├── infra/                       # Infrastructure stack
│   └── template.yaml            # VPC endpoints, Scheduler role
├── core/                        # Core business logic + ALL LAYERS
│   ├── template.yaml
│   ├── layers/                  # Core-specific layers (appointment, tip, etc.)
│   ├── router.py                # Primary monolambda router (48 routes)
│   ├── secondary_router.py     # Secondary monolambda router (9 routes: policies, deposit configs)
│   └── endpoints/               # Endpoint handler modules (routed via monolambda)
├── payments/                    # Stripe integration
│   ├── template.yaml
│   └── endpoints/stripe/
├── notifications/               # Pusher integration
│   ├── template.yaml
│   └── endpoints/
├── marketing/                   # Campaign management
│   ├── template.yaml
│   └── endpoints/
├── static-site-generator/       # Website generation
│   ├── template.yaml
│   ├── layers/s3_utils/
│   └── endpoints/
├── payroll/                     # RollFi integration
│   ├── template.yaml
│   ├── layers/rollfi_utils/
│   └── endpoints/
└── manual-scripts/              # Admin scripts & migrations
    ├── template.yaml
    └── scripts/
```

## Quick Start

### Prerequisites

- AWS CLI configured
- AWS SAM CLI installed
- Python 3.12
- jq (for parameter parsing)

### Development (Hot Reload)

```bash
# Sync a specific microservice
./sync.sh core
./sync.sh payments
./sync.sh notifications
```

### Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

```bash
# 1. Deploy infra first (rarely needed - VPC endpoints, Scheduler role)
./deploy.sh dev infra

# 2. Deploy core (contains all Lambda layers)
./deploy.sh dev core

# 3. Update parameters-dev.json with core outputs (layer ARNs)

# 4. Deploy notifications
./deploy.sh dev notifications

# 5. Update parameters-dev.json with PusherNotificationFunctionArn

# 6. Redeploy core to enable Pusher integration
./deploy.sh dev core

# 7. Deploy remaining microservices
./deploy.sh dev payments
./deploy.sh dev marketing
./deploy.sh dev ssg
./deploy.sh dev payroll
./deploy.sh dev scripts
```

## Microservices

| Stack                     | Description             | Key Resources                                                                                           |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **infra**                 | Shared infrastructure   | VPC Endpoints, Scheduler IAM Role                                                                       |
| **core**                  | Core business logic     | 2 Monolambda Routers (57 routes), Salons, Staff, Clients, Services, Appointments, **ALL Lambda Layers** |
| **payments**              | Payment processing      | Stripe Connect, Payment Intents, Webhooks                                                               |
| **notifications**         | Real-time notifications | Pusher Auth, Notification Management                                                                    |
| **marketing**             | Campaign management     | Templates, Campaigns, Compliance                                                                        |
| **static-site-generator** | Website building        | Preview, Deploy, Domains, Images                                                                        |
| **payroll**               | Payroll integration     | RollFi API Integration                                                                                  |
| **manual-scripts**        | Admin tools             | Database init, Migrations, Manual operations                                                            |

## Configuration

Parameters are stored in JSON files per environment (`parameters-dev.json`, etc.).

### After Deploying Infra Stack

Update `parameters-<env>.json` with:

- `SchedulerExecutionRoleArn`

### After Deploying Core Stack

Update `parameters-<env>.json` with layer ARNs:

- `DependencyLayerArn`
- `ServicesUtilsLayerArn`
- `AppointmentUtilsLayerArn`
- `SubLineItemUtilsLayerArn`
- `FaronCustomLogicUtilsLayerArn`
- `TipUtilsLayerArn`

And function ARNs:

- `ProcessAppointmentReminderFunctionArn`

### After Deploying Notifications Stack

Update `parameters-<env>.json` with:

- `PusherNotificationFunctionArn` (**⚠️ Critical: Then redeploy core**)

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment procedures and troubleshooting
- [ENDPOINTS.md](./ENDPOINTS.md) - API endpoint reference for frontend integration

## Cursor Rules

This project includes Cursor rules for AI-assisted development:

| Rule                                        | Purpose                                 |
| ------------------------------------------- | --------------------------------------- |
| `.cursor/rules/microservice-deployment.mdc` | Deployment order and dependencies       |
| `.cursor/rules/create-api-endpoints.mdc`    | Creating new API endpoints              |
| `.cursor/rules/update-data-model.mdc`       | Database schema changes and migrations  |
| `.cursor/rules/update-lambda-layer.mdc`     | Layer ARN propagation across parameters |
