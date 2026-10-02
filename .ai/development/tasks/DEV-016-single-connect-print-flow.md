---
id: DEV-016
type: development
title: Avoid repeated BLE reconnects during B1 Pro setup and print
status: MERGED
source:
  - PD-010
  - Human feedback after v0.0.22: "agora fica preso em Find B1 Pro print service"
depends_on:
  - DEV-015
parallel_class: SERIAL
assigned_agent: Developer-01
branch: agent/dev-016-single-connect-print-flow
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-016-single-connect-print-flow
started_at: 2026-10-01T20:35:00Z
updated_at: 2026-10-02T07:10:21Z
completed_at: 2026-10-01T20:48:00Z
---

# Objective

Stop the UI/native flow from repeatedly connecting/reconnecting to the same NIIMBOT B1 Pro during setup and printing, which can leave the app stuck on “Find B1 Pro print service”.

# Product Context

PD-010 approves direct BLE NIIMBOT B1 Pro printing. DEV-015 made service/characteristic discovery sufficient and removed blocking channel confirmation. Hardware feedback now says the app still gets stuck on “Find B1 Pro print service”. The printer may already be green/connected while the app starts another connect/discover cycle.

# Scope

- Investigate and fix repeated `connect` + `identify` / pre-print `identify` + `printLabel` reconnect cycles in `App.tsx` and/or native plugin.
- Prefer a single setup connection path for selecting a printer: one native call that connects, validates service/characteristic, creates fixed B1 Pro metadata, and persists it.
- Prefer a single print connection path: `printLabel` may reconnect/validate as needed; JS should not do a separate blocking `identify` immediately before `printLabel` unless technically required.
- Preserve fixed B1 Pro model id `4097` and required service/characteristic validation.
- Preserve scan, permission, raster/profile validation, direct BLE print transfer, and no Android Print Framework.
- Update progress copy/tests if needed so user-visible steps reflect the simpler flow.

# Out of Scope

- Supporting other printers/models.
- Changing label geometry, QR payload, or box numbering.
- Reintroducing Android Print Framework.
- Broad UI redesign.

# Technical Notes

Current `App.tsx` calls `NiimbotBlePrinter.connect(...)` and then `NiimbotBlePrinter.identify(...)` when selecting/reconnecting a printer. It also calls `NiimbotBlePrinter.identify(...)` before `printLabel(...)`, while native `printLabel` itself calls `connectInternal(... identify=true ...)` before printing. These repeated GATT connection cycles are likely harmful when the printer already shows connected.

# Acceptance Criteria

- Selecting a scanned printer does not call both `connect` and `identify` sequentially.
- Printing does not call a redundant JS `identify` immediately before native `printLabel` reconnects/validates.
- The app no longer has an unnecessary extra “Find B1 Pro print service” cycle after the printer is already selected/connected.
- Fixed B1 Pro profile/model metadata remains visible before printing.
- Existing tests pass.
- Build passes.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- Attempt Android Gradle validation if SDK is available; otherwise record `VALIDATION_NOT_RUN` with SDK blocker.

# Dependencies

DEV-015 must be present because this task builds on fixed B1 Pro service/characteristic discovery as the setup contract.

# Integration

- Integration branch: `agent/integration-dev-016-single-connect-print-flow`
- Integration handoff: `.ai/development/integration/DEV-016-integration-handoff.md`
- Review: `.ai/development/reviews/DEV-016-review.md`

# Commits

- `9d2da1e454f8aef2850a427a030ae9a5ef9f7c0a` — avoid redundant Niimbot BLE reconnects.
- `61b5510` — record DEV-016 implementation handoff.
- `8166e62` — clear stale “Prepare selected B1 Pro” spinner after identify completes.
- `68ab3e0` — record independent review of the prepare-spinner follow-up.

# Human Testing

Status: approved by human and merged for release.

Manual validation steps:

1. Install/run the app from `agent/integration-dev-016-single-connect-print-flow` on Android with the NIIMBOT B1 Pro nearby and powered on.
2. Open a box label print screen.
3. Grant Bluetooth permissions if prompted.
4. Scan for the NIIMBOT B1 Pro.
5. Select the B1 Pro candidate.
6. Verify “Prepare selected B1 Pro” does not keep spinning after selection completes.
7. Verify the selected printer card appears with B1 Pro identity/profile details.
8. Tap “Print current label to NIIMBOT B1 Pro”.
9. Verify the flow advances through render/send/confirm instead of performing a redundant pre-print identify step.
10. Verify the physical 50 × 30 mm label prints with readable box number and scannable QR code, or inspect the label before retrying if the app reports `unconfirmed-print`.

Automated validation:

- `npm test -- --run services/niimbotBleFlowSource.test.ts` — passed, 1 file / 3 tests.
- `npm run test` — passed, 7 test files / 35 tests.
- `npm run build` — passed. Existing warnings: bundle chunk over 500 kB and Browserslist data age.
- `git diff --check` / `git show --check` — passed.

Known limitation:

- Android Gradle validation remains unavailable in this environment because Android SDK location is not configured.

# Merge

- Human approval: explicit instruction “aprovado. siga pra merge release”.
- Merged to `main` for release `v0.0.24`.
