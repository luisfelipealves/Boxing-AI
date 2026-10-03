task: DEV-020
status: IMPLEMENTED
branch: agent/dev-020-niimbot-pageend-timeout
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-020-niimbot-pageend-timeout
commit: 0f3420b2c17c87eabe6c758efbff58d0ab983cdb

files_changed:
  - android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java
  - android/app/src/main/java/com/boxtrack/personal/NiimbotV4Protocol.java
  - android/app/src/test/java/com/boxtrack/personal/NiimbotV4ProtocolTest.java
  - services/niimbotBleFlowSource.test.ts
  - .ai/development/tasks/DEV-020-niimbot-pageend-timeout.md

implementation_summary:
  - Added the missing NIIMBOT v4 raw initial connection packet before native print setup commands.
  - Added a 200 ms settle delay before SetDensity, following the validated B1 Pro reference sequence.
  - Preserved the existing write queue, reconnect/print flow, raster rows, PageEnd confirmation path, and trace UI.
  - Added regression coverage for initial-connect ordering.

tests_run:
  - command: javac scratch harness for NiimbotV4Protocol.initialPrintSetupPackets
    result: passed
  - command: npm test -- --run services/niimbotBleFlowSource.test.ts
    result: passed, 1 file / 6 tests
  - command: npm run test
    result: passed, 7 files / 44 tests
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
  - The RED check failed before implementation because the expected setup-packet helper did not exist.
  - Hardware validation remains required to confirm the B1 Pro now physically prints instead of timing out at PageEnd.

known_issues:
  - Android Gradle unit tests could not run in this environment without an Android SDK.
  - The native path still relies on bounded notification waits; if hardware still times out, the next likely area is Android CCCD notification subscription or mandatory setup acknowledgements.

integration_notes:
  - Branch is based on origin/main at v0.0.28 / a5fb4a29e6d3c49d0aa3dbe999d467a84fdb80e0.
  - No merge to main performed.
