task: DEV-021
status: IMPLEMENTED
branch: agent/dev-021-niimbot-ble-pacing
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-021-niimbot-ble-pacing
commit: 2010518

files_changed:
  - android/app/src/main/java/com/boxtrack/personal/BleWriteQueue.java
  - android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java
  - android/app/src/test/java/com/boxtrack/personal/BleWriteQueueTest.java
  - services/niimbotBleFlowSource.test.ts
  - .ai/development/tasks/DEV-021-niimbot-ble-pacing.md

implementation_summary:
  - Verified the trace regression was caused by the stale local `main`; `origin/main` already contains DEV-019 trace and DEV-020 initial-connect/PageEnd work.
  - Researched public implementations and used `iscarelli/niimbot-web-bluetooth` as the B1 Pro/v4 reference.
  - Increased Android BLE write retry budget from 3 attempts to 30 attempts with 4 ms retry delay, preserving one frame per BLE write and existing 20 ms accepted-write pacing.
  - Added BLE write attempt/retry/pace settings to native diagnostics so the UI trace/error panel proves which transport behavior is in the installed build.
  - Added source and native queue regression coverage.

tests_run:
  - command: npm run test -- --run services/niimbotBleFlowSource.test.ts
    result: passed, 1 file / 7 tests
  - command: npm run test
    result: passed, 7 files / 45 tests
  - command: npm run build
    result: passed with existing Vite chunk-size and Browserslist-age warnings
  - command: npx cap sync android
    result: passed
  - command: cd android && ./gradlew :app:testDebugUnitTest
    result: VALIDATION_NOT_RUN
    reason: Android SDK location is not configured; ANDROID_HOME is unset and android/local.properties lacks sdk.dir
  - command: git diff --check
    result: passed

validation_notes:
  - Full Android Gradle tests/build remain blocked by missing SDK in this environment.
  - Hardware validation remains required on a real NIIMBOT B1 Pro.
  - To avoid the stale checkout regression, install/build from `origin/main` plus this branch, not the local root `main` at `7facbba`.

known_issues:
  - If hardware still reports buffer pressure after this change, the next safe knob is increasing `BLE_WRITE_PACE_MS` above 20 ms for slower Android BLE stacks.

integration_notes:
  - Branch is based on `origin/main` at `d37070b merge: fix NIIMBOT PageEnd timeout [DEV-020]`.
  - No merge to `main` performed.
