# Template Input Requirements

This document provides comprehensive information about the input requirements and schemas for both template generation endpoints.

## Table of Contents

1. [Overview](#overview)
2. [generate_preview Endpoint](#generate_preview-endpoint)
3. [populate_site_template Endpoint](#populate_site_template-endpoint)
4. [Schema Structure](#schema-structure)
5. [Field Reference](#field-reference)

---

## Overview

There are two endpoints for generating website templates:

1. **`generate_preview`** - Strict validation, requires all mandatory fields
2. **`populate_site_template`** - Flexible, all fields optional with placeholders

### Endpoint Locations

- **generate_preview**: `POST /static-web-generator/{salon_id}/generate-preview`
- **populate_site_template**: `POST /populate-site-template` (or similar route)

---

## generate_preview Endpoint

### Input Model

- **Class**: `PreviewInputModel`
- **Location**: `endpoints/generate_preview/input_model/preview_input_model.py`
- **Validation**: Strict - required fields must be present

### Required Fields

All of these fields **MUST** be provided:

#### Top-Level Required Fields

| Field          | Type   | Description                    |
| -------------- | ------ | ------------------------------ |
| `color`        | object | Color configuration            |
| `font`         | object | Font configuration             |
| `hero_section` | object | Hero section configuration     |
| `our_services` | object | Services section configuration |
| `find_us`      | object | Find Us section configuration  |
| `booking_link` | object | Booking link configuration     |

#### Nested Required Fields

**`color` object:**

- `primary_color` (string, hex color) - **REQUIRED**
- `secondary_color` (string, hex color) - **REQUIRED**

**`font` object:**

- `primary_font` (string) - **REQUIRED**
- `secondary_font` (string) - **REQUIRED**

**`hero_section` object:**

- `header` (string) - **REQUIRED**
- `subhead` (string) - Optional
- `include_book_now_button` (boolean) - Optional (defaults to `false`)
- `image` (string, URL) - Optional
- `text` (string, rich text) - Optional ✅ NEW - Rich text field for hero section content
- `book_link_copy` (string) - Optional ✅ NEW - Button text, defaults to "Book Now" if `include_book_now_button` is `true`

**`our_services` object:**

- `header` (string) - **REQUIRED** - Maps to `title` in template
- `subtitle` (string) - Optional ✅ NEW - Short text (max 200 characters). Rendered separately from `body`.
- `subtext` (string) - Optional ⚠️ LEGACY - Legacy field, maps to internal `content` field (used if `default` is not provided)
- `default` (string) - Optional ⚠️ LEGACY - Legacy field, maps to internal `content` field (used if `subtext` is not provided)
- `body` (string, rich text) - Optional ✅ NEW - Rich text field for longer content (no character limit). Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.
- `menu_note` (string) - Optional ✅ NEW - Pricing note shown above service menu

**Note:** There is no `content` API field. The internal `content` field is derived from `subtext` (preferred) or `default` (fallback). Both `subtitle` and `body` are rendered separately in the template.

**API Field to Template Mapping:**
| API Field | Internal Field | Rendered In Template |
|-----------|---------------|---------------------|
| `our_services.header` | `Services.title` | Yes (required) |
| `our_services.subtitle` | `Services.subtitle` | Yes (if provided) |
| `our_services.subtext` | `Services.content` | Yes (if provided, legacy) |
| `our_services.default` | `Services.content` | Yes (if `subtext` not provided, legacy) |
| `our_services.body` | `Services.body` | Yes (if provided, new field) |
| `our_services.menu_note` | `Services.menu_note` | Yes (if provided) |

**`find_us` object:**

- `title` (string) - **REQUIRED**
- `subtitle` (string) - **REQUIRED**
- `google_maps` (boolean) - **REQUIRED** - Whether to show Google Maps iframe

**`booking_link` object:**

- `url` (string) - **REQUIRED** - Booking URL for the "Book Now" button

### Optional Fields

| Field                | Type   | Description                                                                |
| -------------------- | ------ | -------------------------------------------------------------------------- |
| `company_name`       | string | Company/salon name                                                         |
| `banner`             | object | Banner section                                                             |
| `announcement_modal` | object | Announcement modal popup                                                   |
| `service_highlights` | object | Service highlights section (if not provided, section won't appear in HTML) |
| `testimonials`       | object | Testimonials section                                                       |
| `gallery`            | object | Gallery section                                                            |
| `socials`            | object | Social media links                                                         |
| `team`               | object | Team section                                                               |
| `template_type`      | string | Template type (optional, defaults to `"generic"`)                          |

**`banner` object (optional):**

- `title` (string) - Optional - Banner title (defaults to "Announcement" if not provided)
- `content` (string) - **REQUIRED** if banner provided
- `text_color` (string, hex color) - Optional
- `background_color` (string, hex color) - Optional

**`announcement_modal` object (optional):**

- `title` (string) - **REQUIRED** if modal provided
- `body` (string) - **REQUIRED** if modal provided
- `items` (array of strings) - Optional
- `call_to_action` (string) - Optional
- `background_color` (string, hex color) - Optional
- `text_color` (string, hex color) - Optional

**`service_highlights` object (optional):**

- `highlights` (array) - **REQUIRED** if service_highlights provided - Must contain **1-4 items** ✅ UPDATED (was exactly 3)
  - Each item:
    - `icon` (string) - **REQUIRED** - Must be valid Tabler icon name
    - `title` (string) - Optional
    - `body` (string) - Optional
    - `id` (integer) - Optional (for ordering)
- **Note**: If `service_highlights` is not provided, the service highlights section will not appear in the generated HTML.

**`testimonials` object (optional):**

- `title` (string) - **REQUIRED** if testimonials provided ✅ NEW
- `subtitle` (string) - Optional ✅ NEW
- `text` (string, rich text) - Optional ✅ NEW - Rich text content for testimonials section
- `testimonials` (array) - Optional, max 5 items
  - Each item:
    - `name` (string) - **REQUIRED** if testimonial provided
    - `content` (string) - **REQUIRED** if testimonial provided
    - `picture` (string, URL) - Optional
    - `source` (string) - Optional

**`gallery` object (optional):**

- `title` (string) - **REQUIRED** if gallery provided ✅ UPDATED (was optional, defaults to "Photos")
- `items` (array) - Optional, max 12 items ✅ UPDATED (was max 20)
  - Each item:
    - `image_url` (string) - **REQUIRED** if item provided
    - `title` (string) - Optional
    - `description` (string) - Optional
- `grid_layout` (string) - Optional (default: `"middle_expand"`)

**`socials` object (optional):**

- `twitter_url` (string) - Optional
- `facebook_url` (string) - Optional
- `instagram_url` (string) - Optional
- `tiktok_url` (string) - Optional

**`team` object (optional):** ✅ NEW

- `title` (string) - **REQUIRED** if team provided
- `text` (string, rich text) - Optional - Rich text content for team section

### Validation Rules

1. **Service Highlights**: If provided, must have **1-4 items** ✅ UPDATED (was exactly 3)
2. **Service Highlight Icons**: Must be valid Tabler icon names:
   - `IconHeartHandshake`, `IconUser`, `IconBarcode`
3. **Testimonials**: If provided, must have 1-5 items
4. **Testimonials Title**: Required if `testimonials` object provided ✅ NEW
5. **Gallery**: If provided, max **12 items** ✅ UPDATED (was max 20)
6. **Gallery Title**: Required if `gallery` object provided ✅ NEW
7. **Banner Content**: Required if `banner` object provided ✅ NEW
8. **Announcement Modal**: `title` and `body` required if `announcement_modal` provided ✅ NEW
9. **Team Title**: Required if `team` object provided ✅ NEW

### Error Responses

| Error                            | HTTP Status | Message                                                            |
| -------------------------------- | ----------- | ------------------------------------------------------------------ |
| Missing required field           | 400         | `TypeError` or `KeyError` during parsing                           |
| Invalid service highlights count | 400         | `"Service highlights must have between 1 and 4 items"` ✅ UPDATED  |
| Invalid icon name                | 400         | `"Invalid icon name: '{icon}'. Allowed icons: [...]"`              |
| Too many testimonials            | 400         | `"Testimonials cannot exceed 5 items"`                             |
| Too many gallery items           | 400         | `"Gallery cannot exceed 12 items"` ✅ UPDATED (was 20)             |
| Missing testimonials title       | 400         | Error if testimonials provided but title missing ✅ NEW            |
| Missing gallery title            | 400         | Error if gallery provided but title missing ✅ NEW                 |
| Missing banner content           | 400         | Error if banner provided but content missing ✅ NEW                |
| Missing modal fields             | 400         | Error if announcement_modal provided but title/body missing ✅ NEW |
| Missing team title               | 400         | Error if team provided but title missing ✅ NEW                    |

---

## populate_site_template Endpoint

### Input Model

- **Class**: `TemplateInput`
- **Location**: `endpoints/populate_site_template/input_model/template_input_model.py`
- **Schema**: **Matches `PreviewInputModel` structure exactly** - same fields, same nested structure
- **Validation**: None - all fields optional (unlike `generate_preview` where some are required)

### Schema Structure

The `populate_site_template` endpoint uses the **exact same schema structure** as `generate_preview`, but all fields are optional. This means:

1. **Same field names** - All fields from `PreviewInputModel` are available
2. **Same nested structure** - Objects have the same properties
3. **All optional** - Unlike `generate_preview`, no fields are required
4. **Placeholders used** - Missing values are filled with placeholders or fallbacks

### Field Structure (All Optional - Same Schema as generate_preview)

| Field                | Type   | Default/Fallback                                                       | Notes                                                   |
| -------------------- | ------ | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `color`              | object | Fallback: `primary_color: "#FF0000"`, `secondary_color: "#0000FF"`     | Same structure as `PreviewInputModel.Color`             |
| `font`               | object | Fallback: `primary_font: "Times New Roman"`, `secondary_font: "Arial"` | Same structure as `PreviewInputModel.Font`              |
| `hero_section`       | object | Placeholders used                                                      | Same structure as `PreviewInputModel.HeroSection`       |
| `our_services`       | object | Placeholders used                                                      | Same structure as `PreviewInputModel.OurServices`       |
| `find_us`            | object | Placeholders used                                                      | Same structure as `PreviewInputModel.FindUs`            |
| `booking_link`       | object | Placeholders used                                                      | Same structure as `PreviewInputModel.BookingLink`       |
| `service_highlights` | object | None if not provided                                                   | Same structure as `PreviewInputModel.ServiceHighlights` |
| `company_name`       | string | Fallback to DB data or placeholder                                     | Same as `PreviewInputModel`                             |
| `banner`             | object | None if not provided                                                   | Same structure as `PreviewInputModel.Banner`            |
| `announcement_modal` | object | None if not provided                                                   | Same structure as `PreviewInputModel.AnnouncementModal` |
| `testimonials`       | object | None if not provided                                                   | Same structure as `PreviewInputModel.Testimonials`      |
| `gallery`            | object | None if not provided                                                   | Same structure as `PreviewInputModel.Gallery`           |
| `socials`            | object | None if not provided                                                   | Same structure as `PreviewInputModel.Socials`           |
| `team`               | object | None if not provided                                                   | Same structure as `PreviewInputModel.Team`              |
| `template_type`      | string | Default: `"generic"`                                                   | Optional - template type for both endpoints             |

### Fallback Values

**Color Fallbacks:**

- `primary_color`: `"#FF0000"` (red)
- `secondary_color`: `"#0000FF"` (blue)

**Font Fallbacks:**

- `primary_font`: `"Times New Roman"`
- `secondary_font`: `"Arial"`

**Other Fallbacks:**

- `include_book_now_button`: `true`
- `template_type`: `"generic"`
- `find_us.google_maps`: `true`

### Placeholder Strategy

When fields are missing, the system uses placeholders in the format:

```
{{PLACEHOLDER: field.path.here}}
```

Examples:

- `{{PLACEHOLDER: hero_section.header}}`
- `{{PLACEHOLDER: our_services.subtext}}`
- `{{PLACEHOLDER: service_highlights.highlights.0.title}}`

### No Validation Errors

The `populate_site_template` endpoint does not return validation errors. All fields are optional, and placeholders are used for missing values.

### Key Differences from generate_preview

| Aspect               | generate_preview                                           | populate_site_template                                       |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **Schema Structure** | `PreviewInputModel`                                        | `TemplateInput` (matches `PreviewInputModel` structure)      |
| **Required Fields**  | `color`, `font`, `hero_section`, `our_services`, `find_us` | None (all optional)                                          |
| **Validation**       | Strict - validates required fields and constraints         | None - accepts any partial data                              |
| **Missing Values**   | Returns validation errors                                  | Uses placeholders/fallbacks                                  |
| **Field Types**      | Dataclasses (`Color`, `Font`, `HeroSection`, etc.)         | Flexible dataclasses (`FlexibleColor`, `FlexibleFont`, etc.) |
| **Additional Field** | `template_type` (optional, default: `"generic"`)           | `template_type` (optional, default: `"generic"`)             |

---

## Schema Structure

The schema is built dynamically from the field requirements and shows:

- **Required**: Whether a field is required (`true`/`false`)
- **Value**: The current value or structure

### Schema Format

```json
{
  "field_name": {
    "required": true,
    "value": {
      "nested_field": {
        "required": false,
        "value": "actual_value"
      }
    }
  }
}
```

### Schema Fields

The schema includes all fields from both endpoints, with `required` flags indicating whether each field is mandatory for `generate_preview`.

#### Top-Level Schema Fields

| Field                | Required (generate_preview) | Required (populate_site_template) |
| -------------------- | --------------------------- | --------------------------------- |
| `color`              | ✅ Yes                      | ❌ No                             |
| `font`               | ✅ Yes                      | ❌ No                             |
| `hero_section`       | ✅ Yes                      | ❌ No                             |
| `our_services`       | ✅ Yes                      | ❌ No                             |
| `find_us`            | ✅ Yes                      | ❌ No                             |
| `booking_link`       | ✅ Yes                      | ❌ No                             |
| `company_name`       | ❌ No                       | ❌ No                             |
| `banner`             | ❌ No                       | ❌ No                             |
| `announcement_modal` | ❌ No                       | ❌ No                             |
| `service_highlights` | ❌ No                       | ❌ No                             |
| `testimonials`       | ❌ No                       | ❌ No                             |
| `gallery`            | ❌ No                       | ❌ No                             |
| `socials`            | ❌ No                       | ❌ No                             |
| `team`               | ❌ No                       | ❌ No                             |
| `template_type`      | N/A                         | ❌ No                             |

### Nested Field Requirements

**`color` nested fields:**

- `primary_color`: ✅ Required
- `secondary_color`: ✅ Required

**`font` nested fields:**

- `primary_font`: ✅ Required
- `secondary_font`: ✅ Required

**`hero_section` nested fields:**

- `header`: ✅ Required
- `subhead`: ❌ Optional
- `include_book_now_button`: ⚠️ Optional (defaults to `false`)
- `book_link_copy`: ⚠️ Optional (defaults to "Book Now" if `include_book_now_button` is `true`)
- `image`: ❌ Optional
- `text`: ❌ Optional

**`our_services` nested fields:**

- `header`: ✅ Required
- `subtitle`: ❌ Optional ✅ NEW (max 200 characters)
- `subtext`: ❌ Optional ⚠️ LEGACY (legacy field, maps to internal `content` field)
- `default`: ❌ Optional ⚠️ LEGACY (legacy field, maps to internal `content` field if `subtext` is not provided)
- `body`: ❌ Optional ✅ NEW - Rich text field for longer content (no character limit). Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.
- `menu_note`: ❌ Optional ✅ NEW - Pricing note shown above service menu

**Note:** There is no `content` API field. The internal `content` field is derived from `subtext` or `default`. The API fields are: `header`, `subtitle`, `subtext`, `default`, `body`, and `menu_note`.

- `menu_note`: ❌ Optional - Pricing note shown above service menu

**`find_us` nested fields:**

- `title`: ✅ Required
- `subtitle`: ✅ Required
- `google_maps`: ✅ Required (boolean)

**`booking_link` nested fields:**

- `url`: ✅ Required

**Note:** The `booking_link.url` is used to create the `cta_section` object in the template. The `cta_section` has:

- `title`: "Book Now" (used for nav bar button text)
- `url`: Same as `booking_link.url` (used for nav bar and hero section buttons)
- `content`: Not used (kept for compatibility with SectionInput base class)

**`service_highlights` nested fields (optional):**

- `highlights`: ✅ Required if service_highlights provided (array) - **1-4 items** ✅ UPDATED (was exactly 3)
  - `icon`: ✅ Required
  - `title`: ❌ Optional
  - `body`: ❌ Optional
  - `id`: ❌ Optional

**`banner` nested fields:**

- `title`: ❌ Optional (defaults to "Announcement")
- `content`: ✅ Required (if banner provided)
- `text_color`: ❌ Optional
- `background_color`: ❌ Optional

**`announcement_modal` nested fields:**

- `title`: ✅ Required (if modal provided)
- `body`: ✅ Required (if modal provided)
- `items`: ❌ Optional
- `call_to_action`: ❌ Optional
- `background_color`: ❌ Optional
- `text_color`: ❌ Optional

**`testimonials` nested fields:**

- `title`: ✅ Required ✅ NEW (if testimonials provided)
- `subtitle`: ❌ Optional ✅ NEW
- `text`: ❌ Optional ✅ NEW (rich text)
- `testimonials`: ❌ Optional (array)
  - `name`: ✅ Required (if testimonial provided)
  - `content`: ✅ Required (if testimonial provided)
  - `picture`: ❌ Optional
  - `source`: ❌ Optional

**`gallery` nested fields:**

- `title`: ✅ Required ✅ UPDATED (if gallery provided, was optional with default "Photos")
- `items`: ❌ Optional (array) - max **12 items** ✅ UPDATED (was max 20)
  - `image_url`: ✅ Required (if item provided)
  - `title`: ❌ Optional
  - `description`: ❌ Optional
- `grid_layout`: ❌ Optional

**`socials` nested fields:**

- `twitter_url`: ❌ Optional
- `facebook_url`: ❌ Optional
- `instagram_url`: ❌ Optional
- `tiktok_url`: ❌ Optional

**`team` nested fields:** ✅ NEW

- `title`: ✅ Required (if team provided)
- `text`: ❌ Optional (rich text)

---

## Field Reference

### Quick Reference: Minimal Valid Request for `generate_preview`

```json
{
  "color": {
    "primary_color": "#FF0000",
    "secondary_color": "#0000FF"
  },
  "font": {
    "primary_font": "Times New Roman",
    "secondary_font": "Arial"
  },
  "hero_section": {
    "header": "Welcome",
    "include_book_now_button": false
  },
  "find_us": {
    "title": "Find Us",
    "subtitle": "Visit us at our location",
    "google_maps": true
  },
  "booking_link": {
    "url": "https://book.getpagoda.com/book?salonId=..."
  }
  "our_services": {
    "header": "Our Services"
  },
  "find_us": {
    "title": "Find Us",
    "subtitle": "Visit us at our location",
    "google_maps": true
  }
}
```

### Quick Reference: Minimal Valid Request for `populate_site_template`

```json
{}
```

All fields are optional - an empty object is valid!

### Example: Complete Request with Optional Fields

```json
{
  "color": {
    "primary_color": "#FF6B6B",
    "secondary_color": "#4ECDC4"
  },
  "font": {
    "primary_font": "Abhaya Libre",
    "secondary_font": "Inter"
  },
  "hero_section": {
    "header": "Beautiful Hair Salon",
    "subhead": "Your trusted beauty destination",
    "include_book_now_button": true,
    "image": "https://example.com/hero.jpg",
    "text": "<p>Rich text content</p>",
    "book_link_copy": "Book Now"
  },
  "find_us": {
    "title": "Find Us",
    "subtitle": "Visit us at our location",
    "google_maps": true
  },
  "booking_link": {
    "url": "https://book.getpagoda.com/book?salonId=..."
  },
  "service_highlights": {
    "highlights": [
      {
        "icon": "IconBarcode",
        "title": "Award Winning",
        "body": "Recognized for excellence"
      },
      {
        "icon": "IconUser",
        "title": "Caring Staff",
        "body": "Dedicated to your comfort"
      },
      {
        "icon": "IconHeartHandshake",
        "title": "Quality Service",
        "body": "Excellence in every detail"
      }
    ]
  },
  "testimonials": {
    "title": "What Our Clients Say",
    "subtitle": "Hear from our satisfied customers",
    "text": "<p>Read what our clients have to say about us.</p>",
    "testimonials": [
      {
        "name": "Jane Doe",
        "content": "Amazing service!",
        "picture": "https://example.com/jane.jpg"
      }
    ]
  },
  "our_services": {
    "header": "Our Services",
    "subtitle": "Discover our range of beauty treatments",
    "subtext": "Premium salon services",
    "default": "Standard service description",
    "body": "<p>For longer content, use the <strong>body</strong> field with rich text HTML. This field has no character limit and is rendered separately from <em>subtitle</em> and <em>content</em>. Both <em>subtitle</em> and <em>body</em> can be shown together if provided.</p>",
    "menu_note": "Pricing note shown above service menu"
  },
  "gallery": {
    "title": "Photo Gallery",
    "items": [
      {
        "image_url": "https://example.com/gallery1.jpg",
        "title": "Salon Interior",
        "description": "Our beautiful space"
      }
    ]
  },
  "team": {
    "title": "Our Team",
    "text": "<p>Meet our talented professionals.</p>"
  },
  "banner": {
    "title": "Grand Opening",
    "content": "Special promotion this month!",
    "background_color": "#FF6B6B",
    "text_color": "#FFFFFF"
  },
  "announcement_modal": {
    "title": "Welcome!",
    "body": "Check out our new services",
    "items": ["Item 1", "Item 2"],
    "call_to_action": "Book Now",
    "background_color": "#FF6B6B",
    "text_color": "#FFFFFF"
  },
  "socials": {
    "twitter_url": "https://twitter.com/salon",
    "facebook_url": "https://facebook.com/salon",
    "instagram_url": "https://instagram.com/salon",
    "tiktok_url": "https://tiktok.com/@salon"
  }
}
```

---

## Code References

### Input Models

- `PreviewInputModel`: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py`
- `TemplateInput`: `app/init-bookings-app/static-site-generator/endpoints/populate_site_template/input_model/template_input_model.py`

### Schema Builder

- `field_schema_builder.py`: `app/init-bookings-app/static-site-generator/utils/field_schema_builder.py`

### Validation

- `security_validator.py`: `app/init-bookings-app/static-site-generator/validator/security_validator.py`

### Placeholder Utilities

- `placeholder_utils.py`: `app/init-bookings-app/static-site-generator/utils/placeholder_utils.py`

---

## Summary

| Aspect                     | generate_preview                      | populate_site_template             |
| -------------------------- | ------------------------------------- | ---------------------------------- |
| **Validation**             | Strict                                | None                               |
| **Required Fields**        | Many (see above)                      | None                               |
| **Optional Fields**        | Yes (testimonials, gallery, etc.)     | All fields                         |
| **Missing Field Behavior** | ❌ Error (400)                        | ✅ Placeholder/Fallback            |
| **Use Case**               | Production preview with complete data | Template preview with partial data |
| **Schema**                 | Shows required/optional flags         | All fields marked optional         |
