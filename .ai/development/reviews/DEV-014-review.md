---
task: DEV-014
status: REVIEW_PASSED
reviewer: independent-subagent
reviewed_branch: agent/integration-dev-014-ble-channel-timeout
ready_for_human_testing: true
reviewed_at: 2026-10-01T20:02:00Z
---

# Verdict

Pass. No blocking findings.

# Blocking Findings

None.

# Non-Blocking Findings

- Android Gradle unit validation remains unrun in this environment because the Android SDK location is not configured; `./gradlew :app:testDebugUnitTest` fails before tests with missing `ANDROID_HOME` / `sdk.dir`.
- DEV-014 regression coverage is narrow: it tests the one-shot `BleChannelPreparationGate` but does not simulate an Android descriptor write accepted without `onDescriptorWrite`. Source review confirms the timeout remains active across notification setup, but hardware validation is still needed.

# Review Notes

- Reviewed the actual DEV-014 diff against v0.0.20 / `a2cd957` and the relevant source paths.
- The descriptor setup hang root cause is addressed: `connectInternal` now keeps a preparation timeout active until services, characteristic validation, and notification descriptor setup reach a terminal outcome.
- If `writeDescriptor` is accepted but `onDescriptorWrite` never arrives, the timeout closes the GATT, clears pending setup, and resolves the Capacitor call with a recoverable `connection-failed` error.
- Double-resolution/race handling is acceptable: `BleChannelPreparationGate` uses `AtomicBoolean.compareAndSet` so timeout, disconnect, descriptor failure, service failure, and success paths only resolve one terminal outcome.
- Fixed B1 Pro behavior from DEV-013 is preserved. Native code still uses fixed model id `4097` metadata and no model-id query path was reintroduced.
- Required NIIMBOT BLE service and characteristic validation is preserved before fixed B1 Pro selection succeeds.
- No Android Print Framework usage was found in the Android production path.

# Human Testing Focus

Verify on real B1 Pro hardware that:

1. The app no longer stays indefinitely on B1 Pro BLE channel confirmation.
2. If descriptor confirmation stalls, a visible recoverable error appears within the requested timeout.
3. If the BLE channel is usable, the app advances to label rendering/sending and prints.
