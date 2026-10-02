---
integration_branch: agent/integration-dev-016-single-connect-print-flow
status: INTEGRATED
included_tasks:
  - DEV-016
included_commits:
  - 9d2da1e454f8aef2850a427a030ae9a5ef9f7c0a
  - 61b5510
conflicts: none
ready_for_review: true
integrated_at: 2026-10-01T20:50:00Z
---

# Summary

Integrated DEV-016 from `agent/dev-016-single-connect-print-flow` into `agent/integration-dev-016-single-connect-print-flow` from `origin/main`.

# Conflict Resolution

No merge conflicts occurred.

# Validation

- `npm ci` — completed; reported existing audit warnings: 28 vulnerabilities and install-script approval warnings.
- `npm run test` — passed, 7 test files / 34 tests.
- `npm run build` — passed. Existing warnings: bundle chunk over 500 kB and Browserslist data age.
- `npx cap sync android` — passed.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: failed before tests because Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Acceptance Criteria Verification

- Selecting/reconnecting a printer now uses a single `identify` call; JS no longer calls `connect` then `identify`.
- Printing no longer calls JS `identify` immediately before native `printLabel`.
- Native `printLabel` remains responsible for reconnecting/validating service/characteristic once before transfer.
- The separate `connecting` progress step was removed.
- User-facing setup copy now says “Prepare selected B1 Pro” instead of “Find B1 Pro print service”.
- Source-guard tests cover the simplified setup and print call shapes.

# Known Issues / Risks

- Android Gradle validation still requires a configured Android SDK.
- Manual hardware validation remains required to prove the B1 Pro no longer gets stuck during setup/print.

# Follow-up Root Cause Fix — 2026-10-02T04:00:30Z

Human feedback after DEV-016 reported the flow still appeared stuck on “Prepare selected B1 Pro”. Investigation traced this to retained UI progress state after successful identify: `identifySelectedPrinter` completed and set `isBusy` false, but the setup list still treated `step === 'identifying'` as active and kept rendering an animated spinner.

Fix applied on this integration branch:

- Added an `activeStep` derived from `isBusy ? step : null` in `App.tsx`.
- The setup checklist now highlights/spins a step only while an operation is actually busy.
- Added a source regression guard in `services/niimbotBleFlowSource.test.ts` so “Prepare selected B1 Pro” cannot remain visually active after identify is no longer busy.

Validation:

- `npm test -- --run services/niimbotBleFlowSource.test.ts` — passed, 1 file / 3 tests.
- `npm run test` — passed, 7 test files / 35 tests.
- `npm run build` — passed. Existing warnings: bundle chunk over 500 kB and Browserslist data age.
- `git diff --check` — passed.
