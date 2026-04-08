# Complete Request Object Reference

This document provides a comprehensive reference for:

1. **Complete Request Object** - What the request looks like when all values are provided
2. **Backend Acceptance** - What the backend accepts vs cannot accept
3. **Frontend State Object** - All available values we collect in the frontend
4. **Schema Reference** - Field schema structure and validation rules

## Quick Reference: Actual Examples

- **Actual Request Body**: See Section 1 - "Actual Request Body Example (from Live System)"
- **Actual Schema Response**: See Section 4 - "Actual Schema Response (from Live API)"
- **Request/Schema Comparison**: The request body shows what we send, the schema shows what the backend expects and returns

---

## 1. Complete Request Object (All Values Provided)

### Actual Request Body Example (from Live System)

This is an actual request body sent to `populate_site_template` from the frontend:

```json
{
  "company_name": "Dev Salon",
  "template_type": "generic",
  "color": {
    "primary_color": "#500a0a",
    "secondary_color": "#ae822e"
  },
  "font": {
    "primary_font": "Jacquard 10",
    "secondary_font": "Arial"
  },
  "hero_section": {
    "header": "Where Beauty Meets Elegance",
    "subhead": "From flawless skincare to stunning hairstyles, Crown of Beauty offers personalized services designed",
    "image": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/pinkimage.avif",
    "include_book_now_button": false
  },
  "our_services": {
    "header": "Our Services",
    "subtitle": "Is this present how many things acan we keep here is there a lot of text or is this just a little bi",
    "menu_note": "What does this show"
  },
  "find_us": {
    "title": "Find Us",
    "subtitle": "Call to schedule an appointment. Walk-ins are also accepted.",
    "google_maps": false
  },
  "socials": {
    "instagram_url": "www.instagram.com",
    "facebook_url": "www.facebook.com"
  },
  "gallery": {
    "title": "whats here",
    "items": [
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/red_snake.avif",
        "title": "red_snake.avif"
      },
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/pinkimage.avif",
        "title": "pinkimage.avif"
      },
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/sss-blue33.jpg",
        "title": "sss-blue33.jpg"
      },
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/snakeheade.jpg",
        "title": "snakeheade.jpg"
      }
    ],
    "grid_layout": "middle_expand"
  },
  "testimonials": {
    "title": "Testimonials",
    "subtitle": "Hear what our happy customers have to say!",
    "text": "<p>something here&nbsp;</p>",
    "testimonials": [
      {
        "name": "Ivanna",
        "content": "<p>The best service ever!! Alexandra did my nails great with care. I showed her the picture that I wanted and she did it exactly how I wanted. She is also the sweetest person ever, and so is everyone working there.</p>",
        "picture": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/very_nice.gif",
        "source": "Google"
      }
    ]
  },
  "service_highlights": {
    "highlights": [
      {
        "icon": "IconHeartHandshake",
        "title": "Professional Care",
        "body": "<p>Receive top-tier hair, nail, and skincare services with precision and care.</p>",
        "id": 0
      },
      {
        "icon": "IconHeartHandshake",
        "title": "Personalized Treatments",
        "body": "<p>Experience tailored treatments that highlight your beauty and leave you feeling rejuvenated.</p>",
        "id": 1
      },
      {
        "icon": "IconHeartHandshake",
        "title": "Curated Products",
        "body": "<p>Explore salon-quality products to maintain and perfect your look between appointments.</p>",
        "id": 2
      }
    ]
  },
  "booking_link": {
    "url": "http://localhost:5173/book?salonId=4f60eaf0-ad7b-472d-9e9a-6d6489c49221"
  }
}
```

**Key Observations from Actual Request**:

- `hero_section` may include `book_link_copy` when `include_book_now_button` is true ✅ Supported
- `hero_section` may include `text` field (rich text/HTML) ✅ Supported
- `our_services` may include `subtext`, `subtitle`, `default`, or `menu_note` ✅ All supported
- `gallery.items` includes `title` field for each item (optional field)
- `gallery.title` is optional and defaults to "Photos" if not provided ✅ FIXED
- `testimonials.testimonials[].source` and `testimonials.testimonials[].picture` are included ✅ Supported
- `socials` may include `twitter_url` and `tiktok_url` ✅ Now displayed in templates
- `banner` may include `title` field ✅ NEW
- `announcement_modal` may include `background_color` and `text_color` ✅ NEW
- `service_highlights.highlights[].id` is included (auto-generated)

### Complete Request Object (Theoretical - All Fields)

This is what the request object looks like when **all possible values** are provided to `populate_site_template` or `generate_preview`:

### Complete Request Object (Theoretical - All Fields)

This is what the request object looks like when **all possible values** are provided to `populate_site_template` or `generate_preview` (note: this is a theoretical example showing all possible fields, while the actual request above shows what's actually sent):

```json
{
  "template_type": "generic",
  "company_name": "Crown Of Beauty",

  "color": {
    "primary_color": "#3B82F6",
    "secondary_color": "#10B981"
  },

  "font": {
    "primary_font": "Inter",
    "secondary_font": "Roboto"
  },

  "hero_section": {
    "header": "Welcome to Our Salon",
    "subhead": "Your beauty destination",
    "include_book_now_button": true,
    "book_link_copy": "Book Now",
    "image": "https://example.com/hero-image.jpg",
    "text": null
  },

  "our_services": {
    "header": "Our Services",
    "subtitle": "Discover our range of beauty treatments",
    "subtext": "Premium salon services",
    "default": "Standard service description",
    "body": "<p>For longer content, use the <strong>body</strong> field with rich text HTML. This field has no character limit and is rendered separately from <em>subtitle</em> and <em>content</em>. Both <em>subtitle</em> and <em>body</em> can be shown together if provided.</p>",
    "menu_note": "Pricing note shown above service menu"
  },

  "find_us": {
    "title": "Find Us",
    "subtitle": "Visit us at our location",
    "google_maps": true
  },

  "booking_link": {
    "url": "https://book.getpagoda.com/book?salonId=your-salon-id"
  },

  "banner": {
    "title": "Grand Opening", // ✅ NEW - Optional, defaults to "Announcement"
    "content": "Special promotion this month!",
    "text_color": "#FFFFFF", // ✅ FIXED - Now works correctly
    "background_color": "#3B82F6" // ✅ FIXED - Now works correctly
  },

  "announcement_modal": {
    "title": "Welcome!",
    "body": "Thank you for visiting our website.",
    "items": ["Item 1", "Item 2", "Item 3"],
    "call_to_action": "Get Started",
    "background_color": "#FF6B6B", // ✅ NEW - Optional
    "text_color": "#FFFFFF" // ✅ NEW - Optional
  },

  "service_highlights": {
    "highlights": [
      {
        "icon": "IconHeartHandshake",
        "title": "Hair Styling",
        "body": "Professional hair styling services",
        "id": 1
      },
      {
        "icon": "IconUser",
        "title": "Spa Treatments",
        "body": "Relaxing spa and wellness services",
        "id": 2
      },
      {
        "icon": "IconBarcode",
        "title": "Nail Care",
        "body": "Expert nail care and manicures",
        "id": 3
      },
      {
        "icon": "IconHeartHandshake",
        "title": "Facial Treatments",
        "body": "Rejuvenating facial treatments",
        "id": 4
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
        "content": "Amazing service and friendly staff!",
        "picture": "https://example.com/jane.jpg",
        "source": "Google Reviews"
      },
      {
        "name": "John Smith",
        "content": "Best salon experience I've ever had!",
        "picture": "https://example.com/john.jpg",
        "source": "Yelp"
      },
      {
        "name": "Sarah Johnson",
        "content": "Professional and welcoming atmosphere.",
        "picture": null,
        "source": "Facebook"
      }
    ]
  },

  "gallery": {
    "title": "Photos", // Optional - defaults to "Photos" if not provided ✅ FIXED
    "items": [
      {
        "image_url": "https://example.com/gallery1.jpg",
        "title": "Salon Interior",
        "description": "Our beautiful salon space"
      },
      {
        "image_url": "https://example.com/gallery2.jpg",
        "title": "Treatment Room",
        "description": "Comfortable and relaxing"
      },
      {
        "image_url": "https://example.com/gallery3.jpg",
        "title": "Styling Station",
        "description": "Modern styling equipment"
      }
    ],
    "grid_layout": "middle_expand"
  },

  "socials": {
    "twitter_url": "https://twitter.com/salon", // ✅ Now displayed in templates
    "facebook_url": "https://facebook.com/salon",
    "instagram_url": "https://instagram.com/salon",
    "tiktok_url": "https://tiktok.com/@salon" // ✅ Now displayed in templates
  },

  "team": {
    "title": "Our Team",
    "text": "<p>Meet our talented professionals who are dedicated to making you look and feel your best.</p>"
  }
}
```

---

## 2. Backend Acceptance vs Cannot Accept

### ✅ What the Backend ACCEPTS

#### Required Fields (for `generate_preview` - strict validation)

- `color.primary_color` (string, hex color)
- `color.secondary_color` (string, hex color)
- `font.primary_font` (string)
- `font.secondary_font` (string)
- `hero_section.header` (string)
- `hero_section.include_book_now_button` (boolean)
- `our_services.header` (string)
- `find_us.title` (string)
- `find_us.subtitle` (string)
- `find_us.google_maps` (boolean)
- `booking_link.url` (string)

#### Optional Fields (accepted if provided)

- `template_type` (string, default: "generic")
- `company_name` (string)
- `hero_section.subhead` (string)
- `hero_section.book_link_copy` (string) - Button text
- `hero_section.image` (string, URL)
- `hero_section.text` (string, HTML) - Rich text field, rendered in template ✅ VERIFIED
- `our_services.subtitle` (string, max 200 characters)
- `our_services.subtext` (string) - Legacy field, maps to internal `content` field (preferred over `default`)
- `our_services.default` (string) - Legacy field, maps to internal `content` field (used if `subtext` is not provided)

**Note:** There is no `content` API field. The internal `content` field is derived from `subtext` or `default`. The template renders: `subtitle`, `content` (from `subtext`/`default`), and `body` separately.

**API Field to Internal Mapping:**

- `our_services.header` → `Services.title`
- `our_services.subtitle` → `Services.subtitle` (rendered separately)
- `our_services.subtext` → `Services.content` (legacy, rendered separately)
- `our_services.default` → `Services.content` (legacy fallback, rendered separately)
- `our_services.body` → `Services.body` (new, rendered separately)
- `our_services.default` (string)
- `our_services.body` (string, HTML) - Rich text field for longer content (no character limit). Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.
- `our_services.menu_note` (string)
- `banner.title` (string, optional - defaults to "Announcement") ✅ NEW
- `banner.content` (string, required if banner provided)
- `banner.text_color` (string, hex color) ✅ FIXED
- `banner.background_color` (string, hex color) ✅ FIXED
- `announcement_modal.title` (string, required if modal provided)
- `announcement_modal.body` (string, required if modal provided)
- `announcement_modal.items` (array of strings)
- `announcement_modal.call_to_action` (string)
- `announcement_modal.background_color` (string, hex color) ✅ NEW
- `announcement_modal.text_color` (string, hex color) ✅ NEW
- `service_highlights.highlights` (array, 1-4 items, icon required per item)
- `testimonials.title` (string, required if testimonials provided)
- `testimonials.subtitle` (string)
- `testimonials.text` (string, HTML)
- `testimonials.testimonials` (array, max 5 items)
- `gallery.title` (string, optional - defaults to "Photos" if not provided)
- `gallery.items` (array, max 12 items)
- `gallery.grid_layout` (string)
- `socials.twitter_url` (string) - Now displayed in templates ✅ FIXED
- `socials.facebook_url` (string)
- `socials.instagram_url` (string)
- `socials.tiktok_url` (string) - Now displayed in templates ✅ FIXED
- `team.title` (string, required if team provided)
- `team.text` (string, HTML)

### ❌ What the Backend CANNOT ACCEPT

#### Fields NOT in API Schema

1. **`hero_section.body`** - **NOT SUPPORTED**
   - Frontend has `hero.body` field in state
   - Backend API does NOT accept `hero_section.body`
   - Only `hero_section.text` is accepted (but not rendered)
   - **Status**: Backend API limitation

2. **`banner.title` or `banner.sectionName`** - ✅ **NOW SUPPORTED**
   - Frontend has `banner.sectionName` field in component
   - Backend API now accepts `banner.title` (optional, defaults to "Announcement")
   - **Status**: ✅ FIXED - Field added to backend

3. **`announcement_modal.text_color`** - ✅ **NOW SUPPORTED**
   - Frontend has `announcementBanner.textColor` field in component
   - Backend API now accepts `announcement_modal.text_color` (optional)
   - **Status**: ✅ FIXED - Field added to backend

4. **`announcement_modal.background_color`** - ✅ **NOW SUPPORTED**
   - Frontend has `announcementBanner.backgroundColor` field in component
   - Backend API does NOT accept `announcement_modal.background_color`
   - **Status**: Frontend issue - field not being sent (should be removed from UI or backend should add support)

#### Validation Constraints

- **Service Highlights**: Must have 1-4 items if provided, icon must be valid Tabler icon name
- **Testimonials**: Max 5 items if provided, each testimonial can include `picture` and `source` fields ✅ FIXED
- **Gallery**: Max 12 items if provided
- **Gallery Title**: Optional, defaults to "Photos" if not provided ✅ FIXED
- **Service Subtitle**: Maximum 200 characters ✅ UPDATED (was 100). Rendered separately from `body`.
- **Service Body**: Rich text field with no character limit ✅ NEW - Rendered separately from `subtitle` and `content`. Both `subtitle` and `body` can be shown together if provided.

#### Backend Display Features ✅ ALL WORKING

- **Social Platforms**: All platforms (Facebook, Instagram, Twitter, TikTok) are displayed ✅ FIXED
- **Hero Body**: `hero_section.text` field is accepted and rendered in the website ✅ VERIFIED
- **Rich Text**: HTML content in `testimonials.text`, `team.text`, and `hero_section.text` is sanitized for security and rendered with `|safe` filter
- **Banner Colors**: `banner.text_color` and `banner.background_color` apply correctly ✅ FIXED
- **Announcement Modal Colors**: `announcement_modal.background_color` and `text_color` apply correctly ✅ FIXED
- **Banner Title**: `banner.title` field is supported and rendered ✅ FIXED

---

## 3. Frontend State Object (All Available Values)

This is the complete `WebsiteGeneratorState` structure that we collect in the frontend:

```typescript
interface WebsiteGeneratorState {
  // Style sections (always present)
  colors: {
    primary: string; // Maps to color.primary_color
    secondary: string; // Maps to color.secondary_color
  } | null;

  fonts: {
    heading: string; // Maps to font.primary_font
    body: string; // Maps to font.secondary_font
  } | null;

  selectedTheme: string; // Template type (default: "generic")

  // Required sections (always present)
  hero: {
    title: string; // Maps to hero_section.header
    description: string; // Maps to hero_section.subhead
    body: string; // ❌ NOT SENT - API doesn't support hero_section.body
    photos: Array<ImageData>; // Used for image selection
    includeBookingButton: boolean; // Maps to hero_section.include_book_now_button
    heroBookingCopy: string; // Maps to hero_section.book_link_copy
    bookingLink: { title: string } | null; // Legacy field (same as heroBookingCopy)
    text: string; // Maps to hero_section.text (accepted but not rendered)
  } | null;

  services: {
    title: string; // Maps to our_services.header
    subtitle: string; // Maps to our_services.subtitle
    subtext: string; // Maps to our_services.subtext
    default: string; // Maps to our_services.default
    menuNote: string; // Maps to our_services.menu_note
  } | null;

  team: {
    title: string; // Maps to about_us.header (if team provided)
    body: string; // Maps to about_us.subsection (if team provided)
  } | null;

  contact: {
    title: string; // Maps to find_us.title
    subtitle: string; // Maps to find_us.subtitle
    showMap: boolean; // Maps to find_us.google_maps
    showDirections?: boolean;
    directions?: string;
    enableForm?: boolean;
    formEmail?: string;
  } | null;

  footer: {
    showSocialIcons: boolean;
    instagram: string; // Maps to socials.instagram_url
    facebook: string; // Maps to socials.facebook_url
    twitter: string; // Maps to socials.twitter_url
    tiktok: string; // Maps to socials.tiktok_url
  } | null;

  bookingLink: {
    copy: string; // Button text (e.g., "Book Now")
    useCustomLink: boolean;
    link: string; // Maps to booking_link.url
  } | null;

  // Optional sections (null when disabled)
  gallery: {
    title: string; // Maps to gallery.title (REQUIRED if gallery provided)
    items: Array<{
      id: string | number;
      url?: string;
      src?: string;
      filename?: string;
      selected?: boolean;
      title?: string;
      description?: string;
    }>; // Maps to gallery.items (max 12 items)
    gridLayout: string; // Maps to gallery.grid_layout
  } | null;

  testimonials: {
    title: string; // Maps to testimonials.title (REQUIRED if testimonials provided)
    description: string; // Maps to testimonials.subtitle
    body: string; // Maps to testimonials.text (HTML)
    cards: Array<{
      id: number;
      name: string; // Maps to testimonials[].name
      title: string; // Maps to testimonials[].source
      text: string; // Maps to testimonials[].content
      image?: ImageData; // Maps to testimonials[].picture
    }>; // Maps to testimonials.testimonials (max 5 items)
  } | null;

  announcementBanner: {
    sectionName: string; // Maps to announcement_modal.title (REQUIRED if modal provided)
    body: string; // Maps to announcement_modal.body (REQUIRED if modal provided)
    textColor: string; // ❌ NOT SENT - API doesn't support announcement_modal.text_color
    backgroundColor: string; // ❌ NOT SENT - API doesn't support announcement_modal.background_color
    items: string[]; // Maps to announcement_modal.items
    callToAction: string; // Maps to announcement_modal.call_to_action
  } | null;

  banner: {
    sectionName: string; // → banner.title ✅ FIXED (now supported)
    text: string; // Maps to banner.content (REQUIRED if banner provided)
    textColor: string; // Maps to banner.text_color
    backgroundColor: string; // Maps to banner.background_color
  } | null;

  highlights: {
    sectionName: string; // Not used in API
    items: Array<{
      icon: string; // Maps to service_highlights.highlights[].icon (REQUIRED, must be valid Tabler icon)
      title: string; // Maps to service_highlights.highlights[].title
      body: string; // Maps to service_highlights.highlights[].body
      id: number; // Maps to service_highlights.highlights[].id
    }>; // Maps to service_highlights.highlights (1-4 items required if provided)
  } | null;

  // Special: selected hero photo (top-level key)
  selectedHeroPhoto: ImageData | null;
}

interface ImageData {
  id?: string | number;
  url?: string;
  src?: string;
  filename?: string;
  [key: string]: any;
}
```

---

## 4. Field Schema Structure

The `field_schema` returned by `populate_site_template` has this structure:

```json
{
  "field_schema": {
    "field_name": {
      "required": boolean,
      "value": any,
      "minimum_items"?: number,  // For arrays
      "maximum_items"?: number,  // For arrays
      "type"?: string,
      "description"?: string
    }
  }
}
```

### Actual Schema Response (from Live API)

This is the actual `field_schema` returned by the `populate_site_template` endpoint:

```json
{
  "color": {
    "required": true,
    "value": {
      "primary_color": {
        "required": true,
        "value": "#500a0a"
      },
      "secondary_color": {
        "required": true,
        "value": "#ae822e"
      }
    }
  },
  "font": {
    "required": true,
    "value": {
      "primary_font": {
        "required": true,
        "value": "Jacquard 10"
      },
      "secondary_font": {
        "required": true,
        "value": "Arial"
      }
    }
  },
  "hero_section": {
    "required": true,
    "value": {
      "header": {
        "required": true,
        "value": "Where Beauty Meets Elegance"
      },
      "subhead": {
        "required": false,
        "value": "From flawless skincare to stunning hairstyles, Crown of Beauty offers personalized services designed"
      },
      "include_book_now_button": {
        "required": true,
        "value": false
      },
      "image": {
        "required": false,
        "value": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/pinkimage.avif"
      },
      "text": {
        "required": false,
        "value": null
      }
    }
  },
  "our_services": {
    "required": true,
    "value": {
      "header": {
        "required": true,
        "value": "Our Services"
      },
      "subtitle": {
        "required": false,
        "value": "Is this present how many things acan we keep here is there a lot of text or is this just a little bi"
      },
      "subtext": {
        "required": false,
        "value": ""
      },
      "default": {
        "required": false,
        "value": null
      },
      "menu_note": {
        "required": false,
        "value": "What does this show"
      }
    }
  },
  "find_us": {
    "required": true,
    "value": {
      "title": {
        "required": true,
        "value": "Find Us"
      },
      "subtitle": {
        "required": true,
        "value": "Call to schedule an appointment. Walk-ins are also accepted."
      },
      "google_maps": {
        "required": true,
        "value": false
      }
    }
  },
  "booking_link": {
    "required": true,
    "value": {
      "url": {
        "required": true,
        "value": "http://localhost:5173/book?salonId=4f60eaf0-ad7b-472d-9e9a-6d6489c49221"
      }
    }
  },
  "service_highlights": {
    "required": false,
    "value": {
      "highlights": {
        "required": true,
        "value": [
          {
            "required": true,
            "value": {
              "icon": {
                "required": true,
                "value": "IconHeartHandshake"
              },
              "title": {
                "required": true,
                "value": ""
              },
              "body": {
                "required": true,
                "value": ""
              },
              "id": {
                "required": false,
                "value": null
              }
            }
          }
        ],
        "minimum_items": 1,
        "maximum_items": 4
      }
    }
  },
  "company_name": {
    "required": false,
    "value": "Dev Salon"
  },
  "banner": {
    "required": false,
    "value": {
      "content": {
        "required": true,
        "value": null
      },
      "text_color": {
        "required": false,
        "value": null
      },
      "background_color": {
        "required": false,
        "value": null
      }
    }
  },
  "announcement_modal": {
    "required": false,
    "value": {
      "title": {
        "required": true,
        "value": null
      },
      "body": {
        "required": true,
        "value": null
      },
      "items": {
        "required": false,
        "value": null,
        "minimum_items": 0
      },
      "call_to_action": {
        "required": false,
        "value": null
      }
    }
  },
  "testimonials": {
    "required": false,
    "value": {
      "title": {
        "required": true,
        "value": "Testimonials"
      },
      "subtitle": {
        "required": false,
        "value": "Hear what our happy customers have to say!"
      },
      "text": {
        "required": false,
        "value": "<p>something here&nbsp;</p>"
      },
      "testimonials": {
        "required": false,
        "value": [
          {
            "required": false,
            "value": {
              "name": {
                "required": true,
                "value": "Ivanna"
              },
              "content": {
                "required": true,
                "value": "<p>The best service ever!! Alexandra did my nails great with care. I showed her the picture that I wanted and she did it exactly how I wanted. She is also the sweetest person ever, and so is everyone working there.</p>"
              },
              "picture": {
                "required": false,
                "value": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/very_nice.gif"
              },
              "source": {
                "required": false,
                "value": "Google"
              }
            }
          }
        ],
        "minimum_items": 1,
        "maximum_items": 5
      }
    }
  },
  "gallery": {
    "required": false,
    "value": {
      "title": {
        "required": true,
        "value": "whats here"
      },
      "items": {
        "required": false,
        "value": [
          {
            "required": false,
            "value": {
              "image_url": {
                "required": true,
                "value": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/red_snake.avif"
              },
              "title": {
                "required": false,
                "value": "red_snake.avif"
              },
              "description": {
                "required": false,
                "value": null
              }
            }
          }
        ],
        "minimum_items": 0,
        "maximum_items": 12
      },
      "grid_layout": {
        "required": false,
        "value": "middle_expand"
      }
    }
  },
  "socials": {
    "required": false,
    "value": {
      "twitter_url": {
        "required": false,
        "value": null
      },
      "facebook_url": {
        "required": false,
        "value": "www.facebook.com"
      },
      "instagram_url": {
        "required": false,
        "value": "www.instagram.com"
      }
    }
  },
  "team": {
    "required": false,
    "value": {
      "title": {
        "required": true,
        "value": null
      },
      "text": {
        "required": false,
        "value": null
      }
    }
  },
  "template_type": {
    "required": false,
    "value": "generic"
  }
}
```

### Schema Example (from SCHEMA_EXAMPLE.md)

```json
{
  "field_schema": {
    "color": {
      "required": true,
      "value": {
        "primary_color": {
          "required": true,
          "value": "#FF6B6B"
        },
        "secondary_color": {
          "required": true,
          "value": "#4ECDC4"
        }
      }
    },
    "hero_section": {
      "required": true,
      "value": {
        "header": {
          "required": true,
          "value": "Welcome to Our Salon"
        },
        "subhead": {
          "required": false,
          "value": "Your beauty destination"
        },
        "include_book_now_button": {
          "required": false,
          "value": false
        },
        "book_link_copy": {
          "required": false,
          "value": null
        },
        "image": {
          "required": false,
          "value": "https://example.com/hero-image.jpg"
        },
        "text": {
          "required": false,
          "value": null
        }
      }
    },
    "banner": {
      "required": false,
      "value": {
        "content": {
          "required": true,
          "value": "Special promotion this month!"
        },
        "text_color": {
          "required": false,
          "value": "#FFFFFF"
        },
        "background_color": {
          "required": false,
          "value": "#3B82F6"
        }
      }
    },
    "testimonials": {
      "required": false,
      "value": {
        "title": {
          "required": true,
          "value": "What Our Clients Say"
        },
        "testimonials": {
          "required": false,
          "minimum_items": 1,
          "maximum_items": 5,
          "value": [...]
        }
      }
    }
  }
}
```

---

## 5. Testing the Placeholder Endpoint

### Endpoint: `POST /populate-site-template/{salon_id}`

**Request Body**: `{}` (empty object)

**Expected Response**:

```json
{
  "website": "<html>...</html>",
  "websiteType": "generic",
  "template_data": {
    // Complete template data with default values
  },
  "field_schema": {
    // Complete field schema showing required/optional status
    // See "Actual Schema Response" section above for real example
  }
}
```

**Test Instructions**:

1. Use the Postman collection: `populate_site_template.postman_collection.json`
2. Call the "Populate Site Template (Minimal)" request
3. Verify that:
   - Response includes `website` (HTML string with placeholders)
   - Response includes `field_schema` with all fields
   - Default values are used for missing fields
   - No validation errors occur (all fields optional)

**Note**: This endpoint should work with an empty request body `{}` and return a complete schema with default values.

### Actual Request/Response Example

**Request Sent**:

```json
{
  "company_name": "Dev Salon",
  "template_type": "generic",
  "color": { "primary_color": "#500a0a", "secondary_color": "#ae822e" },
  "font": { "primary_font": "Jacquard 10", "secondary_font": "Arial" },
  "hero_section": {
    "header": "Where Beauty Meets Elegance",
    "subhead": "From flawless skincare to stunning hairstyles, Crown of Beauty offers personalized services designed",
    "image": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/pinkimage.avif",
    "include_book_now_button": false
  },
  "our_services": {
    "header": "Our Services",
    "subtitle": "Is this present how many things acan we keep here is there a lot of text or is this just a little bi",
    "menu_note": "What does this show"
  },
  "find_us": {
    "title": "Find Us",
    "subtitle": "Call to schedule an appointment. Walk-ins are also accepted.",
    "google_maps": false
  },
  "socials": {
    "instagram_url": "www.instagram.com",
    "facebook_url": "www.facebook.com"
  },
  "gallery": {
    "title": "whats here",
    "items": [
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/red_snake.avif",
        "title": "red_snake.avif"
      },
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/pinkimage.avif",
        "title": "pinkimage.avif"
      },
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/sss-blue33.jpg",
        "title": "sss-blue33.jpg"
      },
      {
        "image_url": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/snakeheade.jpg",
        "title": "snakeheade.jpg"
      }
    ],
    "grid_layout": "middle_expand"
  },
  "testimonials": {
    "title": "Testimonials",
    "subtitle": "Hear what our happy customers have to say!",
    "text": "<p>something here&nbsp;</p>",
    "testimonials": [
      {
        "name": "Ivanna",
        "content": "<p>The best service ever!! Alexandra did my nails great with care. I showed her the picture that I wanted and she did it exactly how I wanted. She is also the sweetest person ever, and so is everyone working there.</p>",
        "picture": "https://d26ntz1tohpvqm.cloudfront.net/external/dev_salon/images/very_nice.gif",
        "source": "Google"
      }
    ]
  },
  "service_highlights": {
    "highlights": [
      {
        "icon": "IconHeartHandshake",
        "title": "Professional Care",
        "body": "<p>Receive top-tier hair, nail, and skincare services with precision and care.</p>",
        "id": 0
      },
      {
        "icon": "IconHeartHandshake",
        "title": "Personalized Treatments",
        "body": "<p>Experience tailored treatments that highlight your beauty and leave you feeling rejuvenated.</p>",
        "id": 1
      },
      {
        "icon": "IconHeartHandshake",
        "title": "Curated Products",
        "body": "<p>Explore salon-quality products to maintain and perfect your look between appointments.</p>",
        "id": 2
      }
    ]
  },
  "booking_link": {
    "url": "http://localhost:5173/book?salonId=4f60eaf0-ad7b-472d-9e9a-6d6489c49221"
  }
}
```

**Response Received**: See "Actual Schema Response" section above for the complete `field_schema` returned.

---

## 6. Key Differences: populate_site_template vs generate_preview

| Feature               | populate_site_template                     | generate_preview                                            |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| **Validation**        | All fields optional                        | Strict validation (required fields must be present)         |
| **Purpose**           | Preview/editing                            | Final save/deployment                                       |
| **Response**          | `website`, `field_schema`, `template_data` | `message`, `status`, `result`                               |
| **Default Values**    | Uses defaults for missing fields           | Fails if required fields missing                            |
| **Array Validation**  | No minimum items enforced                  | Minimum items enforced (e.g., testimonials.testimonials: 1) |
| **Optional Sections** | Can be omitted entirely                    | If provided, internal required fields must be present       |

---

## 7. Field Mapping Summary

### Frontend → Backend Field Mappings

| Frontend State                       | Backend API Field                      | Notes                                                                                                                   |
| ------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `hero.title`                         | `hero_section.header`                  | ✅ Required                                                                                                             |
| `hero.description`                   | `hero_section.subhead`                 | Optional                                                                                                                |
| `hero.body`                          | ❌ **NOT SUPPORTED**                   | Backend limitation                                                                                                      |
| `hero.heroBookingCopy`               | `hero_section.book_link_copy`          | Optional (defaults to "Book Now" when `include_book_now_button` is true) ✅ FIXED                                       |
| `hero.includeBookingButton`          | `hero_section.include_book_now_button` | Required (boolean)                                                                                                      |
| `services.title`                     | `our_services.header`                  | ✅ Required                                                                                                             |
| `services.subtitle`                  | `our_services.subtitle`                | Optional (max 200 characters). Rendered separately.                                                                     |
| `services.body`                      | `our_services.body`                    | Optional (rich text, no character limit) ✅ NEW. Rendered separately. Both `subtitle` and `body` can be shown together. |
| `services.menuNote`                  | `our_services.menu_note`               | Optional                                                                                                                |
| `contact.title`                      | `find_us.title`                        | ✅ Required                                                                                                             |
| `contact.subtitle`                   | `find_us.subtitle`                     | ✅ Required                                                                                                             |
| `contact.showMap`                    | `find_us.google_maps`                  | ✅ Required (boolean)                                                                                                   |
| `banner.text`                        | `banner.content`                       | Required if banner provided                                                                                             |
| `banner.textColor`                   | `banner.text_color`                    | Optional                                                                                                                |
| `banner.backgroundColor`             | `banner.background_color`              | Optional                                                                                                                |
| `banner.sectionName`                 | `banner.title`                         | Optional (defaults to "Announcement") ✅ FIXED                                                                          |
| `announcementBanner.sectionName`     | `announcement_modal.title`             | Required if modal provided                                                                                              |
| `announcementBanner.body`            | `announcement_modal.body`              | Required if modal provided                                                                                              |
| `announcementBanner.textColor`       | `announcement_modal.text_color`        | Optional ✅ FIXED                                                                                                       |
| `announcementBanner.backgroundColor` | `announcement_modal.background_color`  | Optional ✅ FIXED                                                                                                       |
| `testimonials.title`                 | `testimonials.title`                   | Required if testimonials provided                                                                                       |
| `testimonials.cards[].name`          | `testimonials.testimonials[].name`     | Required per item                                                                                                       |
| `testimonials.cards[].text`          | `testimonials.testimonials[].content`  | Required per item                                                                                                       |
| `testimonials.cards[].title`         | `testimonials.testimonials[].source`   | Optional per item                                                                                                       |
| `gallery.title`                      | `gallery.title`                        | Optional (defaults to "Photos") ✅ FIXED                                                                                |
| `highlights.items[].icon`            | `service_highlights.highlights[].icon` | Required per item                                                                                                       |
| `footer.instagram`                   | `socials.instagram_url`                | Optional                                                                                                                |
| `footer.facebook`                    | `socials.facebook_url`                 | Optional                                                                                                                |
| `footer.twitter`                     | `socials.twitter_url`                  | Optional (now displayed) ✅ FIXED                                                                                       |
| `footer.tiktok`                      | `socials.tiktok_url`                   | Optional (now displayed) ✅ FIXED                                                                                       |

---

## 8. Validation Rules Summary

### Required Fields (for `generate_preview`)

- `color.primary_color` ✅
- `color.secondary_color` ✅
- `font.primary_font` ✅
- `font.secondary_font` ✅
- `hero_section.header` ✅
- `hero_section.include_book_now_button` ✅
- `our_services.header` ✅
- `find_us.title` ✅
- `find_us.subtitle` ✅
- `find_us.google_maps` ✅
- `booking_link.url` ✅

### Required If Provided (Optional Sections)

- `banner.content` (if `banner` provided)
- `announcement_modal.title` (if `announcement_modal` provided)
- `announcement_modal.body` (if `announcement_modal` provided)
- `testimonials.title` (if `testimonials` provided)
- `gallery.title` (if `gallery` provided)
- `team.title` (if `team` provided)

### Array Constraints

- `service_highlights.highlights`: 1-4 items (if provided)
- `testimonials.testimonials`: 1-5 items (if provided)
- `gallery.items`: 0-12 items (if provided)
- `announcement_modal.items`: 0+ items (no maximum)

---

## 9. Known Issues and Limitations

### Backend Limitations

1. **Hero Body Field**: `hero_section.body` is not supported (only `hero_section.text` exists but not rendered)
2. **Social Platforms**: ✅ FIXED - All platforms (Facebook, Instagram, Twitter, TikTok) are now displayed
3. **Gallery Title Default**: ✅ FIXED - Gallery title now defaults to "Photos" when not provided

### Frontend Issues (Fields Not Being Sent)

1. **Banner Section Name**: `banner.sectionName` exists in UI but not sent to backend
2. **Announcement Colors**: ✅ FIXED - `announcement_modal.text_color` and `background_color` are now supported

### Validation Issues

1. **Gallery Title**: Frontend validation doesn't catch missing title when gallery is enabled
2. **Service Subtitle**: Backend validation (100 chars) doesn't match frontend (200 chars)

---

## 10. Recommendations

### For Frontend

1. Remove or hide fields that backend doesn't support:
   - `hero.body` (use `hero.text` instead, but note it's not rendered)
   - `banner.sectionName` (remove from UI or add backend support)
   - `announcementBanner.textColor` and `backgroundColor` (remove from UI or add backend support)

2. Add validation for:
   - Gallery title when gallery is enabled
   - Service subtitle character limit (match backend: 100 chars)

3. Update UI to reflect backend limitations:
   - ✅ FIXED - Twitter/TikTok URLs are now displayed
   - Note that hero body text is not rendered

### For Backend

1. Add support for:
   - `hero_section.body` field (or render `hero_section.text`)
   - `banner.title` or `banner.sectionName`
   - `announcement_modal.text_color` and `background_color`
   - Twitter and TikTok social platform display

2. Fix:
   - Gallery title default from "None" to "Photos" or make it required
   - Service subtitle character limit to match frontend (200 chars) or document the 100 char limit
