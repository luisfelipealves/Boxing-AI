---
id: DEV-020
type: development
title: Fix NIIMBOT B1 Pro PageEnd timeout with no physical print
status: IMPLEMENTED
source:
  - PD-010
  - Human hardware feedback: "nada foi impresso" after `unconfirmed-print: Timed out waiting for NIIMBOT PageEnd confirmation`
depends_on:
  - DEV-019
parallel_class: SERIAL
assigned_agent: Hermes
branch: agent/dev-020-niimbot-pageend-timeout
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-020-niimbot-pageend-timeout
started_at: 2026-10-03T07:15:52Z
updated_at: 2026-10-03T07:19:34Z
completed_at: 2026-10-03T07:19:34Z
---

# Objective

Fix the direct BLE NIIMBOT B1 Pro print path that currently transfers the rendered label but times out waiting for PageEnd while the physical printer prints nothing.

# Product Context

PD-010 requires direct BLE printing to NIIMBOT B1 Pro using the v4 protocol. DEV-019 added trace visibility. Hardware testing now shows scan, prepare, render, and BLE send start succeed, followed by `unconfirmed-print: Timed out waiting for NIIMBOT PageEnd confirmation`; the user reports no label was printed.

# Scope

- Compare the Android native print sequence against the validated NIIMBOT v4 B1 Pro flow.
- Add regression coverage for the missing protocol setup that can cause Android BLE writes to be accepted while the printer never arms the job.
- Send the required NIIMBOT v4 raw initial connection packet before print setup commands.
- Preserve the existing single-connect print flow, write queue, trace panel, label geometry, QR payload, and box-number semantics.
- Improve staged diagnostics only where needed to avoid hiding the first protocol failure.

# Out of Scope

- Supporting NIIMBOT B1 or other models.
- Changing label size, raster geometry, QR payload, box numbering, or label content layout.
- Reintroducing Android Print Framework.
- Generic Bluetooth printer support.
- Final merge to main or release.

# Technical Notes

Root-cause investigation found `NiimbotV4Protocol.INITIAL_CONNECTION_PACKET` is defined but never sent by `NativePrintPlugin`. The niimbot-web-bluetooth B1 Pro reference sends this raw packet after notifications are started and before printer info/print commands. Without it, Android may accept BLE writes while the printer never starts the physical print job, matching the observed PageEnd timeout with no printed label.

Do not fix by increasing timeouts alone. The failure is protocol sequencing, not evidence of a slow printer.

# Acceptance Criteria

- The Android native print path sends `NiimbotV4Protocol.INITIAL_CONNECTION_PACKET` before `SetDensity`, `SetLabelType`, `PrintStart`, `SetPageSize`, raster rows, or `PageEnd`.
- Regression tests fail without that ordering and pass with the fix.
- The existing NIIMBOT write queue and trace/error behavior remain intact.
- `npm run test` passes.
- `npm run build` passes.
- `npx cap sync android` passes.
- Android Gradle validation is attempted, or a precise `VALIDATION_NOT_RUN` blocker is recorded.
- Manual hardware validation can retry the same label and should verify the printer physically prints or produces a more precise earlier-stage error.

# Validation

- `npm test -- --run android/app/src/test/java/com/boxtrack/personal/NiimbotV4ProtocolTest.java` if supported by the project test runner, otherwise `cd android && ./gradlew :app:testDebugUnitTest`.
- `npm run test`
- `npm run build`
- `npx cap sync android`
- `cd android && ./gradlew :app:testDebugUnitTest` if Android SDK is configured.

# Dependencies

DEV-019 must be present because this task relies on the trace panel to capture the current hardware failure and on the latest serialized BLE write flow already merged in `origin/main`.

# Implementation

- Added the missing NIIMBOT v4 raw initial connection packet send before print setup commands.
- Waits 200 ms after Android accepts the initial connection packet before sending `SetDensity`, matching the validated niimbot-web-bluetooth B1 Pro sequence.
- Preserved the existing BLE write queue, single reconnect/print flow, raster transfer, trace panel, and user-facing unconfirmed-print behavior.
- Added regression coverage for the setup ordering in both native protocol tests and the existing source-guard test suite.

# Validation Result

- RED check: scratch `javac` harness failed before implementation because `NiimbotV4Protocol.SetupPacket` and `initialPrintSetupPackets(int)` did not exist.
- `javac` scratch harness for `NiimbotV4Protocol.initialPrintSetupPackets(1)` — passed after implementation.
- `npm test -- --run services/niimbotBleFlowSource.test.ts` — passed, 1 file / 6 tests.
- `npm run test` — passed, 7 files / 44 tests. Existing Gemini error-handling test logs an expected mocked API error to stderr.
- `npm run build` — passed with existing Vite chunk-size and Browserslist-age warnings.
- `npx cap sync android` — passed.
- `cd android && ./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: Android SDK location is not configured (`ANDROID_HOME` unset and no `android/local.properties` sdk.dir).
- `git diff --check` — passed.

# Handoff

Branch: `agent/dev-020-niimbot-pageend-timeout`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-020-niimbot-pageend-timeout`

Commit: `38a1a55e76fcd1c4e395fd18ccba71b302e02ba9`

Status: implemented; awaiting independent review and hardware validation.
