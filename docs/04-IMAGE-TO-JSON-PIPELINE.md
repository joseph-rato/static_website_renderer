# Image-to-JSON Pipeline

## Vision

Convert UI screenshots, mockups, or Figma designs into valid PageDocument JSON. This enables a workflow where a designer provides a visual reference and the system produces a structured, renderable page document automatically, with human review before publishing.

---

## Pipeline Steps

```
  Image / Figma URL
        |
        v
  1. Accept input (upload endpoint or Figma API fetch)
        |
        v
  2. Send to Claude Vision API
     (PageDocument schema provided as system context)
        |
        v
  3. Claude analyzes the image:
     - Detects layout regions (header, hero, services, etc.)
     - Identifies salon component types
     - Extracts colors, fonts, spacing
     - Maps content to props
        |
        v
  4. Returns structured JSON matching PageDocument schema
        |
        v
  5. Post-processing:
     - Validate against Ajv schema
     - Resolve image URLs (placeholder -> CDN)
     - Normalize colors to design tokens
     - Generate stable IDs
        |
        v
  6. Human review in editor (side-by-side comparison)
        |
        v
  7. Save as PageDocument
```

---

## Step 1: Accept Input

### Image Upload

```
POST /generate-from-image
Content-Type: multipart/form-data

Body:
  image: <file>                    # PNG, JPG, or WebP screenshot
  salon_id: <string>               # For resolving salon-specific data
  include_database_data: <bool>    # Merge real services/staff data
```

### Figma URL (Future)

```
POST /generate-from-figma
Content-Type: application/json

Body:
  figma_url: "https://www.figma.com/file/..."
  node_id: "123:456"               # Optional: specific frame
  salon_id: <string>
```

The Figma integration uses the Figma REST API to export the frame as a PNG, then feeds it into the same pipeline.

---

## Step 2-4: Claude Vision Analysis

The image is sent to the Claude Vision API with the PageDocument schema embedded in the system prompt.

### System Prompt Structure

```
You are a UI-to-JSON converter for salon booking websites.

Given a screenshot of a salon website, produce a valid PageDocument JSON.

The schema defines these section types:
- navigation: top nav bar with logo, nav links, book button
- hero: full-width hero with header, subhead, image, CTA
- services-menu: service listings grouped by category
- service-highlights: 1-4 icon + title + body cards
- team: staff member cards with photo, name, title, bio
- testimonials: customer review cards
- gallery: image grid
- find-us: map, address, hours, contact info
- footer: company info, social links

[Full PageDocument TypeScript interfaces included here]

Rules:
1. Use ONLY the component types defined in the schema.
2. Extract exact text content visible in the image.
3. Extract colors as hex values.
4. Identify font families if recognizable, otherwise use "sans-serif"/"serif".
5. Set visible: false for sections not present in the image.
6. Use semantic section detection (hero vs. generic div).
```

### Few-Shot Examples

The prompt includes 2-3 examples of (image description, expected JSON output) pairs to calibrate Claude's output format. These examples cover:

- A minimal salon site (nav + hero + services + footer)
- A full-featured site (all 11 sections)
- A site with non-standard layout (e.g., side-by-side hero)

---

## Step 5: Post-Processing

### Schema Validation

```ts
import { validatePageDocument } from "@pagoda/schema";

const result = validatePageDocument(claudeOutput);
if (!result.valid) {
  // Attempt auto-fix for common issues, then re-validate
  const fixed = autoFix(claudeOutput, result.errors);
  const retry = validatePageDocument(fixed);
  if (!retry.valid) throw new Error("Could not produce valid document");
}
```

Common auto-fixes:

- Add missing `schemaVersion` field
- Wrap bare text in `{ type: "text", props: { text: "..." } }`
- Coerce number strings to numbers for `price`, `durationMins`

### Image URL Resolution

Claude outputs placeholder references for images it sees in the screenshot. Post-processing resolves these:

| Claude Output                    | Resolution                                  |
|----------------------------------|---------------------------------------------|
| `"[hero-background-image]"`     | Upload original to CDN, use returned URL    |
| `"[logo]"`                      | Pull from `database_data.logo_data.image_url` |
| `"[gallery-1]"`, `"[gallery-2]"` | Match to existing gallery items if available |
| `"[team-photo-1]"`              | Match to `staff_members[].photo_url`        |

### Normalize to Design Tokens

Extracted colors are mapped to the theme token system:

```ts
function normalizeTheme(extractedColors: string[]): ThemeTokens {
  // Sort by frequency of use in the design
  // Most-used accent color -> primary
  // Second most-used -> secondary
  return {
    colors: {
      primary: extractedColors[0],   // dominant accent
      secondary: extractedColors[1], // secondary accent
    },
    fonts: {
      primary: detectHeadingFont(image),   // or fallback
      secondary: detectBodyFont(image),    // or fallback
    },
  };
}
```

### Stable ID Generation

Node IDs are generated deterministically from element position and type:

```ts
function generateId(node: SRNode, index: number): string {
  // Salon components use their canonical anchor ID
  if (ANCHOR_MAP[node.type]) return ANCHOR_MAP[node.type];
  // Others use type + index hash
  return `${node.type}-${hashCode(`${node.type}-${index}`)}`;
}
```

This ensures that re-processing the same image produces the same IDs, enabling stable diffs.

---

## Step 6: Human Review

The editor displays a side-by-side view:

```
  +--------------------+--------------------+
  |                    |                    |
  |  Original Image    |  Rendered Preview  |
  |  (uploaded)        |  (from JSON)       |
  |                    |                    |
  +--------------------+--------------------+
  |                                         |
  |  JSON Editor (collapsible)              |
  |  - Edit any field inline                |
  |  - Toggle section visibility            |
  |  - Adjust theme colors                  |
  |                                         |
  +-----------------------------------------+
```

The reviewer can:

- Accept the generated document as-is
- Edit specific sections or props
- Regenerate individual sections with adjusted prompts
- Merge with real `database_data` (services, staff, contact info)

---

## Handling Ambiguity

### Semantic Element Detection

Claude is instructed to prefer semantic salon components over generic primitives:

| Visual Pattern                           | Mapped To             |
|------------------------------------------|-----------------------|
| Large image with overlaid text at top    | `hero`                |
| Grid of service names with prices        | `services-menu`       |
| Row of icon + title + description cards  | `service-highlights`  |
| Row of person photos with names          | `team`                |
| Quote text with attribution              | `testimonials`        |
| Image grid                               | `gallery`             |
| Map + address + hours                    | `find-us`             |
| Top bar with logo and links              | `navigation`          |
| Bottom bar with copyright                | `footer`              |

### Responsive Inference

A single screenshot only shows one viewport. The pipeline:

1. Assumes the screenshot is a desktop view.
2. Generates base `styles` from the visible layout.
3. Adds conservative mobile `responsiveStyles` (stack columns, reduce padding, smaller fonts).
4. The human reviewer adjusts responsive behavior as needed.

---

## Integration Endpoint

```
POST /generate-from-image

Request:  multipart/form-data { image, salon_id, include_database_data }
Response: {
  pageDocument: PageDocument,     // the generated document
  confidence: number,             // 0-1 overall confidence score
  warnings: string[],             // ambiguities or low-confidence sections
  imageAnalysis: {                // debug info
    detectedSections: string[],
    extractedColors: string[],
    extractedFonts: string[],
  }
}
```

---

## Future Enhancements

- **Figma plugin**: Direct export from Figma to PageDocument without screenshots.
- **Real-time design-to-code**: Watch a Figma file for changes and auto-update the PageDocument.
- **Multi-page support**: Extend the pipeline to handle multi-page designs (e.g., About page, Blog).
- **Style transfer**: Apply the visual style from one screenshot to an existing PageDocument's content.
- **Iterative refinement**: Feed the rendered preview back to Claude for self-correction.
