---
product_decision: PD-010
status: HUMAN_TESTING
branch: agent/integration-pd-010-niimbot-direct-ble
worktree: /home/felipe/projetos/Boxing-AI/worktrees/integration-pd-010
latest_commit: 53daeb8
created_at: 2026-10-01
---

# PD-010 Human Testing Handoff

## Product

PD-010 — NIIMBOT B1 Pro direct Bluetooth BLE printing.

## Implemented DEV Tasks

- DEV-006 — B1 Pro profile, model rules, and Capacitor bridge contract.
- DEV-007 — Android Bluetooth permissions, scanning, identification, and persisted printer selection.
- DEV-008 — NIIMBOT B1 Pro v4 BLE protocol transport and frame helpers.
- DEV-009 — Deterministic B1 Pro 576 × 354 monochrome label raster generation.
- DEV-010 — Direct B1 Pro setup/print UI and progress/error states.
- DEV-011 — Integrated direct BLE print pipeline.
- DEV-012 — Validation and human hardware test handoff.

## Branches and Commits

- Integration branch: `agent/integration-pd-010-niimbot-direct-ble`
- Integration commit: `18da0f9eeb2de24c7b4eda660a8ca32288ce729e`
- Review-fix commit: `53daeb8`
- DEV-006: `76b8f620b2e4233b0a3fe97208d3c54d99c29a2c`
- DEV-007: `9be38e92269acd07eb037b2e7a819d72906be9c9`
- DEV-008: `7ca4f9aaa87a2b4df0f0b7eea6de245ca85cb03e`
- DEV-009: `307e56d8d07680c77f57ea005f8366493dfb8f36`
- DEV-010: `69af7b54987cdcfe36e0e29ad806c7647f44b37b`

## Automated Validation

- `npm run test` — PASS, 6 files / 32 tests.
- `npm run build` — PASS, with existing Vite chunk-size and Browserslist warnings.
- `npx cap sync android` — PASS.
- Android Print Framework forbidden-reference inspection — PASS in source tree.
- `javac` check for `NiimbotV4Protocol.java` — PASS.
- `cd android && ./gradlew :app:assembleDebug` — VALIDATION_NOT_RUN: Android SDK is not configured in this environment.

## Review

Independent re-review status: READY_FOR_HUMAN_TESTING.

Blocking findings: none.

Non-blocking observations:

- Real NIIMBOT B1 Pro hardware validation remains outstanding.
- Android Gradle validation must be rerun in an environment with Android SDK configured.

## Manual Hardware Test Instructions

Prerequisites:

1. Use an Android device with Bluetooth enabled.
2. Install a build from `agent/integration-pd-010-niimbot-direct-ble` after Android SDK build validation is available.
3. Use a real NIIMBOT B1 Pro with 50 × 30 mm label stock.
4. Have at least one saved box with a stable box number.

Test steps:

1. Open the app on Android.
2. Open a saved box that has a box number.
3. Open the label/print page.
4. Verify the UI names NIIMBOT B1 Pro direct Bluetooth printing and does not direct you to Android print services or system printer selection.
5. Grant Bluetooth permissions when prompted.
6. Start scanning for printers.
7. Select/connect the NIIMBOT B1 Pro.
8. Verify the app identifies the printer as B1 Pro before saving it.
9. Verify the selected printer identity and the 50 × 30 mm profile are visible before printing.
10. Print one label.
11. Verify the physical label has no clipping, correct orientation, readable box number, and scannable QR code.
12. Scan the QR code and verify it opens the same box route.
13. Retry printing the same label and verify the QR payload, box number, and box data do not change.
14. Use rescan/change/forget printer and verify the app can reconnect and re-identify before another print.
15. If possible, test a B1 or unsupported NIIMBOT model and verify it is rejected before persistence/printing.
16. If possible, interrupt printing after transfer starts by moving the phone away, powering off the printer, or forcing disconnect after print start. Verify the UI reports an unconfirmed print and instructs you to inspect the physical label before retrying.

## Merge Status

NOT MERGED — awaiting explicit human approval after hardware testing.
