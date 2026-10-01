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

## Manual Hardware Test Instructions

1. Use an Android device with Bluetooth enabled.
2. Install a build from `agent/integration-pd-010-niimbot-direct-ble` after Android SDK build validation is available.
3. Use a real NIIMBOT B1 Pro with 50 × 30 mm label stock.
4. Open a saved box that has a box number.
5. Open the label/print page.
6. Verify the UI names NIIMBOT B1 Pro direct Bluetooth printing and does not direct you to Android print services or system printer selection.
7. Grant Bluetooth permissions when prompted.
8. Start scanning for printers.
9. Select/connect the NIIMBOT B1 Pro.
10. Verify the app identifies the printer as B1 Pro before saving it.
11. Verify the selected printer identity and the 50 × 30 mm profile are visible before printing.
12. Print one label.
13. Verify the physical label has no clipping, correct orientation, readable box number, and scannable QR code.
14. Scan the QR code and verify it opens the same box route.
15. Retry printing the same label and verify the QR payload, box number, and box data do not change.
16. Use rescan/change/forget printer and verify the app can reconnect and re-identify before another print.
17. If possible, test a B1 or unsupported NIIMBOT model and verify it is rejected before persistence/printing.
18. If possible, interrupt printing after transfer starts by moving the phone away, powering off the printer, or forcing disconnect after print start. Verify the UI reports an unconfirmed print and instructs you to inspect the physical label before retrying.

## Merge Status

NOT MERGED — awaiting explicit human approval after hardware testing.
