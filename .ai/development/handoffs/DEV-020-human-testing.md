# DEV-020 Human Testing Handoff

Product: PD-010
Task: DEV-020
Status: HUMAN_TESTING
Branch: agent/dev-020-niimbot-pageend-timeout
Worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-020-niimbot-pageend-timeout
Implementation commit: 0f3420b2c17c87eabe6c758efbff58d0ab983cdb
Review: .ai/development/reviews/DEV-020-review.md — PASS, no blocking findings
Merge status: NOT MERGED — awaiting explicit human approval after hardware testing

# What Changed

- The native Android B1 Pro print path now sends the NIIMBOT v4 raw initial connection packet before SetDensity/SetLabelType/PrintStart.
- A 200 ms settle delay is applied after Android accepts that initial packet, matching the validated B1 Pro reference sequence.
- The change is focused on protocol sequencing for the reported PageEnd timeout/no-physical-print failure.

# Automated Validation

- `javac` scratch harness for `NiimbotV4Protocol.initialPrintSetupPackets(1)` — passed.
- `npm test -- --run services/niimbotBleFlowSource.test.ts` — passed, 1 file / 6 tests.
- `npm run test` — passed, 7 files / 44 tests.
- `npm run build` — passed with existing Vite chunk-size and Browserslist-age warnings.
- `npx cap sync android` — passed.
- Independent review reran `git diff --check`, focused test, full tests, and build — passed.
- `cd android && ./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN because Android SDK is not configured in this environment.

# Manual Hardware Test Steps

1. Build/install the app from branch `agent/dev-020-niimbot-pageend-timeout` on the Android device.
2. Power on the NIIMBOT B1 Pro with 50 × 30 mm label stock loaded.
3. Open the box label screen for the same box previously tested.
4. If a stale printer is selected, use Forget selected B1 Pro, then scan and prepare/select `B1 Pro-I611031030` again.
5. Tap Print current label.
6. In the trace panel, verify the flow reaches render success and send start.
7. Physically inspect whether the printer starts feeding/printing after send begins.
8. Expected result: one 50 × 30 mm label prints with no clipping, readable box number, and scannable QR code.
9. If it fails again, copy the full trace panel output and note whether the printer moved at all.
10. If the error is still PageEnd/unconfirmed-print with no physical movement, the next likely investigation area is Android notification CCCD subscription or making setup acknowledgements mandatory so the first failing command is surfaced earlier.

# Known Limitations

- Hardware validation is still required; automated tests cannot prove the B1 Pro physically prints.
- The review noted non-blocking test weakness: the native production flow is not fully JVM-tested because Android SDK is unavailable here.
