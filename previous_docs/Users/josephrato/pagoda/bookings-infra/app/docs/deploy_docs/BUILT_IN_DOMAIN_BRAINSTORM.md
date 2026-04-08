# Built-In Subdomain Flow Brainstorm

Goal: support salons choosing a `something.pagoda.site` style URL in the "Built-In Domain" UI tab. We need to ensure subdomain availability, claim/reserve it, and propagate the routing so the public site resolves immediately.

---

## User Flow Assumptions (from UI)

1. User navigates to _Settings ▸ Website ▸ URL_.
2. Selects **Built-In Domain**, types desired subdomain, e.g., `crownofbeauty`.
3. UI shows availability indicator ("URL is available" or error).
4. When confirmed, we persist the choice and make the subdomain live (likely instantly via wildcard + routing).
5. We should display DNS records only for custom domains; built-in presumably just works.

---

## Key Technical Requirements

### 1. Availability Checking

- **Constraints**:
  - Accept `lowercase alphanumeric + hyphen`; reject leading/trailing hyphen, consecutive hyphen? to avoid awkward hostnames.
  - Enforce minimum length (>=3) and maximum (<=63 for label).
  - Reserve certain names (e.g., `www`, `admin`, `support`).
  - Prevent collisions with existing salons’ subdomains (case-insensitive).
  - Ensure subdomain is unique across **both** built-in and custom domain entries (no duplicates like `crownofbeauty.pagoda.site` and custom domain alias pointing to same path unless allowed).

- **Data Storage**:
  - `salon_custom_domains` table should include a `domain_type = 'built_in'` row for the selected subdomain.
  - Store mapping `custom_domain='crownofbeauty.pagoda.site'` → `company_name` (or `salon_id`).
  - Possibly maintain `is_primary` flag or `active` status.

- **Endpoint**:
  - `GET /static-web-generator/subdomains/check?name=crownofbeauty` returning `{ "available": true, "reason": null }`.
  - Should rate-limit or throttle to avoid brute force.
  - Query existing DB entries (built-in + custom) and check against reserved list.

### 2. Claim / Reserve Subdomain

- **Endpoint**: `POST /static-web-generator/{salon_id}/subdomains`
  - Body: `{ "subdomain": "crownofbeauty" }`
  - Steps:
    1. Validate format & reserved names.
    2. Check availability (transactional to avoid race condition).
    3. Insert/Update DB record (`domain_type='built_in'`, `status='active'`), storing timestamps.
    4. Possibly update salon profile table to reference built-in domain (if needed for quick lookups).
  - Should be idempotent: posting same subdomain for same salon returns success.
  - If salon edits to new subdomain, mark old row as `released` and create new `active` row.

- **Race Conditions**: Use DB unique index on `custom_domain` to avoid duplicates. On conflict, return HTTP 409.

### 3. Routing / Infrastructure

- **Preferred Approach**: Use wildcard DNS + CloudFront function.
  - `*.pagoda.site` CNAME to CloudFront distribution.
  - CloudFront (Function/Lambda@Edge) parses host to extract subdomain and map to company folder (as per `HYBRID_APPROACH.md`).
  - Built-in subdomains should not require Route 53 changes per salon (wildcard covers it).
  - Ensure `salon_custom_domains` entry includes `company_name` or direct S3 path for router to use.

### 4. Existing Salon Migration

- Need script/migration to backfill subdomains for salons already using built-in domain (maybe stored elsewhere). Identify existing source of truth (maybe `salons.website_url`).
- Map old data into new table structure.

### 5. Error Messaging & Edge Cases

- Subdomain already taken.
- Contains disallowed terms (e.g. `pagoda`, `booking`, `app`).
- Salon trying to claim new subdomain while custom domain active? (Allow both; built-in as fallback.)
- Release flow (if salon switches to custom domain only) – maybe keep built-in reserved or free it after confirmation.

### 6. Audit & Logging

- Log every availability check (with sanitized name) and decision path.
- When claiming, log `salon_id`, subdomain, prior subdomain (if any).
- Possibly keep history table `salon_subdomain_history` for accountability.

### 7. UI Integration

- Availability endpoint should respond quickly (cached reserved list?).
- After claim, UI should call an endpoint to fetch current built-in domain to display.
  - `GET /static-web-generator/{salon_id}/subdomains/current` returning `{ "subdomain": "crownofbeauty" }`.
- Provide helpful error messages (e.g., "Contains invalid characters", "Reserved word").

### 8. Testing Strategy

- Unit tests for validation (allowed/disallowed names, reserved names list).
- Integration tests ensuring two concurrent claims for same name results in one 409.
- End-to-end (SAM local) verifying CloudFront routing uses subdomain.

### 9. Open Questions

- Do we enforce single built-in domain per salon, or allow multiple historical records? Probably single active, but keep history.
- Should we auto-generate a default subdomain when salon is created (e.g., slugified salon name)? If so, availability and uniqueness required at onboarding.
- Are there analytics/metrics needed (e.g., count of active built-in domains)?
- Should built-in domain use same register-domain table or separate? (Recommend reusing `salon_custom_domains` with `domain_type='built_in'`.)

---

## Summary of Proposed Endpoints (New)

| Method              | Path                                                  | Purpose                                          |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `GET`               | `/static-web-generator/subdomains/check?name=xxx`     | Validate availability + reserved keyword check.  |
| `POST`              | `/static-web-generator/{salon_id}/subdomains`         | Claim/update built-in subdomain for salon.       |
| `GET`               | `/static-web-generator/{salon_id}/subdomains/current` | Fetch current built-in subdomain for UI display. |
| `DELETE` (optional) | `/static-web-generator/{salon_id}/subdomains/{name}`  | Release old subdomain (if we allow re-use).      |

These endpoints plus the existing routing plans will allow the "Built-In Domain" UI to function end-to-end.
