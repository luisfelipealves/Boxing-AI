---
id: DEV-006
type: development
title: Define B1 Pro profile, model rules, and Capacitor bridge contract
status: IMPLEMENTED
source:
  - PD-010
depends_on: []
parallel_class: PARALLEL_SAFE
assigned_agent: Developer-DEV-006
branch: agent/dev-006-b1-pro-contract
worktree: worktrees/dev-006
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Define the shared B1 Pro label/profile constants, model-identification rules, and TypeScript/native bridge contract for direct BLE printing.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

PD-010 is approved for development and requires Android box-label printing to use direct Bluetooth BLE to NIIMBOT B1 Pro, not Android Print Framework.

# Scope

- Update `services/labelPrintConfig.ts` and tests.
- Add `services/niimbot*.ts` contract/types/helpers as needed.
- Centralize the B1 Pro 50 × 30 mm profile.
- Define model acceptance/rejection helpers.
- Define stable Capacitor bridge method/result/error types for later native/UI tasks.

# Out of Scope

- Android BLE implementation.
- Bitmap rendering implementation.
- React UI flow implementation beyond imports/types required for compilation.
- Hardware printing.

# Technical Notes

Profile must include physical size, 300 dpi, raster size 576 × 354 px, B1 Pro model id 4097, rejected B1 model id 4096, protocol task `v4`, density, label type, speed, margins/offsets, BLE service UUID and characteristic UUID.

# Acceptance Criteria

- Profile constants include widthMm 50, heightMm 30, dpi 300, rasterWidthPx 576, rasterHeightPx 354, modelId 4097, protocolTask `v4`, density 3, labelType 1, speed 1, service UUID `e7810a71-73ae-499d-8c15-faa9aef0c3f2`, and characteristic UUID `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f`.
- Android Print Framework media-size fields are removed or isolated from the supported Android B1 Pro path.
- Model helpers accept model id 4097 and reject 4096/unknown models with explicit unsupported-model reasons.
- Tests cover profile constants, QR payload preservation, and B1 Pro versus B1 model rules.

# Validation

- `npm run test`
- `npm run build`

# Dependencies

None.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-006-handoff.md`

Branch: `agent/dev-006-b1-pro-contract`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-006`

Commit: `76b8f620b2e4233b0a3fe97208d3c54d99c29a2c`

# Implementation Result

- Added centralized B1 Pro direct BLE profile and bridge contracts in `services/niimbot.ts`.
- Updated `services/labelPrintConfig.ts` to reference the direct BLE profile and keep Android media-size fields out of the supported B1 Pro path.
- Updated `services/labelPrintConfig.test.ts` to cover profile constants, QR payload preservation, and B1 Pro/B1 model rules.

# Validation Result

- `npm run test` — passed: 4 test files, 21 tests.
- `npm run build` — passed with Vite chunk-size and Browserslist staleness warnings.
