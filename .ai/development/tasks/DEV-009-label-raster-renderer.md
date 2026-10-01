---
id: DEV-009
type: development
title: Implement deterministic B1 Pro 576x354 monochrome label raster generation
status: IMPLEMENTED
source:
  - PD-010
depends_on:
  - DEV-006
parallel_class: PARALLEL_CONDITIONAL
parallel_notes:
  - Depends on the B1 Pro label profile from DEV-006.
  - Must align with protocol row-packing expectations from DEV-008 during integration.
assigned_agent: Developer-DEV-009
branch: agent/dev-009-label-raster-renderer
worktree: worktrees/dev-009
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Render the current Boxing AI box label semantics into deterministic monochrome B1 Pro raster output.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

# Scope

- Add JS or native renderer files for 576 × 354 px output.
- Preserve QR payload and box-number semantics.
- Prioritize scannable QR, readable stable box number, and optional truncated box name.
- Add row packing/monochrome tests where feasible.

# Out of Scope

- BLE scanning/printing.
- React setup UI.
- Changing QR destination or box-number assignment semantics.

# Acceptance Criteria

- Renderer outputs exactly 576 × 354 pixels for default 50 × 30 mm B1 Pro profile and fails clearly on profile mismatch.
- Monochrome conversion is deterministic and suitable for thermal printing.
- QR payload uses `buildBoxQrValue` semantics unchanged.
- Box number remains readable and box name is included only when it does not harm QR scanability or box-number readability.
- Bitmap row packing is covered by automated tests where feasible.
- Long names, missing box number, and render failures have deterministic behavior/error codes.

# Validation

- `npm run test`
- `npm run build`

# Dependencies

- DEV-006 implemented.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-009-label-raster-renderer.md`

Branch: `agent/dev-009-label-raster-renderer`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-009`

Commit: `307e56d8d07680c77f57ea005f8366493dfb8f36`

# Validation Result

- `npm run test -- --run services/labelRasterRenderer.test.ts` — passed.
- `npm run test` — passed: 5 files, 28 tests.
- `npm run build` — passed with existing warnings.
- `git diff --check` — passed.
