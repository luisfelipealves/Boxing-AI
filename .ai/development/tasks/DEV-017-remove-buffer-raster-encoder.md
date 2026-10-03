---
id: DEV-017
type: development
title: Remove Buffer dependency from B1 Pro raster base64 encoding
status: IMPLEMENTED
source:
  - PD-010
  - Human feedback after v0.0.25: "Label rendering is not ready ... Buffer is not defined"
depends_on:
  - DEV-016
parallel_class: SERIAL
assigned_agent: Hermes
branch: agent/dev-017-buffer-global
worktree: /home/felipe/.hermes/cache/scratch/boxing-ai-dev-017-buffer-global
created_at: 2026-10-03T03:32:10Z
updated_at: 2026-10-03T03:32:10Z
completed_at: 2026-10-03T03:32:10Z
---

# Objective

Remove any runtime dependency on Node/browser globals such as `Buffer` or `btoa` from the NIIMBOT B1 Pro label raster base64 encoding path.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

The user reported that the Android print flow still fails before BLE transfer with: `Label rendering is not ready ... Buffer is not defined`.

# Scope

- Update `services/labelRasterRenderer.ts` so B1 Pro raster base64 encoding is implemented in plain JavaScript with no runtime `Buffer` reference.
- Strengthen renderer tests so raster rendering succeeds even when both `globalThis.Buffer` and `globalThis.btoa` are unavailable.
- Verify production built JS assets do not contain a standalone `Buffer` identifier from the renderer path.

# Out of Scope

- Changing label geometry, QR payload, box numbering, BLE protocol framing, or printer model support.
- Publishing a release; this task prepares reviewed code for human testing/release.

# Acceptance Criteria

- Rendering a 50 × 30 mm, 576 × 354 px B1 Pro label no longer needs Node `Buffer`.
- Rendering still produces the same base64 as the previous Node reference encoding.
- `npm run test` passes.
- `npm run build` passes.
- `npx cap sync android` passes.
- Android Gradle validation is attempted and documented.

# Validation

- `npm test -- --run services/labelRasterRenderer.test.ts`
- `npm run test`
- `npm run build`
- Production built asset search for standalone `Buffer` identifier.
- `npx cap sync android`
- `cd android && ./gradlew :app:assembleDebug` or document blocker.

# Dependencies

DEV-016 must be present because this task follows the first WebView raster-rendering fix.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-017-implementation-handoff.md`
