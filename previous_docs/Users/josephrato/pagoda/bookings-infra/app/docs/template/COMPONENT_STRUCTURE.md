# Component Structure Documentation

This document shows which components are used in the default HTML template (`website_data.html`) and their structure.

## Template File Location

**Main Template**: `app/init-bookings-app/static-site-generator/templates/website_data.html`

This is the top-level HTML template that includes all components.

---

## Component Structure Overview

The default HTML template follows this structure:

```
website_data.html
├── <head>
│   ├── google_analytics_tag.html (conditional)
│   ├── favicon.html (always)
│   ├── fonts.html (always)
│   └── social_meta.html (always)
├── <body>
│   ├── announcement_modal.html (conditional)
│   ├── navigation.html (always)
│   ├── <div class="container">
│   │   ├── header.html (always)
│   │   └── <div class="main-content">
│   │       ├── services_menu.html (always)
│   │       ├── service_highlights.html (conditional)
│   │       ├── team.html (conditional)
│   │       ├── testimonials.html (conditional)
│   │       ├── gallery.html (conditional)
│   │       └── find_us.html (always - Google Maps conditional within)
│   └── footer.html (always)
├── base_styles.html (always)
└── services_tabs.js (always)
```

---

## Component Details

### Head Components (Always Included)

#### 1. `favicon.html`

- **Location**: `components/favicon.html`
- **Condition**: Always included
- **Purpose**: Provides favicon links
- **Data Source**: `website_data.logo` (from database)

#### 2. `fonts.html`

- **Location**: `components/fonts.html`
- **Condition**: Always included
- **Purpose**: Loads Google Fonts based on font configuration
- **Data Source**: `website_data.font` (primary_font, secondary_font)

#### 3. `social_meta.html`

- **Location**: `components/social_meta.html`
- **Condition**: Always included
- **Purpose**: Provides Open Graph and Twitter Card meta tags
- **Data Source**: `website_data.tagline`, `website_data.logo`, `website_data.salon_id`

### Head Components (Conditional)

#### 4. `google_analytics_tag.html`

- **Location**: `components/google_analytics_tag.html`
- **Condition**: `{% if website_data.google_analytics_tracking_id %}`
- **Purpose**: Includes Google Analytics tracking code
- **Data Source**: `website_data.google_analytics_tracking_id`

---

### Body Components (Always Included)

#### 5. `navigation.html`

- **Location**: `components/navigation.html`
- **Condition**: Always included
- **Purpose**: Main navigation bar with banner support
- **Features**:
  - Responsive navigation (full/partial based on screen size)
  - Banner bar at top (if `website_data.banner` exists)
  - Scroll detection for fixed positioning
- **Data Source**:
  - `website_data.banner` (optional banner content)
  - `website_data.color` (for styling)
  - Navigation links generated from sections

#### 6. `header.html`

- **Location**: `components/header.html`
- **Condition**: Always included
- **Purpose**: Hero section with salon name, tagline, and CTA button
- **Data Source**:
  - `website_data.tagline` (title, content, image_url)
  - `website_data.cta_section.url` (booking URL for hero button)
  - `website_data.hero_section.include_book_now_button` (whether to show button)
  - `website_data.hero_section.book_link_copy` (button text, defaults to "Book Now")
  - `website_data.color` (for styling)

#### 7. `services_menu.html`

- **Location**: `components/services_menu.html`
- **Condition**: Always included
- **Purpose**: Displays services with tabs/menu interface
- **Data Source**:
  - `website_data.services` (service list)
  - `website_data.service_types` (categories)
  - `website_data.our_services` (title, subtitle, content, body)

#### 8. `footer.html`

- **Location**: `components/footer.html`
- **Condition**: Always included
- **Purpose**: Footer with contact information and social links
- **Data Source**:
  - `website_data.contact_details` (phone, email, address)
  - `website_data.socials` (Instagram, Facebook, Twitter)
  - `website_data.color` (for styling)

---

### Body Components (Conditional - Optional)

#### 9. `announcement_modal.html`

- **Location**: `components/announcement_modal.html`
- **Condition**: `{% if website_data.announcement_modal %}`
- **Purpose**: Popup modal for announcements/welcome messages
- **Data Source**: `website_data.announcement_modal`
  - `title` (required)
  - `body` (required, rich text)
  - `items` (optional, list of strings)
  - `call_to_action` (optional)

#### 10. `service_highlights.html`

- **Location**: `components/service_highlights.html`
- **Condition**: `{% if website_data.service_highlights %}`
- **Purpose**: Displays 1-4 feature highlights with icons
- **Data Source**: `website_data.service_highlights`
  - `highlights` (array of 1-4 items)
    - `icon` (Tabler icon name)
    - `title` (optional)
    - `body` (optional)

#### 11. `team.html`

- **Location**: `components/team.html`
- **Condition**: `{% if website_data.team %}`
- **Purpose**: Displays staff members in a grid layout
- **Data Source**: `website_data.team`
  - `title` (section title)
  - `content` (optional intro text, rich text)
  - `staff_members` (array, auto-populated from database)
    - `first_name`, `last_name`
    - `title` (job title)
    - `email` (optional)
    - `profile_image_url` (optional)

#### 12. `testimonials.html`

- **Location**: `components/testimonials.html`
- **Condition**: `{% if website_data.testimonials or website_data.testimonials_section %}`
- **Purpose**: Displays customer testimonials
- **Data Source**:
  - `website_data.testimonials` (new format)
  - `website_data.testimonials_section` (legacy format)
  - Fields: `title`, `subtitle`, `text`, `testimonials` (array)

#### 13. `gallery.html`

- **Location**: `components/gallery.html`
- **Condition**: `{% if website_data.Gallery or website_data.gallery_section %}`
- **Purpose**: Displays image gallery
- **Data Source**:
  - `website_data.Gallery` (new format, array of items)
  - `website_data.gallery_section` (legacy format)
  - Fields: `title`, `items` (array with `image_url`, `title`, `description`)

#### 14. `find_us.html`

- **Location**: `components/find_us.html`
- **Condition**: Always included (Google Maps iframe is conditional within component)
- **Purpose**: Displays location, contact information, and hours of operation
- **Input Fields** (from `PreviewInputModel.find_us`):
  - `title` (string) - **REQUIRED** - Section title
  - `subtitle` (string) - **REQUIRED** - Section subtitle
  - `google_maps` (boolean) - **REQUIRED** - Whether to show Google Maps iframe
- **Always Displays**:
  - Title (`website_data.find_us_title`)
  - Subtitle (`website_data.find_us_subtitle`)
  - Address (`website_data.location.address`)
  - Phone (`website_data.contact_details.phone`)
  - Hours of Operation (`website_data.location.hours` or `hours_format`)
  - Social Media Icons (if provided)
- **Conditionally Displays**:
  - Google Maps iframe (only if `website_data.google_maps_enabled` is `true`, which comes from `find_us.google_maps`)
- **Data Source**:
  - `website_data.find_us_title` (from `PreviewInputModel.find_us.title`)
  - `website_data.find_us_subtitle` (from `PreviewInputModel.find_us.subtitle`)
  - `website_data.location` (address, hours, coordinates)
  - `website_data.contact_details` (phone)
  - `website_data.google_maps_enabled` (from `PreviewInputModel.find_us.google_maps`)

---

### Supporting Components (Always Included)

#### 15. `base_styles.html`

- **Location**: `components/base_styles.html`
- **Condition**: Always included
- **Purpose**: Base CSS styles for the entire website
- **Data Source**: `website_data.color` (for CSS variables)

#### 16. `services_tabs.js`

- **Location**: `components/services_tabs.js`
- **Condition**: Always included
- **Purpose**: JavaScript for services tab functionality
- **Data Source**: None (static JavaScript)

---

## Component Inclusion Order

The components are included in this order:

1. **Head Section**:
   - Google Analytics (if enabled)
   - Favicon
   - Fonts
   - Social Meta

2. **Body Section**:
   - Announcement Modal (if provided)
   - Navigation (always)
   - Container:
     - Header (always)
     - Main Content:
       - Services Menu (always)
       - Service Highlights (if provided)
       - Team (if provided)
       - Testimonials (if provided)
       - Gallery (if provided)
       - Find Us (always - includes location, hours, contact info; Google Maps conditional)
     - Footer (always)
   - Base Styles (always)
   - Services Tabs JS (always)

---

## Component Data Requirements

### Always Required Data

These fields must exist in `website_data`:

- `color` (primary_color, secondary_color)
- `logo` (for favicon)
- `font` (primary_font, secondary_font)
- `tagline` (title, content, image_url)
- `services` (service list)
- `service_types` (categories)
- `our_services` (title, subtitle, content, body) - `subtitle` and `body` are rendered separately; both can be shown together if provided
- `contact_details` (phone, email, address)
- `cta_section.title` (button text for nav bar, default: "Book Now")
- `cta_section.url` (booking URL for nav bar and hero buttons)
- `location` (address, hours)
- `find_us_title` (section title)
- `find_us_subtitle` (section subtitle)
- `google_maps_enabled` (boolean flag for maps)

### Optional Data

These fields are optional and only render if provided:

- `google_analytics_tracking_id` → Google Analytics tag
- `announcement_modal` → Announcement modal
- `banner` → Banner in navigation
- `service_highlights` → Service highlights section
- `team` → Team section
- `testimonials` or `testimonials_section` → Testimonials section
- `Gallery` or `gallery_section` → Gallery section

---

## Removed Components

The following components have been **removed** and are no longer used:

- ❌ `about.html` - Removed (use `team.html` instead for staff information)
- ❌ `staff_directory.html` - Removed (legacy, replaced by `team.html`)

---

## Code References

### Main Template

- **File**: `app/init-bookings-app/static-site-generator/templates/website_data.html`

### Component Files

- **Directory**: `app/init-bookings-app/static-site-generator/templates/components/`

### Data Models

- **WebsiteData**: `app/init-bookings-app/static-site-generator/templates/input_models.py`
- **PreviewInputModel**: `app/init-bookings-app/static-site-generator/endpoints/generate_preview/input_model/preview_input_model.py`

---

## Summary Table

| Component                   | Always/Conditional | Purpose            | Key Data Fields                                                                                           |
| --------------------------- | ------------------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `favicon.html`              | Always             | Favicon            | `logo`                                                                                                    |
| `fonts.html`                | Always             | Font loading       | `font`                                                                                                    |
| `social_meta.html`          | Always             | Meta tags          | `tagline`, `logo`                                                                                         |
| `google_analytics_tag.html` | Conditional        | Analytics          | `google_analytics_tracking_id`                                                                            |
| `announcement_modal.html`   | Conditional        | Popup modal        | `announcement_modal`                                                                                      |
| `navigation.html`           | Always             | Navigation bar     | `banner`, `color`                                                                                         |
| `header.html`               | Always             | Hero section       | `tagline`, `cta_section.url`, `hero_section`                                                              |
| `services_menu.html`        | Always             | Services display   | `services`, `service_types`                                                                               |
| `service_highlights.html`   | Conditional        | Feature highlights | `service_highlights`                                                                                      |
| `team.html`                 | Conditional        | Staff showcase     | `team`                                                                                                    |
| `testimonials.html`         | Conditional        | Customer reviews   | `testimonials`                                                                                            |
| `gallery.html`              | Conditional        | Image gallery      | `Gallery`                                                                                                 |
| `find_us.html`              | Always             | Location/Contact   | `find_us_title`, `find_us_subtitle`, `location`, `contact_details`, `google_maps_enabled` (for maps only) |
| `footer.html`               | Always             | Footer             | `contact_details`, `socials`                                                                              |
| `base_styles.html`          | Always             | Base CSS           | `color`                                                                                                   |
| `services_tabs.js`          | Always             | JS functionality   | None                                                                                                      |

---

## Notes

1. **Banner in Navigation**: The banner component is rendered within `navigation.html`, not as a separate include.

2. **Legacy Support**: Some components support both new and legacy data formats (e.g., `testimonials` vs `testimonials_section`).

3. **Database Integration**: Some components automatically pull data from the database:
   - `team.staff_members` is populated from `salon_staff` table
   - `services` and `service_types` come from database queries

4. **Conditional Rendering**: All optional components use `{% if %}` checks to prevent rendering when data is not available.
