# Template Preview Input Requirements

This document outlines the required vs optional inputs for template preview generation and what happens when values are missing.

## Two Preview Endpoints

There are two endpoints for generating template previews:

1. **`generate_preview`** - Uses `PreviewInputModel` (strict validation, required fields)
2. **`populate_site_template`** - Uses `TemplateInput` (flexible, all fields optional)

---

## 1. `generate_preview` Endpoint

**Location:** `endpoints/generate_preview/lambda_function.py`
**Input Model:** `PreviewInputModel`
**Behavior:** Strict validation - required fields must be present

### Required Fields

All of these fields **must** be provided in the request:

#### Top-Level Required Fields:

- `color` (object) - **REQUIRED**
  - `primary_color` (string) - **REQUIRED**
  - `secondary_color` (string) - **REQUIRED**
- `font` (object) - **REQUIRED**
  - `primary_font` (string) - **REQUIRED**
  - `secondary_font` (string) - **REQUIRED**
- `default_section` (object) - **REQUIRED**
  - `about_us_default` (string) - **REQUIRED**
  - `salon_experience_default` (string) - **REQUIRED**
- `hero_section` (object) - **REQUIRED**
  - `header` (string) - **REQUIRED**
  - `subhead` (string) - **REQUIRED**
  - `include_book_now_button` (boolean) - **REQUIRED**
  - `image` (string) - **REQUIRED** (image URL)
- `our_services` (object) - **REQUIRED**
  - `header` (string) - **REQUIRED**
  - `subtitle` (string) - **OPTIONAL** - Short text (max 200 characters). Rendered separately from `body`.
  - `subtext` (string) - **OPTIONAL** - Legacy field, used for `content` field
  - `default` (string) - **OPTIONAL** - Fallback for `content` field
  - `body` (string, rich text) - **OPTIONAL** - Rich text field for longer content (no character limit). Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.
- `service_highlights` (object) - **REQUIRED**
  - `highlights` (array) - **REQUIRED** - Must contain exactly 3 items
    - Each item must have:
      - `icon` (string) - **REQUIRED** - Must be a valid Tabler icon name
      - `title` (string) - **OPTIONAL**
      - `body` (string) - **OPTIONAL**
      - `id` (integer) - **OPTIONAL**
- `about_us` (object) - **REQUIRED**
  - `header` (string) - **REQUIRED**
  - `subsection` (string) - **REQUIRED**
  - `checkboxes` (object) - **REQUIRED**
    - `show_title` (boolean) - **REQUIRED**
    - `show_images` (boolean) - **REQUIRED**
    - `show_staff` (boolean) - **REQUIRED**

### Optional Fields

These fields can be omitted or set to `null`:

- `company_name` (string) - **OPTIONAL**
- `testimonials` (object) - **OPTIONAL**
  - `testimonials` (array) - **OPTIONAL** - Max 5 items
    - Each item:
      - `name` (string) - **REQUIRED** (if testimonials provided)
      - `content` (string) - **REQUIRED** (if testimonials provided)
      - `picture` (string) - **OPTIONAL**
      - `source` (string) - **OPTIONAL**
- `gallery` (object) - **OPTIONAL**
  - `items` (array) - **OPTIONAL** - Max 20 items
    - Each item:
      - `image_url` (string) - **REQUIRED** (if gallery provided)
      - `title` (string) - **OPTIONAL**
      - `description` (string) - **OPTIONAL**
  - `grid_layout` (string) - **OPTIONAL** - Default: "middle_expand"
- `socials` (object) - **OPTIONAL**
  - `twitter_url` (string) - **OPTIONAL**
  - `facebook_url` (string) - **OPTIONAL**
  - `instagram_url` (string) - **OPTIONAL**

### What Happens When Required Fields Are Missing?

1. **During `from_dict()` parsing:**
   - If a required field is missing, Python will raise a `TypeError` or `KeyError`
   - Example: Missing `color` field will cause: `TypeError: __init__() missing 1 required positional argument: 'primary_color'`

2. **During validation:**
   - The `validate()` method checks:
     - Service highlights must have exactly 3 items
     - Testimonials cannot exceed 5 items
     - Gallery cannot exceed 20 items
   - If validation fails, a `PreviewInputValidationError` is raised with specific error messages

3. **Error Response:**
   - Returns HTTP 400 (BadRequestError) with validation error messages
   - Example: `"Service highlights must have exactly 3 items"`

### What Happens When Optional Fields Are Missing?

- Optional fields that are `null` or omitted are simply set to `None` in the model
- The preview generation continues normally
- Missing optional sections (testimonials, gallery, socials) are simply not included in the generated website
- Database data may be used as fallback for some fields (e.g., `company_name`)

---

## 2. `populate_site_template` Endpoint

**Location:** `endpoints/populate_site_template/lambda_function.py`
**Input Model:** `TemplateInput`
**Behavior:** Flexible - all fields are optional, placeholders used for missing data

### All Fields Are Optional

Every field in `TemplateInput` is optional. The endpoint accepts partial data and fills missing values with placeholders or fallback values.

#### Field Structure (All Optional):

- `color` (object) - **OPTIONAL**
  - `primary_color` (string) - **OPTIONAL**
  - `secondary_color` (string) - **OPTIONAL**
- `font` (object) - **OPTIONAL**
  - `primary_font` (string) - **OPTIONAL**
  - `secondary_font` (string) - **OPTIONAL**
- `hero_section` (object) - **OPTIONAL**
  - `header` (string) - **OPTIONAL**
  - `subhead` (string) - **OPTIONAL**
  - `include_book_now_button` (boolean) - **OPTIONAL** - Default: `true`
  - `image` (string) - **OPTIONAL**
- `our_services` (object) - **OPTIONAL**
  - `header` (string) - **OPTIONAL**
  - `subtitle` (string) - **OPTIONAL** - Short text (max 200 characters). Rendered separately from `body`.
  - `subtext` (string) - **OPTIONAL** - Legacy field, used for `content` field
  - `default` (string) - **OPTIONAL** - Fallback for `content` field
  - `body` (string, rich text) - **OPTIONAL** - Rich text field for longer content (no character limit). Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.
- `service_highlights` (object) - **OPTIONAL**
  - `highlights` (array) - **OPTIONAL**
- `about_us` (object) - **OPTIONAL**
  - `header` (string) - **OPTIONAL**
  - `subsection` (string) - **OPTIONAL**
- `company_name` (string) - **OPTIONAL**
- `template_type` (string) - **OPTIONAL** - Default: `"website"`
- `testimonials` (object) - **OPTIONAL**
- `gallery` (object) - **OPTIONAL**
- `socials` (object) - **OPTIONAL**
- `default_section` (object) - **OPTIONAL**

### What Happens When Fields Are Missing?

The system uses a **placeholder and fallback strategy**:

#### 1. **Placeholders**

Missing text/string fields get placeholder values in the format:

```
{{PLACEHOLDER: field.path}}
```

Examples:

- Missing `hero_section.subhead` → `"{{PLACEHOLDER: hero_section.subhead}}"`
- Missing `our_services.header` → `"{{PLACEHOLDER: our_services.header}}"`
- Missing `company_name` → `"{{PLACEHOLDER: company_name}}"`

#### 2. **Fallback Values**

Some fields have hardcoded fallback values:

- **Colors:**
  - Missing `primary_color` → `"#FF0000"` (red)
  - Missing `secondary_color` → `"#0000FF"` (blue)

- **Fonts:**
  - Missing `primary_font` → `"Times New Roman"`
  - Missing `secondary_font` → `"Arial"`

- **Company Name:**
  - First tries: `preview_input.company_name`
  - Then tries: `db_data.get("company_name")`
  - Finally: `"{{PLACEHOLDER: company_name}}"`

#### 3. **Database Fallbacks**

Some fields attempt to use database data before using placeholders:

- **Logo:** Uses `db_data.logo_data.image_url` if available, otherwise placeholder
- **Contact Details:** Uses `db_data.contact_details` if available, otherwise placeholders
- **Location:** Uses `db_data.location_data` if available, otherwise placeholders
- **Services:** Uses `db_data.services_data` if available, otherwise placeholder service items
- **Staff:** Uses `db_data.staff_data` if available, otherwise empty list

#### 4. **Optional Sections**

Some sections are completely optional and return `None` if not provided:

- `testimonials` → Returns `None` if missing
- `gallery` → Returns `None` if missing
- `banner` → Returns `None` if missing
- `instagram` → Returns `None` if missing
- `facebook` → Returns `None` if missing

#### 5. **Service Highlights**

- If missing or empty, creates a single placeholder highlight with:
  - Default icon: `"IconHeartHandshake"`
  - Placeholder title and content

---

## Summary Table

| Field Category       | `generate_preview`                     | `populate_site_template`           |
| -------------------- | -------------------------------------- | ---------------------------------- |
| **Required Fields**  | Many (see above)                       | None - all optional                |
| **Missing Required** | ❌ Error (400 Bad Request)             | N/A                                |
| **Missing Optional** | ✅ Omitted from output                 | ✅ Placeholder or fallback         |
| **Validation**       | Strict (exact counts, icon validation) | None                               |
| **Use Case**         | Production preview with complete data  | Template preview with partial data |

---

## Code References

### Required Field Validation

```12:232:app/init-bookings-app/static_web_generator/endpoints/generate_preview/input_model/preview_input_model.py
@dataclass
class PreviewInputModel:
    """Main preview input model containing all website configuration."""

    color: Color
    font: Font
    default_section: DefaultSection
    hero_section: HeroSection
    our_services: OurServices
    service_highlights: ServiceHighlights
    about_us: AboutUs
    company_name: Optional[str] = None
    testimonials: Optional[Testimonials] = None
    gallery: Optional[Gallery] = None
    socials: Optional[Socials] = None

    def validate(self) -> tuple[bool, List[str]]:
        """
        Validate the input model.

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Validate service highlights has exactly 3 items
        if len(self.service_highlights.highlights) != 3:
            errors.append("Service highlights must have exactly 3 items")

        # Validate testimonials max 5
        if self.testimonials and self.testimonials.testimonials:
            if len(self.testimonials.testimonials) > 5:
                errors.append("Testimonials cannot exceed 5 items")

        # Validate gallery max 20 items
        if self.gallery and self.gallery.items:
            if len(self.gallery.items) > 20:
                errors.append("Gallery cannot exceed 20 items")

        return len(errors) == 0, errors
```

### Placeholder Generation

```11:21:app/init-bookings-app/static_web_generator/utils/placeholder_utils.py
def create_placeholder(field_path: str) -> str:
    """
    Create a placeholder string for a given field path.

    Args:
        field_path: Dot-separated field path (e.g., "color.secondary_color")

    Returns:
        Placeholder string (e.g., "{{PLACEHOLDER: color.secondary_color}}")
    """
    return f"{{{{PLACEHOLDER: {field_path}}}}}"
```

### Fallback Values

```10:14:app/init-bookings-app/static_web_generator/endpoints/populate_site_template/input_model/template_input_model.py
# Fallback constants
FALLBACK_PRIMARY_COLOR = "#FF0000"
FALLBACK_SECONDARY_COLOR = "#0000FF"
FALLBACK_PRIMARY_FONT = "Times New Roman"
FALLBACK_SECONDARY_FONT = "Arial"
```

---

## Recommendations

1. **Use `generate_preview`** when you have complete data and want strict validation
2. **Use `populate_site_template`** when you want to preview a template with partial data
3. **Always provide required fields** for `generate_preview` to avoid errors
4. **Check placeholder values** in the output to identify missing fields when using `populate_site_template`
