# Backend & Lambda Architecture

## System Overview

The publishing pipeline converts a PageDocument JSON into a static HTML page served via CloudFront. The system spans three layers: a Python backend (REST API + database), a Node.js Lambda (SSR renderer), and S3/CloudFront for static hosting.

```
                              Sequence Diagram
 
  Editor (React)        Backend (Python)        Lambda (Node.js)       S3 / CDN
  ──────────────        ────────────────        ────────────────       ────────
       │                      │                       │                   │
       │  PUT /page-json      │                       │                   │
       │─────────────────────>│                       │                   │
       │                      │  store JSONB           │                   │
       │                      │──(PostgreSQL)          │                   │
       │   200 OK             │                       │                   │
       │<─────────────────────│                       │                   │
       │                      │                       │                   │
       │  POST /publish       │                       │                   │
       │─────────────────────>│                       │                   │
       │                      │  invoke with JSON     │                   │
       │                      │──────────────────────>│                   │
       │                      │                       │  validate JSON    │
       │                      │                       │  renderToString   │
       │                      │                       │  ────────────>    │
       │                      │                       │  PUT index.html   │
       │                      │                       │──────────────────>│
       │                      │    HTML path + hash   │                   │
       │                      │<──────────────────────│                   │
       │  200 { url }         │                       │                   │
       │<─────────────────────│                       │                   │
       │                      │                       │                   │
  User visits site            │                       │    CloudFront     │
  ────────────────────────────│───────────────────────│──> serves HTML <──│
                              │                       │   (Lambda@Edge    │
                              │                       │    routes Host)   │
```

---

## Backend Responsibilities

The Python backend (Django/FastAPI running in the existing bookings-infra repo) owns:

1. **Storage** -- PageDocument JSON is stored as a JSONB column in PostgreSQL alongside the existing salon record. This preserves version history via the existing audit trail.
2. **REST API** -- Exposes endpoints for the editor to read, write, and publish page documents.
3. **Orchestration** -- On publish, the backend invokes the rendering Lambda with the full PageDocument, then records the resulting S3 path.

### Endpoints

| Method | Path                          | Purpose                                    |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/page-json/{salon_id}`       | Return the current PageDocument for a salon |
| PUT    | `/page-json/{salon_id}`       | Save/update the PageDocument (editor save)  |
| POST   | `/publish/{salon_id}`         | Trigger render + deploy to S3               |

#### GET /page-json/{salon_id}

Returns the latest saved PageDocument JSON. If no document exists yet, the backend runs the transform function on the salon's existing `preview_input` + `database_data` to produce one on the fly.

#### PUT /page-json/{salon_id}

Accepts a full PageDocument JSON body. The backend validates it using the same Ajv schema (via a thin Python wrapper or by calling the Lambda's validate endpoint) before persisting.

#### POST /publish/{salon_id}

1. Loads the PageDocument from the database.
2. Invokes the rendering Lambda (synchronous `RequestResponse` invocation).
3. Lambda returns rendered HTML + critical CSS.
4. Backend records the S3 path and invalidates the CloudFront cache for the salon's path.

---

## Lambda Handler

The rendering Lambda is a Node.js 18+ function that imports `@pagoda/renderer`.

```ts
// Simplified handler pseudocode
import { validatePageDocument } from "@pagoda/schema";
import { renderToString } from "@pagoda/renderer";

export async function handler(event: { pageDocument: PageDocument }) {
  const { pageDocument } = event;

  // 1. Validate
  const validation = validatePageDocument(pageDocument);
  if (!validation.valid) {
    return { statusCode: 400, body: { errors: validation.errors } };
  }

  // 2. Render
  const { html, css } = renderToString(pageDocument);

  // 3. Compose full HTML document
  const fullHtml = wrapInHtmlShell(html, css, pageDocument.metadata);

  // 4. Upload to S3
  const key = `external/${companySlug}/index.html`;
  await s3.putObject({ Bucket: BUCKET, Key: key, Body: fullHtml, ContentType: "text/html" });

  return { statusCode: 200, body: { key, contentHash: sha256(fullHtml) } };
}
```

Key characteristics:

- **Stateless.** Every invocation receives the full PageDocument; no database access.
- **Deterministic.** Same JSON input always produces identical HTML output.
- **Fast.** React `renderToString` for a single-page salon site completes in < 200ms.

---

## Storage

### JSON (PostgreSQL)

The PageDocument lives in a JSONB column on the existing `salon_websites` table (or a new `salon_page_documents` table):

```sql
ALTER TABLE salon_websites
  ADD COLUMN page_document JSONB,
  ADD COLUMN page_document_version VARCHAR(20);
```

Benefits of JSONB:

- Full-document queries (`page_document->'theme'->'colors'->>'primary'`).
- GIN indexing if search is needed later.
- Atomic updates via the existing Django ORM / SQLAlchemy.

### HTML (S3)

Rendered HTML is stored at a predictable path:

```
s3://{bucket}/external/{company_slug}/index.html   -- production
s3://{bucket}/internal/{company_slug}/index.html   -- preview/draft
```

This matches the existing path convention used by the current Jinja2 system, so no CDN routing changes are required.

---

## CDN (CloudFront)

The existing CloudFront distribution and Lambda@Edge router remain unchanged:

- **Lambda@Edge** (origin-request trigger) maps the `Host` header to the correct S3 prefix using the Domain Lookup API.
- **Wildcard SSL** covers all `*.getpagoda.site` subdomains.
- **Custom domains** are handled by per-salon Route53 records + ACM certificates.

No changes to CDN infrastructure are required for this migration. The only difference is that the HTML files in S3 are now produced by the Node.js Lambda instead of the Python Jinja2 generator.

---

## Key Constraint: No HTML Parsing

HTML is a **write-only output** in this architecture. At no point does any component of the system:

- Parse HTML to extract data
- Diff HTML documents
- Store HTML as a source of truth

If a change is needed, the PageDocument JSON is modified and re-rendered. This eliminates an entire class of bugs related to HTML parsing, string manipulation, and template inheritance.

---

## Error Handling

| Failure Point            | Behavior                                                    |
|--------------------------|-------------------------------------------------------------|
| Invalid PageDocument     | Lambda returns 400 with Ajv validation errors               |
| Render crash             | Lambda returns 500; backend retries once, then surfaces error |
| S3 upload failure        | Lambda returns 500; backend retries                         |
| Lambda timeout           | Backend receives timeout error; no partial write to S3      |
| CloudFront invalidation  | Non-blocking; old content served until propagation (1-2 min) |
