---
task: DEV-021
product_decision: PD-010
review_branch: agent/dev-021-niimbot-ble-pacing
reviewed_commit: a3cdb8b
status: READY_FOR_HUMAN_TESTING
reviewed_at: 2026-10-03
---

# DEV-021 Review

## Verdict

Approved with non-blocking caveats. No blocking findings.

## Findings

### Blocking

None.

### Non-blocking

- Android native Gradle validation still requires an Android SDK and could not run in this environment.
- The review worktree lacked a local `node_modules/sql.js/dist/sql-wasm.wasm`; the coordinator previously reran `npm run test` with a worktree `node_modules` symlink to the root install and it passed. This is an environment issue, not a code regression.
- The TypeScript source guard verifies constants and diagnostics in native source, but runtime Android execution still needs SDK/hardware validation.

## Reviewed Files

- `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`
- `.ai/development/tasks/DEV-021-niimbot-ble-pacing.md`
- `.ai/development/handoffs/DEV-021-implementation-handoff.md`
- `android/app/src/main/java/com/boxtrack/personal/BleWriteQueue.java`
- `android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java`
- `android/app/src/test/java/com/boxtrack/personal/BleWriteQueueTest.java`
- `services/niimbotBleFlowSource.test.ts`

## Validation Checked

- `git diff --check a3cdb8b^ a3cdb8b` — passed.
- `npm run test -- --run services/niimbotBleFlowSource.test.ts` — passed, 7 tests.
- `npm run test` — coordinator passed, 7 files / 45 tests, after linking worktree `node_modules` to the root install; reviewer hit missing wasm without that link.
- `npm run build` — passed with existing chunk-size/Browserslist warnings.
- `npx cap sync android` — passed.
- `cd android && ./gradlew :app:testDebugUnitTest` — blocked by missing Android SDK.

## Human Testing Notes

Install a build from `agent/dev-021-niimbot-ble-pacing` or a ref containing commit `a3cdb8b`, not the stale local root `main` at `7facbba`.

On the print page, confirm:

1. The `NIIMBOT print trace` panel is visible.
2. On a failure, diagnostic detail includes `bleWriteMaxAttempts=30`, `bleWriteRetryMs=4`, and `bleWritePaceMs=20`.
3. Printing a 50 × 30 mm label reaches PageEnd/print confirmation or returns an unconfirmed-print error with physical-label inspection guidance.
