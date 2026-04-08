# Data Transformation Specification

## Purpose

The transform function converts legacy input data (`preview_input` + `database_data`) into a `PageDocument`. This bridges the existing Python API contract with the new JSON schema, allowing the frontend editor and backend to continue using their current data shapes while the renderer works exclusively with PageDocument JSON.

```ts
// packages/transform/src/transform.ts
function transform(previewInput: PreviewInput, databaseData: DatabaseData): PageDocument
```

This is a **pure function** with zero side effects. The existing API contracts remain unchanged.

---

## High-Level Flow

```
  PreviewInput (UI customization)     DatabaseData (operational data)
  ───────────────────────────────     ─────────────────────────────
  color, font, hero_section,          company_name, logo_data,
  our_services, find_us,              contact_details, location_data,
  booking_link, banner, team,         services_data, staff_data,
  testimonials, gallery, socials,     website_url, timezone,
  service_highlights,                 google_analytics_tracking_id
  announcement_modal
            │                                     │
            └──────────────┬──────────────────────┘
                           │
                    transform()
                           │
                           v
                     PageDocument
                 (schemaVersion, metadata, theme, body)
```

---

## Metadata & Theme Mapping

Built by `buildMetadata(previewInput, databaseData)`. Returns both `metadata` and `theme`.

### PageMetadata

| PageDocument Field       | Source                                        | Required |
|--------------------------|-----------------------------------------------|----------|
| `metadata.title`         | `hero_section.header` or `company_name` (fallback) | Yes |
| `metadata.description`   | `hero_section.subhead`                        | No       |
| `metadata.favicon`       | `logo_data.image_url`                         | No       |
| `metadata.fonts`         | `[font.primary_font, font.secondary_font]`    | No       |
| `metadata.analyticsId`   | `databaseData.google_analytics_tracking_id`   | No       |
| `metadata.url`           | `databaseData.website_url`                    | No       |
| `metadata.og.title`      | `hero_section.header`                         | No       |
| `metadata.og.description`| `hero_section.subhead`                        | No       |
| `metadata.og.image`      | `logo_data.image_url`                         | No       |
| `metadata.og.type`       | `"website"` (hardcoded)                       | No       |
| `metadata.twitter.card`  | `"summary_large_image"` (hardcoded)           | No       |
| `metadata.twitter.title` | `hero_section.header`                         | No       |
| `metadata.twitter.description` | `hero_section.subhead`                  | No       |
| `metadata.twitter.image` | `logo_data.image_url`                         | No       |

### ThemeTokens

| PageDocument Field       | Source                          | Required |
|--------------------------|---------------------------------|----------|
| `theme.colors.primary`   | `color.primary_color`           | Yes      |
| `theme.colors.secondary` | `color.secondary_color`         | Yes      |
| `theme.fonts.primary`    | `font.primary_font`             | Yes      |
| `theme.fonts.secondary`  | `font.secondary_font`           | Yes      |

---

## Section Builders

Each section has a dedicated builder function in `packages/transform/src/section-builders/`. Each returns an `SRNode`.

### Navigation

**Builder:** `buildNavigation(logoData, bookingLink, navLinks, banner?)`

| Prop           | Source                        | Notes                                |
|----------------|-------------------------------|--------------------------------------|
| `logoUrl`      | `logo_data.image_url`         |                                      |
| `logoAlt`      | `logo_data.logo_alt_text`     |                                      |
| `bookingUrl`   | `booking_link.url`            |                                      |
| `bookButtonText` | `booking_link.title`        |                                      |
| `navLinks`     | Derived from visible sections | See "Nav Link Derivation" below      |

**Nav Link Derivation:** The transform inspects which optional sections are present in `previewInput` and builds the nav links array:

| Condition                       | Link Added                          |
|---------------------------------|-------------------------------------|
| Always                          | `{ label: "Home", anchor: "#home" }` |
| Always                          | `{ label: "Services", anchor: "#services" }` |
| `previewInput.team` exists      | `{ label: "About", anchor: "#about" }` |
| `previewInput.testimonials` exists | `{ label: "Testimonials", anchor: "#testimonials" }` |

**Banner child:** If `previewInput.banner` exists, a `banner` child node is appended to the navigation node:

| Prop              | Source                      |
|-------------------|-----------------------------|
| `title`           | `banner.title` (nullable)   |
| `content`         | `banner.content`            |
| `textColor`       | `banner.text_color`         |
| `backgroundColor` | `banner.background_color`   |

**Node:** `{ type: "navigation", id: "navigation" }`

---

### Hero

**Builder:** `buildHero(heroSection, bookingUrl)`

| Prop             | Source                              | Notes                    |
|------------------|-------------------------------------|--------------------------|
| `header`         | `hero_section.header`               | Required                 |
| `subhead`        | `hero_section.subhead`              |                          |
| `imageUrl`       | `hero_section.image`                |                          |
| `richText`       | `hero_section.text`                 | Nullable -> undefined    |
| `showBookButton` | `hero_section.include_book_now_button` |                       |
| `bookButtonText` | `hero_section.book_link_copy`       |                          |
| `bookingUrl`     | `booking_link.url` (passed through) |                          |

**Node:** `{ type: "hero", id: "home" }`

---

### Services Menu

**Builder:** `buildServicesMenu(ourServices, services, bookingUrl)`

| Prop            | Source                                     | Notes                           |
|-----------------|--------------------------------------------|---------------------------------|
| `title`         | `our_services.header`                      | Required                        |
| `subtitle`      | `our_services.subtitle`                    | Nullable -> undefined           |
| `content`       | `our_services.subtext ?? our_services.default` | Legacy field resolution     |
| `body`          | `our_services.body`                        | Nullable -> undefined           |
| `menuNote`      | `our_services.menu_note`                   | Nullable -> undefined           |
| `bookingUrl`    | `booking_link.url` (passed through)        |                                 |
| `serviceGroups` | Grouped from `databaseData.services_data.services` | See below            |

**Service grouping:** Database services are grouped by `service_type` into `ServiceGroup[]`:

```
DatabaseService { id, name, description, service_type, default_price,
                  default_is_variable_price, default_duration_mins }
    |
    v
ServiceItem { id, name, description, price, isVariablePrice, durationMins }
    grouped by service_type ->
ServiceGroup { category: service_type, services: ServiceItem[] }
```

**Node:** `{ type: "services-menu", id: "services" }`

---

### Service Highlights

**Builder:** `buildServiceHighlights(serviceHighlights)`

| Prop         | Source                            |
|--------------|-----------------------------------|
| `highlights` | `service_highlights.highlights[]` mapped 1:1 |

Each highlight: `{ icon, title, body }` -- direct passthrough, no renaming needed.

**Node:** `{ type: "service-highlights", id: "highlights" }`

---

### Team

**Builder:** `buildTeam(team, staffMembers)`

| Prop       | Source                               | Notes                    |
|------------|--------------------------------------|--------------------------|
| `title`    | `team.title ?? "Our Team"`           | Default if not provided  |
| `richText` | `team.text`                          | Rich HTML                |
| `members`  | `databaseData.staff_data.staff_members[]` | See mapping below  |

**Staff member mapping (snake_case -> camelCase):**

| TeamMember Field | DatabaseStaffMember Field | Notes     |
|------------------|---------------------------|-----------|
| `id`             | `id`                      |           |
| `firstName`      | `first_name`              |           |
| `lastName`       | `last_name`               |           |
| `title`          | `title`                   |           |
| `bio`            | `bio`                     |           |
| `photoUrl`       | `photo_url`               |           |
| `email`          | `email`                   |           |
| `specialties`    | `specialties`             | string[]  |

**Node:** `{ type: "team", id: "about" }`

---

### Testimonials

**Builder:** `buildTestimonials(testimonials)`

| Prop           | Source                                | Notes                 |
|----------------|---------------------------------------|-----------------------|
| `title`        | `testimonials.title`                  |                       |
| `subtitle`     | `testimonials.subtitle`               |                       |
| `richText`     | `testimonials.text`                   | Nullable -> undefined |
| `testimonials` | `testimonials.testimonials[]` mapped  | See below             |

**Testimonial mapping:**

| Testimonial Field | PreviewInputTestimonial Field | Notes                 |
|-------------------|-------------------------------|-----------------------|
| `name`            | `name`                        |                       |
| `content`         | `content`                     | Rich HTML             |
| `pictureUrl`      | `picture`                     | Nullable -> undefined |
| `source`          | `source`                      |                       |

**Node:** `{ type: "testimonials", id: "testimonials" }`

---

### Gallery

**Builder:** `buildGallery(gallery)`

| Prop         | Source                      | Notes    |
|--------------|-----------------------------|----------|
| `title`      | `gallery.title`             |          |
| `gridLayout` | `gallery.grid_layout`       |          |
| `items`      | `gallery.items[]` mapped    | See below |

**Gallery item mapping:**

| GalleryItem Field | PreviewInputGalleryItem Field | Notes                 |
|-------------------|-------------------------------|-----------------------|
| `imageUrl`        | `image_url`                   |                       |
| `title`           | `title`                       |                       |
| `description`     | `description`                 | Nullable -> undefined |

**Node:** `{ type: "gallery", id: "gallery" }`

---

### Find Us

**Builder:** `buildFindUs(findUs, contactDetails, locationData, socials?)`

| Prop             | Source                          | Notes                 |
|------------------|---------------------------------|-----------------------|
| `title`          | `find_us.title`                 |                       |
| `subtitle`       | `find_us.subtitle`              | Nullable -> undefined |
| `showGoogleMaps` | `find_us.google_maps`           | boolean               |
| `address`        | `contact_details.address`       |                       |
| `phone`          | `contact_details.phone`         |                       |
| `email`          | `contact_details.email`         |                       |
| `latitude`       | `location_data.latitude`        |                       |
| `longitude`      | `location_data.longitude`       |                       |
| `mapUrl`         | `location_data.map_url`         |                       |
| `hours`          | `contact_details.hours`         | Record<string,string> |
| `socials`        | Mapped from `previewInput.socials` | See social mapping |

**Node:** `{ type: "find-us", id: "find-us" }`

---

### Footer

**Builder:** `buildFooter(companyName, contactDetails, bookingUrl, socials?)`

| Prop          | Source                                            |
|---------------|---------------------------------------------------|
| `companyName` | `previewInput.company_name ?? databaseData.company_name` |
| `phone`       | `contact_details.phone`                           |
| `email`       | `contact_details.email`                           |
| `address`     | `contact_details.address`                         |
| `bookingUrl`  | `booking_link.url`                                |
| `socials`     | Mapped from `previewInput.socials`                |

**Node:** `{ type: "footer", id: "footer" }`

---

### Announcement Modal

**Builder:** `buildAnnouncementModal(announcementModal)`

| Prop              | Source                              |
|-------------------|-------------------------------------|
| `title`           | `announcement_modal.title`          |
| `body`            | `announcement_modal.body`           |
| `items`           | `announcement_modal.items`          |
| `callToAction`    | `announcement_modal.call_to_action` |
| `backgroundColor` | `announcement_modal.background_color` |
| `textColor`       | `announcement_modal.text_color`     |

**Node:** `{ type: "announcement-modal", id: "announcement-modal" }`

---

## Social Links Mapping

Used by both `find-us` and `footer` builders:

| SocialLinks Field | PreviewInputSocials Field | Notes                 |
|-------------------|---------------------------|-----------------------|
| `instagram`       | `instagram_url`           | Nullable -> undefined |
| `facebook`        | `facebook_url`            | Nullable -> undefined |
| `twitter`         | `twitter_url`             | Nullable -> undefined |
| `tiktok`          | `tiktok_url`              | Nullable -> undefined |

---

## Conditional Section Inclusion

Sections are included in the `body` array only when their data exists in `previewInput`:

| Section              | Condition                                  | Always? |
|----------------------|--------------------------------------------|---------|
| `announcement-modal` | `previewInput.announcement_modal` exists   | No      |
| `navigation`         | Always included                            | Yes     |
| `hero`               | Always included                            | Yes     |
| `services-menu`      | Always included                            | Yes     |
| `service-highlights` | `previewInput.service_highlights` exists    | No      |
| `team`               | `previewInput.team` exists                 | No      |
| `testimonials`       | `previewInput.testimonials` exists         | No      |
| `gallery`            | `previewInput.gallery` exists              | No      |
| `find-us`            | Always included                            | Yes     |
| `footer`             | Always included                            | Yes     |

Sections appear in the `body` array in the order listed above (render order).

---

## Legacy Field Resolution

The `our_services` section has legacy fields that need special handling:

```ts
// The "content" prop is derived from legacy fields:
content: ourServices.subtext ?? ourServices.default ?? undefined
```

- `subtext` takes priority over `default`
- Both are legacy fields from the original Python API
- The new `body` field (rich HTML) is separate and rendered independently
- Both `subtitle` and `body` can coexist

---

## Required vs Optional Fields

### Required in PreviewInput (transform will fail without these)

- `color.primary_color`, `color.secondary_color`
- `font.primary_font`, `font.secondary_font`
- `hero_section.header`
- `our_services.header`
- `find_us.title`, `find_us.google_maps`
- `booking_link.url`

### Required in DatabaseData (transform will fail without these)

- `company_name`
- `logo_data` (full object)
- `contact_details` (full object)
- `location_data` (full object)
- `services_data.services` (array, may be empty)
- `staff_data.staff_members` (array, may be empty)

---

## Source Files

| File | Description |
|------|-------------|
| `packages/transform/src/transform.ts` | Main transform function |
| `packages/transform/src/legacy-types/preview-input.ts` | PreviewInput type definitions |
| `packages/transform/src/legacy-types/database-data.ts` | DatabaseData type definitions |
| `packages/transform/src/section-builders/*.ts` | Individual section builder functions |
