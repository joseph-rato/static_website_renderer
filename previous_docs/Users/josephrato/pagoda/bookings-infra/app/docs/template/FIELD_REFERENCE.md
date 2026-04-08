# Template Preview Field Reference

Complete reference of all fields, their requirement status, and current implementation behavior.

> **Note:** For a comparison between the specification and current implementation, see [SPEC_VS_IMPLEMENTATION.md](./SPEC_VS_IMPLEMENTATION.md)

## Endpoints

1. **`generate_preview`** - Uses `PreviewInputModel` (strict validation)
2. **`populate_site_template`** - Uses `TemplateInput` (flexible, all optional)

---

## Field Reference Table

### Top-Level Fields

| Field                | Type   | `generate_preview`              | `populate_site_template`        | Missing Behavior                 |
| -------------------- | ------ | ------------------------------- | ------------------------------- | -------------------------------- |
| `color`              | object | **REQUIRED**                    | Optional                        | See `color.*` below              |
| `font`               | object | **REQUIRED**                    | Optional                        | See `font.*` below               |
| `default_section`    | object | **REQUIRED**                    | Optional                        | See `default_section.*` below    |
| `hero_section`       | object | **REQUIRED**                    | Optional                        | See `hero_section.*` below       |
| `our_services`       | object | **REQUIRED**                    | Optional                        | See `our_services.*` below       |
| `service_highlights` | object | **REQUIRED**                    | Optional                        | See `service_highlights.*` below |
| `about_us`           | object | **REQUIRED**                    | Optional                        | See `about_us.*` below           |
| `company_name`       | string | Optional                        | Optional                        | See details below                |
| `testimonials`       | object | Optional                        | Optional                        | See `testimonials.*` below       |
| `gallery`            | object | Optional                        | Optional                        | See `gallery.*` below            |
| `socials`            | object | Optional                        | Optional                        | See `socials.*` below            |
| `find_us`            | object | ✅ **REQUIRED**                 | Optional                        | See `find_us.*` below            |
| `booking_link`       | object | ✅ **REQUIRED**                 | Optional                        | See `booking_link.*` below       |
| `banner`             | object | Optional                        | Optional                        | See `banner.*` below             |
| `announcement_modal` | object | Optional                        | Optional                        | See `announcement_modal.*` below |
| `team`               | object | Optional                        | Optional                        | See `team.*` below               |
| `template_type`      | string | Optional (default: `"generic"`) | Optional (default: `"generic"`) | Uses default `"generic"`         |

---

## Detailed Field Specifications

### 1. `color` Object

#### `color.primary_color`

- **Type:** `string` (hex color code)
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Fallback to `"#FF0000"` (red)
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py:11`
  - Fallback constant: `FALLBACK_PRIMARY_COLOR = "#FF0000"`

#### `color.secondary_color`

- **Type:** `string` (hex color code)
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Fallback to `"#0000FF"` (blue)
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py:12`
  - Fallback constant: `FALLBACK_SECONDARY_COLOR = "#0000FF"`

---

### 2. `font` Object

#### `font.primary_font`

- **Type:** `string` (font name)
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Fallback to `"Times New Roman"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py:13`
  - Fallback constant: `FALLBACK_PRIMARY_FONT = "Times New Roman"`

#### `font.secondary_font`

- **Type:** `string` (font name)
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Fallback to `"Arial"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py:14`
  - Fallback constant: `FALLBACK_SECONDARY_FONT = "Arial"`

---

### 3. `default_section` Object

#### `default_section.about_us_default`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Used for banner content if provided, otherwise `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/input_models.py:56-73`
  - Used to create `Banner` section if content exists

#### `default_section.salon_experience_default`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Used for banner content if provided, otherwise `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/input_models.py:56-73`
  - Used to create `Banner` section if content exists

---

### 4. `hero_section` Object

#### `hero_section.header`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: hero_section.header}}"` OR uses `company_name` as fallback
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:176-180`
  - Used as tagline title

#### `hero_section.subhead`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: hero_section.subhead}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:181-185`
  - Used as tagline content

#### `hero_section.include_book_now_button`

- **Type:** `boolean`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional (default: `true`)
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Defaults to `true`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py:39`

#### `hero_section.image`

- **Type:** `string` (image URL)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: hero_section.image}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:186-190`
  - Used as tagline image URL

#### `hero_section.text` ✅ NEW

- **Type:** `string` (rich text/HTML)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Set to `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:45`
  - Rich text field for hero section content
  - Rendered separately from header and subhead

#### `hero_section.book_link_copy` ✅ NEW

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Defaults to `"Book Now"` if `include_book_now_button` is `true`
  - `populate_site_template`: ✅ Defaults to `"Book Now"` if `include_book_now_button` is `true`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:46-48`
  - Button text for the "Book Now" button

---

### 5. `our_services` Object

#### `our_services.header`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: our_services.header}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:210-217`
  - Used as services section title

#### `our_services.subtitle` ✅ NEW

- **Type:** `string` (max 200 characters)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Set to `None` or placeholder
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:56`
  - Short text subtitle (max 200 characters)
  - Rendered separately from `body` and `content`

#### `our_services.subtext` ⚠️ LEGACY

- **Type:** `string`
- **`generate_preview`:** Optional (can be `null`)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`, uses `our_services.default` if available
  - `populate_site_template`: ✅ Tries `subtext` → `default` → Placeholder `"{{PLACEHOLDER: our_services.subtext}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/templates/input_models.py:319-324`
  - Maps to internal `content` field (legacy). `body` field is rendered separately.
  - **Note:** This is a legacy field. Use `body` for new implementations.

#### `our_services.default` ⚠️ LEGACY

- **Type:** `string`
- **`generate_preview`:** Optional (can be `null`)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Used as fallback for `subtext` if `subtext` is missing
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/templates/input_models.py:319-324`
  - Maps to internal `content` field if `subtext` is not provided.
  - **Note:** This is a legacy field. Use `body` for new implementations.

#### `our_services.body` ✅ NEW

- **Type:** `string` (rich text/HTML)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Rendered separately if provided. No fallback logic - field is independent.
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/templates/input_models.py:Services.from_preview_input_and_salon_id()`
  - Rich text field for longer content with no character limit
  - Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.
  - **Note:** There is no `content` API field - it's an internal field derived from `subtext` or `default`.

#### `our_services.menu_note` ✅ NEW

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Set to `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:64`
  - Pricing note shown above service menu

---

### 6. `service_highlights` Object

#### `service_highlights.highlights`

- **Type:** `array` of objects
- **`generate_preview`:** ✅ **REQUIRED** - Must have 1-4 items (if `service_highlights` provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Validation error: `"Service highlights must have between 1 and 4 items"` (if provided)
  - `populate_site_template`: ✅ Creates single placeholder highlight with `IconHeartHandshake` icon (if section provided)
- **Validation Rules:**
  - `generate_preview`: 1-4 items required (if `service_highlights` provided)
  - Each item must have valid icon name (must exist in `TABLER_ICONS`)
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:88-94`
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:349-418`

#### `service_highlights.highlights[].icon`

- **Type:** `string` (icon identifier)
- **`generate_preview`:** ✅ **REQUIRED** (within each highlight)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if icon not in `TABLER_ICONS` dictionary
  - `populate_site_template`: ✅ Defaults to `"IconHeartHandshake"` if missing
- **Validation:**
  - Must be a valid Tabler icon name
  - Code: `app/init-bookings-app/static_web_generator/endpoints/generate_preview/input_model/preview_input_model.py:70-78`

#### `service_highlights.highlights[].title`

- **Type:** `string`
- **`generate_preview`:** Optional (can be `null` or empty)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None` or empty string
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: service_highlights.highlights.0.title}}"` (or index)

#### `service_highlights.highlights[].body`

- **Type:** `string`
- **`generate_preview`:** Optional (can be `null` or empty)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None` or empty string
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: service_highlights.highlights.0.body}}"` (or index)

#### `service_highlights.highlights[].id`

- **Type:** `integer`
- **`generate_preview`:** Optional (for ordering)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`, items sorted by `(id is None, id or 0)`

---

### 7. `about_us` Object

#### `about_us.header`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: about_us.header}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:420-446`

#### `about_us.subsection`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: about_us.subsection}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:420-446`

#### `about_us.checkboxes` Object

##### `about_us.checkboxes.show_title`

- **Type:** `boolean`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional (not used in flexible model)
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: N/A (checkboxes not used)

##### `about_us.checkboxes.show_images`

- **Type:** `boolean`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional (not used in flexible model)
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: N/A (checkboxes not used)

##### `about_us.checkboxes.show_staff`

- **Type:** `boolean`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional (not used in flexible model)
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: N/A (checkboxes not used)

---

### 8. `company_name`

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`, falls back to `sql_data.get("company_name")` or `f"Salon_{salon_id}"`
  - `populate_site_template`: ✅ Tries: `preview_input.company_name` → `db_data.company_name` → Placeholder `"{{PLACEHOLDER: company_name}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/input_models.py:817-819`
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:121-131`

---

### 9. `testimonials` Object

#### `testimonials.title` ✅ NEW

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if testimonials provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if testimonials object provided but title missing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: testimonials.title}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:147`
  - Section title for testimonials

#### `testimonials.subtitle` ✅ NEW

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Set to `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:148`
  - Optional subtitle for testimonials section

#### `testimonials.text` ✅ NEW

- **Type:** `string` (rich text/HTML)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Set to `None`
  - `populate_site_template`: ✅ Set to `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:149`
  - Rich text content for testimonials section

#### `testimonials.testimonials`

- **Type:** `array` of objects
- **`generate_preview`:** Optional (max 5 items)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Returns `None`, section not included in website
- **Validation Rules:**
  - `generate_preview`: Maximum 5 items (validation error if exceeded)
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:150`
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:454-476`

#### `testimonials.testimonials[].name`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if testimonials provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if testimonials array provided but name missing
  - `populate_site_template`: ✅ Empty string `""`

#### `testimonials.testimonials[].content`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if testimonials provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if testimonials array provided but content missing
  - `populate_site_template`: ✅ Empty string `""`

#### `testimonials.testimonials[].picture`

- **Type:** `string` (image URL)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

#### `testimonials.testimonials[].source`

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

---

### 10. `gallery` Object

#### `gallery.title` ✅ NEW

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if gallery provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if gallery object provided but title missing
  - `populate_site_template`: ✅ Defaults to `"Photos"` if not provided
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:166`
  - Gallery section title

#### `gallery.items`

- **Type:** `array` of objects
- **`generate_preview`:** Optional (max 12 items)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Returns `None`, section not included in website
- **Validation Rules:**
  - `generate_preview`: Maximum 12 items (validation error if exceeded)
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:167`
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:478-502`

#### `gallery.items[].image_url`

- **Type:** `string` (image URL)
- **`generate_preview`:** ✅ **REQUIRED** (if gallery provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if gallery items provided but image_url missing
  - `populate_site_template`: ✅ Empty string `""`

#### `gallery.items[].title`

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Empty string `""`

#### `gallery.items[].description`

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Empty string `""`

#### `gallery.grid_layout`

- **Type:** `string`
- **`generate_preview`:** Optional (default: `"middle_expand"`)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Defaults to `"middle_expand"`
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/endpoints/generate_preview/input_model/preview_input_model.py:130-132`

---

### 11. `find_us` Object ✅ NEW

#### `find_us.title`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: find_us.title}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:199`

#### `find_us.subtitle`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: find_us.subtitle}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:200`

#### `find_us.google_maps`

- **Type:** `boolean`
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Defaults to `true`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:201`
  - Whether to show Google Maps iframe

---

### 12. `booking_link` Object ✅ NEW

#### `booking_link.url`

- **Type:** `string` (URL)
- **`generate_preview`:** ✅ **REQUIRED**
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error - `TypeError` during parsing
  - `populate_site_template`: ✅ Placeholder or generated from database
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:208`
  - Booking URL for the "Book Now" button

---

### 13. `banner` Object ✅ NEW

#### `banner.content`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if banner provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if banner object provided but content missing
  - `populate_site_template`: ✅ Set to `None` (section not included)
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:31`

#### `banner.title`

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ✅ Defaults to `"Announcement"` if not provided
  - `populate_site_template`: ✅ Defaults to `"Announcement"` if not provided
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:32`

#### `banner.text_color`

- **Type:** `string` (hex color)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

#### `banner.background_color`

- **Type:** `string` (hex color)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

---

### 14. `announcement_modal` Object ✅ NEW

#### `announcement_modal.title`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if modal provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if modal object provided but title missing
  - `populate_site_template`: ✅ Set to `None` (section not included)

#### `announcement_modal.body`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if modal provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if modal object provided but body missing
  - `populate_site_template`: ✅ Set to `None` (section not included)

#### `announcement_modal.items`

- **Type:** `array` of strings
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None` or empty array

#### `announcement_modal.call_to_action`

- **Type:** `string`
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

#### `announcement_modal.text_color`

- **Type:** `string` (hex color)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

#### `announcement_modal.background_color`

- **Type:** `string` (hex color)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`

---

### 15. `team` Object ✅ NEW

#### `team.title`

- **Type:** `string`
- **`generate_preview`:** ✅ **REQUIRED** (if team provided)
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - `generate_preview`: ❌ Error if team object provided but title missing
  - `populate_site_template`: ✅ Placeholder `"{{PLACEHOLDER: team.title}}"`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:129`

#### `team.text`

- **Type:** `string` (rich text/HTML)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None`
- **Implementation:**
  - Code: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py:130`
  - Rich text content for team section

---

### 16. `socials` Object

#### `socials.instagram_url`

- **Type:** `string` (URL)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Returns `None`, Instagram section not included
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:504-525`

#### `socials.facebook_url`

- **Type:** `string` (URL)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Returns `None`, Facebook section not included
- **Implementation:**
  - Code: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py:527-548`

#### `socials.twitter_url`

- **Type:** `string` (URL)
- **`generate_preview`:** Optional
- **`populate_site_template`:** Optional
- **Missing Behavior:**
  - Both: ✅ Set to `None` (not currently used in template rendering)

---

## Database-Derived Fields

These fields are not in the input model but are populated from database queries:

| Field                          | Source                                 | Required | Missing Behavior                                       |
| ------------------------------ | -------------------------------------- | -------- | ------------------------------------------------------ |
| `logo.image_url`               | `db_data.logo_data.image_url`          | No       | Placeholder `"{{PLACEHOLDER: logo.image_url}}"`        |
| `contact_details.phone`        | `db_data.contact_details.phone`        | No       | Placeholder `"{{PLACEHOLDER: contact_details.phone}}"` |
| `contact_details.email`        | `db_data.contact_details.email`        | No       | Placeholder `"{{PLACEHOLDER: contact_details.email}}"` |
| `contact_details.hours`        | `db_data.contact_details.hours`        | No       | Placeholder `"{{PLACEHOLDER: contact_details.hours}}"` |
| `location.address`             | `db_data.location_data.address`        | No       | Placeholder `"{{PLACEHOLDER: location.address}}"`      |
| `location.hours`               | `db_data.contact_details.hours`        | No       | Placeholder `"{{PLACEHOLDER: location.hours}}"`        |
| `services.grouped_services`    | `db_data.services_data.services`       | No       | Placeholder service item created                       |
| `service_types`                | `db_data.services_data.services`       | No       | Placeholder service type created                       |
| `staff_section.staff_members`  | `db_data.staff_data.staff_members`     | No       | Empty list `[]`                                        |
| `cta_section.url`              | `db_data.website_url` or generated     | No       | Placeholder `"{{PLACEHOLDER: cta_section.url}}"`       |
| `google_analytics_tracking_id` | `db_data.google_analytics_tracking_id` | No       | `None`                                                 |

---

## Validation Summary

### `generate_preview` Validation Rules

1. **Required Fields:** All top-level objects (`color`, `font`, `hero_section`, `our_services`, `find_us`, `booking_link`) must be present
2. **Service Highlights:** Must have 1-4 items (if `service_highlights` provided)
3. **Service Highlight Icons:** Must be valid Tabler icon names (checked against `TABLER_ICONS`)
4. **Testimonials:** Maximum 5 items (if provided)
5. **Testimonials Title:** Required if `testimonials` object provided
6. **Gallery:** Maximum 12 items (if provided)
7. **Gallery Title:** Required if `gallery` object provided
8. **Testimonial Items:** If provided, `name` and `content` are required
9. **Gallery Items:** If provided, `image_url` is required
10. **Banner:** If provided, `content` is required
11. **Announcement Modal:** If provided, `title` and `body` are required
12. **Team:** If provided, `title` is required

### `populate_site_template` Validation Rules

- **No validation** - All fields are optional
- Placeholders and fallbacks are used for all missing values

---

## Error Responses

### `generate_preview` Errors

| Error Type                       | HTTP Status     | Error Message                                               |
| -------------------------------- | --------------- | ----------------------------------------------------------- |
| Missing required field           | 400 Bad Request | `TypeError` or `KeyError` during parsing                    |
| Invalid service highlights count | 400 Bad Request | `"Service highlights must have between 1 and 4 items"`      |
| Invalid icon name                | 400 Bad Request | `"Invalid icon name: '{icon}'. Allowed icons: [...]"`       |
| Too many testimonials            | 400 Bad Request | `"Testimonials cannot exceed 5 items"`                      |
| Too many gallery items           | 400 Bad Request | `"Gallery cannot exceed 12 items"`                          |
| Missing testimonials title       | 400 Bad Request | Error if testimonials provided but title missing            |
| Missing gallery title            | 400 Bad Request | Error if gallery provided but title missing                 |
| Missing banner content           | 400 Bad Request | Error if banner provided but content missing                |
| Missing modal fields             | 400 Bad Request | Error if announcement_modal provided but title/body missing |
| Missing team title               | 400 Bad Request | Error if team provided but title missing                    |
| Validation error                 | 400 Bad Request | `PreviewInputValidationError` with error list               |

### `populate_site_template` Errors

- **No validation errors** - All fields are optional, placeholders used instead

---

## Code References

### Input Models

- `PreviewInputModel`: `app/init-bookings-app/static_web_generator/endpoints/generate_preview/input_model/preview_input_model.py`
- `TemplateInput`: `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py`

### Data Construction

- `merge_preview_with_sql_data`: `app/init-bookings-app/static_web_generator/templates/input_models.py:789-884`
- `ManualWebsiteDataConstructor`: `app/init-bookings-app/static_web_generator/templates/manual_website_data_constructor.py`

### Placeholder Utilities

- `create_placeholder`: `app/init-bookings-app/static_web_generator/utils/placeholder_utils.py:11-21`

### Fallback Constants

- `app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py:11-14`

---

## Quick Reference

### Minimal Valid Request for `generate_preview`

```json
{
  "color": {
    "primary_color": "#FF0000",
    "secondary_color": "#0000FF"
  },
  "font": {
    "primary_font": "Arial",
    "secondary_font": "Times New Roman"
  },
  "hero_section": {
    "header": "Welcome",
    "include_book_now_button": false
  },
  "our_services": {
    "header": "Our Services"
  },
  "find_us": {
    "title": "Find Us",
    "subtitle": "Visit us at our location",
    "google_maps": true
  },
  "booking_link": {
    "url": "https://book.getpagoda.com/book?salonId=..."
  }
}
```

### Minimal Valid Request for `populate_site_template`

```json
{}
```

(All fields optional - will use placeholders and fallbacks)
