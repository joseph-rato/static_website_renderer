# Migration Guide: Jinja2 to JSON/React Renderer

This document outlines the phased migration from the current Python/Jinja2 static site generator to the new JSON-schema-driven React renderer.

## Migration Phases

### Phase 1: Schema + Transform (Current)

**What**: Define the `PageDocument` JSON schema and the transform layer that converts existing data.

**Deliverables**:
- `@pagoda/schema` — TypeScript types, JSON Schema, Ajv validator
- `@pagoda/transform` — `transform(previewInput, databaseData) -> PageDocument`
- Example JSON documents validated against the schema
- Architecture documentation

**Risk**: None — no production changes. This is additive work.

**Rollback**: N/A

---

### Phase 2: Shared Renderer

**What**: Build `@pagoda/renderer` — a React component package that renders `PageDocument` to both React components (client) and static HTML (server).

**Deliverables**:
- Component registry mapping `type` strings to React components
- Recursive `RenderNode` component
- All 11 salon components + primitives + layout components
- `renderToHTML(doc: PageDocument): string` for SSR
- Visual regression tests against current Jinja2 HTML output

**Key milestone**: Side-by-side comparison of Crown of Beauty rendered by:
1. Current Jinja2 pipeline
2. New React renderer

Both should be visually identical.

**Risk**: CSS/JS behavior differences between Jinja2 templates and React components.

**Rollback**: Renderer is a standalone package — no production impact until Phase 3.

---

### Phase 3: Lambda Renderer

**What**: Deploy a new Lambda function that accepts `PageDocument` JSON and returns static HTML via the shared renderer.

**Deliverables**:
- Lambda handler: validate JSON → render HTML → return result
- esbuild bundle for deployment
- Integration tests with real salon data
- Performance targets: <2s cold start, <200ms warm render

**Deployment strategy**: Deploy as a new Lambda alongside the existing one. No traffic cutover yet.

**Risk**: Lambda cold start performance, bundle size.

**Rollback**: Delete the new Lambda. No impact on existing system.

---

### Phase 4: Backend Integration (Dual-Write)

**What**: Update the Python backend to store `PageDocument` JSON alongside existing data. Both pipelines run in parallel.

**Changes**:
- Add `page_document` JSONB column to the database
- On `generate_preview` / `populate_site_template`:
  1. Run existing Jinja2 pipeline (unchanged)
  2. Additionally: call transform → store PageDocument JSON
- New endpoint: `GET /page-json/{salon_id}`
- On `publish`: invoke both old Lambda (Jinja2) and new Lambda (React), store both HTML outputs
- Comparison: automated diff between old and new HTML outputs

**Backfill script**: Run `transform()` on all existing salon data to populate the `page_document` column.

**Risk**: Database migration, transform bugs for edge-case salon data.

**Rollback**: Drop the `page_document` column. Revert endpoint changes.

---

### Phase 5: Frontend Integration

**What**: Import `@pagoda/renderer` into the frontend app for live preview.

**Changes**:
- Replace iframe-based preview with direct React rendering of `PageDocument`
- UI controls update the `PageDocument` in real-time via the transform layer
- "Publish" sends `PageDocument` JSON to backend (which triggers Lambda rendering)

**Rollback**: Revert to iframe preview. Keep backend dual-write running.

---

### Phase 6: Cutover

**What**: Remove the Jinja2 pipeline entirely.

**Prerequisites** (all must be true):
- Visual regression tests show <1% pixel difference for all salons
- Performance within acceptable bounds
- Frontend live preview working reliably
- At least 2 weeks of dual-write with zero critical differences

**Changes**:
- Remove Jinja2 templates and Python rendering code
- Remove old Lambda
- `publish` endpoint now only invokes the React Lambda
- Remove dual-write logic
- `page_document` becomes the canonical data (existing `preview_input` kept for backwards compatibility)

**Rollback**: Re-deploy old Lambda, re-enable dual-write.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Visual differences between renderers | Automated pixel-diff testing on all salon data |
| Transform bugs for edge-case data | Test against all 4 fixture sets + production backfill dry-run |
| Lambda performance | Benchmark early in Phase 3, optimize bundle size |
| Frontend import size | Tree-shake renderer, lazy-load salon components |
| Schema version drift | `schemaVersion` field enforced by renderer at load time |
| Data loss during migration | Dual-write in Phase 4 ensures both pipelines produce output |

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Schema + Transform | Done | — |
| Phase 2: Shared Renderer | 2-3 weeks | Phase 1 |
| Phase 3: Lambda Renderer | 1-2 weeks | Phase 2 |
| Phase 4: Backend Integration | 2-3 weeks | Phase 3 |
| Phase 5: Frontend Integration | 2-3 weeks | Phase 2, Phase 4 |
| Phase 6: Cutover | 1 week | All above + 2-week soak |
