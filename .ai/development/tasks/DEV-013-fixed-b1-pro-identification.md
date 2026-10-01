---
id: DEV-013
type: development
title: Stop blocking B1 Pro setup on model-id identification timeout
status: IMPLEMENTED
source:
  - PD-010
  - Human instruction: "a app fica determinando model id indefinidamente e não avanca. o modelo sera fixo o niimbot b1 pro"
depends_on: []
parallel_class: SERIAL
assigned_agent: Developer-01
branch: agent/dev-013-fixed-b1-pro-identification
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-013-fixed-b1-pro-identification
started_at: 2026-10-01T19:26:00Z
updated_at: 2026-10-01T19:38:14Z
completed_at: 2026-10-01T19:38:14Z
---

# Objective

Make the Android direct BLE print flow proceed when the selected device exposes the NIIMBOT B1 Pro BLE service/characteristic, instead of waiting indefinitely on model-id identification. The supported printer model is fixed to NIIMBOT B1 Pro for this app.

# Product Context

PD-010 approved direct BLE NIIMBOT B1 Pro printing. The human has now clarified during hardware testing that the app is stuck determining model id indefinitely and that the model is fixed as NIIMBOT B1 Pro.

# Scope

- Update native Android BLE setup so successful GATT service/characteristic discovery creates/persists a B1 Pro selected printer object with fixed model id 4097.
- Ensure printing proceeds from the fixed B1 Pro profile without a blocking model-id query.
- Update UI/error copy and tests if they still imply model-id verification is required.
- Preserve permission, scan, connect, render, transfer, and print-confirmation behavior.

# Out of Scope

- Adding support for NIIMBOT B1 or other models.
- Changing label profile geometry or QR payload semantics.
- Reintroducing Android Print Framework.
- Broad refactors unrelated to the stuck identification flow.

# Technical Notes

The current Android plugin calls `identifyConnectedPrinter`, writes an initial packet, then waits for printer-info response `0x48`. On the tested hardware path this can leave the app stuck in the identifying stage. Since only NIIMBOT B1 Pro is supported, the app can treat the presence of the configured service/characteristic as the transport contract and persist/display model id 4097 from the fixed profile.

# Acceptance Criteria

- Setup/connect no longer depends on receiving a model-id response before saving the selected printer.
- Printing no longer depends on receiving a model-id response before sending the label.
- Selected printer metadata still contains `modelId: 4097`, B1 Pro profile, service UUID, and characteristic UUID.
- UI no longer tells the user to wait for model-id verification when identification is skipped/fixed.
- Existing automated tests pass.
- Build passes.

# Validation

- `npm run test`
- `npm run build`
- Attempt Android unit/build validation if SDK is available; otherwise record `VALIDATION_NOT_RUN` with the SDK blocker.

# Dependencies

None.
