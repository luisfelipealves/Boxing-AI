# DEV-007 Handoff: Android BLE discovery

Task: DEV-007
Status: IMPLEMENTED
Branch: agent/dev-007-android-ble-discovery
Worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-007
Commit: 9be38e92269acd07eb037b2e7a819d72906be9c9

## Changed files

- App.tsx
- android/app/src/main/AndroidManifest.xml
- android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java
- services/labelPrintConfig.test.ts
- services/niimbot.ts

## Implementation summary

- Replaced the Android Print Framework/WebView print path with a `NiimbotBlePrinter` Capacitor plugin contract implemented in `NativePrintPlugin.java`.
- Added Android BLE manifest declarations for Android 12+ scan/connect and pre-Android-12 Bluetooth/location requirements.
- Added native methods for permission status/request, B1-candidate scan, connect, identify, selected-printer read, selected-printer forget, disconnect, and DEV-008-placeholder `printLabel` that re-identifies before returning transfer-not-implemented.
- Implemented B1 Pro identification using NIIMBOT v4 framing for `0x40 [0x08] -> 0x48`, accepting model id `4097` and rejecting B1 model id `4096`/other unsupported ids before persistence.
- Persisted selected printer metadata only after successful B1 Pro identification, including display name, reconnect id/address, model id, profile id, full profile, service UUID, characteristic UUID, and identification timestamp.
- Extended TS bridge contracts/tests for selected-printer metadata and stable error-code coverage.

## Validation

- PASS: `npm run test` (22 tests passed; expected geminiService error-handling stderr appears during test)
- PASS: `npm run build` (build passed; existing chunk-size and browserslist warnings)
- PASS: `npx cap sync android`
- COORDINATOR VERIFIED: `npm run test`, `npm run build`, and `npx cap sync android` were re-run in `/home/felipe/projetos/Boxing-AI/worktrees/dev-007` and passed.
- VALIDATION_NOT_RUN: `cd android && ./gradlew :app:assembleDebug` could not run to Java compilation because this environment has no Android SDK configured. Exact blocker: `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file at '/home/felipe/projetos/Boxing-AI/worktrees/dev-007/android/local.properties'.`

## Known issues

- Android native build is not compiler-validated in this environment due to missing SDK.
- Full NIIMBOT print transfer and raster payload handling remain out of scope for DEV-007 and are intentionally left for DEV-008/DEV-009.
- Real B1 Pro hardware validation is still required for scan/connect/identify behavior.

## Integration notes

- The plugin name exposed to Capacitor is `NiimbotBlePrinter`; the Java class remains `NativePrintPlugin` so existing `MainActivity` registration stays focused.
- `scan()` returns B1-name/service candidates with `supportProven: false`; support is proven only by `identify()` model id `4097`.
- `printLabel()` no longer invokes Android printing; it requires selected-device/profile inputs and re-identifies the printer before returning the DEV-008 placeholder `transmission-failed` result.
- DEV-008 should build on the existing GATT characteristic, v4 `pack/sendWait`, notification parsing, and re-identification path rather than reintroducing Android Print Framework behavior.
