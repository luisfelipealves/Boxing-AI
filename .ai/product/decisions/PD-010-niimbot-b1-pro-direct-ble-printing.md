ID: PD-010
Status: APPROVED_FOR_DEVELOPMENT
Source: User instruction: "Target printer is NIIMBOT B1 Pro (300 dpi) using direct Bluetooth BLE communication. Do not rely on the Android Print Framework or expect the printer to appear as an Android system printer. Default label size: 50 × 30 mm. Keep label width/height configurable for future label sizes. Investigate direct B1 Pro BLE printing using the NIIMBOT v4 protocol."
Related question: None
Created: 2026-10-01

Question:
How should BoxTrack AI print Boxing AI box labels to a NIIMBOT B1 Pro when the printer must be driven directly over Bluetooth BLE instead of through the Android Print Framework?

Decision:
BoxTrack AI must replace the supported Android box-label print path with a direct Bluetooth BLE NIIMBOT B1 Pro flow.

The Android label-printing path must not use Android PrintManager, Android Print Framework, Android print dialogs, Android print services, or the assumption that the B1 Pro appears as an Android system printer.

The supported printer target remains NIIMBOT B1 Pro only. The default label size is 50 × 30 mm. Label width and height must remain configurable through a printer/label profile so future approved label sizes can be added without rewriting the print pipeline.

The app must request required Android Bluetooth permissions, scan for B1 Pro candidates, let the user select/connect the printer, identify the connected device as B1 Pro before accepting it, persist the selected printer metadata after successful identification, render the current Boxing AI label as a monochrome bitmap at the B1 Pro 300 dpi profile geometry, send that bitmap directly using the NIIMBOT v4 BLE protocol, and report connection/printing errors in the UI.

For the default 50 × 30 mm B1 Pro profile, implementation must use B1 Pro-specific raster geometry from validated protocol evidence: model id 4097, 300 dpi, task/protocol behavior `v4`, and 576 × 354 px bitmap output unless hardware validation proves a correction is needed. Do not infer B1 Pro behavior from B1 behavior.

Rationale:
The prior approved Niimbot label-size decision, PD-009, targeted a Niimbot-sized label but still used Android/WebView printing and custom Android print media. The human has now clarified that the printer must be controlled directly over BLE and must not depend on Android system printing.

A direct BLE flow lets the app own device discovery, printer identity, label rendering, protocol transfer, progress, and errors. That is necessary because the B1 Pro may not appear as an Android printer and because B1 and B1 Pro can advertise similarly while using different DPI, model ids, raster geometry, and protocol task behavior.

The niimbot-web-bluetooth project provides validated evidence for a direct B1 Pro implementation and documents the BLE service, characteristic, identification behavior, v4 protocol, model id, and B1 Pro 50 × 30 mm raster dimensions. Product behavior should use that evidence while still requiring real B1 Pro manual validation before the development task is considered complete.

Requirements:
- Android box-label printing must use direct Bluetooth BLE communication to the NIIMBOT B1 Pro.
- Android box-label printing must not use Android PrintManager, PrintDocumentAdapter, PrintAttributes, Android print dialogs, Android Print Framework, Android print services, or system-printer discovery.
- NIIMBOT B1 Pro is the only supported production printer target for this flow.
- The default supported label size is 50 × 30 mm.
- Label physical width and height must be defined in a configurable printer/label profile, not scattered literals.
- The default B1 Pro 50 × 30 mm profile must include physical dimensions and B1 Pro-specific raster dimensions.
- The app must request the Android Bluetooth permissions required for BLE scanning and connection on the supported Android API levels.
- The app must scan for nearby B1 Pro candidates over BLE.
- The app must let the user select/connect a printer from the in-app BLE flow.
- The app must identify the connected printer by printer-reported model id before printing or persisting it.
- The app must accept NIIMBOT B1 Pro model id 4097 for this flow.
- The app must reject NIIMBOT B1 model id 4096 and other unsupported models for this flow, even if their BLE advertised name starts with `B1`.
- The selected printer must be persisted only after successful B1 Pro identification.
- The app must re-identify the connected printer before printing, even when using a persisted selection.
- The app must render the Boxing AI box label as a monochrome bitmap for the selected B1 Pro label profile.
- The default 50 × 30 mm B1 Pro output must target 576 × 354 px at 300 dpi unless real hardware validation establishes an updated B1 Pro profile.
- The app must send the bitmap directly over BLE using the NIIMBOT v4 protocol for B1 Pro.
- The app must preserve the existing QR payload semantics and box-number semantics.
- Label content priority remains: scannable QR code, readable stable box number, box name only if it fits without harming QR scanability or box-number readability.
- The UI must report permission, Bluetooth disabled, scan, no-printer-found, connection, identification, unsupported-printer, rendering, transmission, timeout, disconnect, unconfirmed-print, and printer-status failures with actionable messages.
- The UI must not direct Android users to Android print services or system printer selection for the supported B1 Pro flow.

Acceptance criteria:
- Android B1 Pro label printing no longer invokes Android PrintManager or Android Print Framework classes for the supported print path.
- AndroidManifest and runtime code request the necessary Bluetooth permissions for BLE scanning/connection on supported Android versions.
- The label page provides a first-run path to grant Bluetooth permissions, scan, select/connect a B1 Pro, persist the printer, and print.
- The selected printer identity and configured label size are visible before printing.
- The user can change, rescan, reconnect, or forget the persisted printer.
- The app identifies the connected printer before printing and accepts model id 4097 as B1 Pro.
- The app rejects model id 4096 and unsupported models with a clear UI error.
- The default label profile is 50 × 30 mm and targets 576 × 354 px monochrome output for B1 Pro.
- Label profile configuration keeps physical width, physical height, dpi, raster width, raster height, protocol task, density, label type, speed, and any margins/offsets together.
- Printing sends the rendered bitmap over BLE through the documented NIIMBOT B1 Pro v4 service/characteristic/protocol path.
- The app shows progress states for permission/setup, scanning, connecting, identifying, rendering, sending, printing/confirming, success, and failure.
- Permission denial, Bluetooth off, no printer found, unsupported model, connection failure, identification failure, render failure, transfer failure, disconnect, timeout, and unconfirmed print all produce visible UI feedback and retry guidance.
- Retrying after a recoverable failure does not change the QR payload, box number, box data, or selected label content.
- Automated tests cover label profile constants, B1 Pro versus B1 model selection rules, bitmap sizing/packing where feasible, and NIIMBOT frame/protocol helpers where implemented.
- `npm run test` passes after implementation.
- `npm run build` passes after implementation.
- Android build validation passes after native BLE changes.
- Manual human testing on real NIIMBOT B1 Pro hardware prints at least one 50 × 30 mm label with no clipping, correct orientation, readable box number, and scannable QR code.

UX behavior:
- The label page remains a single Niimbot B1 Pro label-printing flow, not a generic print flow or mode-selection flow.
- Android UI copy must reference direct connection to NIIMBOT B1 Pro, not Android print services.
- Before requesting Bluetooth permissions, the app should explain that Bluetooth access is required to find and print to the B1 Pro.
- If no printer is selected, the primary print action must either be disabled with setup guidance or guide the user through permission, scan, select, identify, persist, and print.
- The UI must show the configured target size, defaulting to 50 × 30 mm.
- The UI must show the selected printer identity before printing.
- The UI must distinguish supported B1 Pro identification from generic Bluetooth devices and from B1 devices.
- The UI must provide rescan/change/forget printer actions.
- Printing is not destructive to app data, so no recurring confirmation dialog is required after a verified printer is selected, but the selected printer and label size must remain visible.
- If a failure occurs after transfer starts, the UI must say the print result is unconfirmed and instruct the user to inspect the physical label before retrying.
- The user must be able to retry the same label without regenerating the QR code or changing box data.

Technical constraints:
- Implement a dedicated direct-BLE NIIMBOT Android plugin/API or equivalent explicit contract; do not hide scan/select/identify behavior behind the old one-method `print()` contract.
- Do not use Android PrintManager, PrintDocumentAdapter, PrintAttributes, or WebView print scaling for the supported Android B1 Pro path.
- Use Android BLE transport for the Android app path; Web Bluetooth reference code may inform the protocol but should not be assumed to run inside the Android WebView production path.
- Use the NIIMBOT BLE service UUID `e7810a71-73ae-499d-8c15-faa9aef0c3f2` and characteristic UUID `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f`, or implementation-equivalent constants verified against B1 Pro hardware.
- Use notification plus write-without-response behavior as required by the B1 Pro protocol implementation.
- Use NIIMBOT v4 framing and B1 Pro print flow for model id 4097.
- Treat B1 and B1 Pro as distinct models: B1 Pro is model id 4097, 300 dpi, `v4`; B1 is model id 4096, 203 dpi, `b1` task.
- Do not derive B1 Pro raster width from only `50 mm × 300 dpi`; use the validated B1 Pro profile width/height because printhead geometry matters.
- Monochrome conversion must be deterministic and suitable for thermal label printing.
- Persist selected printer metadata locally, including enough identity and model/profile metadata to reconnect and display the selected printer, but always re-identify before printing.
- Avoid large inefficient bridge payloads where possible; implementation may render/pack in native code or pass compact bitmap/row data across the Capacitor bridge.
- Browser/non-Android printing may remain only as a preview/development fallback and must not be presented as the supported B1 Pro Android print path.
- B1 support is out of scope except for detecting and rejecting B1 in the B1 Pro flow.

Edge cases:
- Bluetooth permission denied or permanently denied.
- Bluetooth disabled or unavailable.
- No B1 Pro candidate found during scan.
- Device advertises with a B1-like name but identifies as B1 or another unsupported model.
- Persisted printer is powered off, out of range, renamed, unavailable, or replaced.
- GATT service or characteristic is missing.
- Connection drops before, during, or after bitmap transfer.
- Printer status indicates unavailable state such as lid, paper, battery, busy, or other status where reliably available.
- Print transfer completes but printer confirmation is missing or times out.
- Label rendering fails or produces dimensions inconsistent with the selected profile.
- Long box name does not fit; QR code and box number remain higher priority.
- Future label size is added; size must be paired with B1 Pro-specific raster/profile data and must not be inferred by DPI alone.

Out of scope:
- Android Print Framework support for the production B1 Pro path.
- Generic Bluetooth printer support.
- Generic Android system-printer support.
- NIIMBOT B1 printing support.
- Supporting other NIIMBOT models beyond detecting and rejecting them in this flow.
- Multiple print modes, A4 print mode, print-profile selector, template designer, or arbitrary user custom-size editor.
- Changing QR destination semantics.
- Changing box-number assignment semantics.
- Bulk label printing.
- iOS BLE printing.
- Exposing density/speed/advanced protocol tuning to users in the first version.

Evidence:
- VERIFIED: Human instruction explicitly says the target printer is NIIMBOT B1 Pro (300 dpi) using direct Bluetooth BLE communication.
- VERIFIED: Human instruction explicitly says not to rely on Android Print Framework or expect the printer to appear as an Android system printer.
- VERIFIED: Human instruction sets default label size to 50 × 30 mm and asks to keep label width/height configurable for future label sizes.
- VERIFIED: Human instruction says to investigate direct B1 Pro BLE printing using NIIMBOT v4 protocol and references niimbot-web-bluetooth as validated against real hardware.
- VERIFIED: `.ai/README.md` requires Product Decisions to be persisted under `.ai/product/decisions/` with status `READY_FOR_HUMAN_REVIEW` until explicit human approval.
- VERIFIED: `PD-009` is `APPROVED_FOR_DEVELOPMENT` and made Niimbot B1 Pro the single printer target, but its technical constraints still included Android custom media size and stated proprietary/direct integration may require a separate decision.
- VERIFIED: `PQ-001` is answered with 50 × 30 mm as the single supported Niimbot B1 Pro label stock size.
- VERIFIED: `services/labelPrintConfig.ts` currently defines `printerName: 'Niimbot B1 Pro'`, width 50 mm, height 30 mm, QR size 17 mm, and Android media-size fields.
- VERIFIED: `App.tsx` currently calls `NativePrint.print()` on Android and falls back to `window.print()` on non-Android.
- VERIFIED: `android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java` currently uses Android `PrintManager`, `PrintDocumentAdapter`, and `PrintAttributes.MediaSize`.
- VERIFIED: `android/app/src/main/AndroidManifest.xml` currently lacks Bluetooth permissions.
- VERIFIED: GitHub repository `iscarelli/niimbot-web-bluetooth` describes itself as a zero-dependency Web Bluetooth driver with reverse-engineered protocol docs validated on real Niimbot hardware including B1 Pro.
- VERIFIED: `iscarelli/niimbot-web-bluetooth` README and protocol docs list BLE service UUID `e7810a71-73ae-499d-8c15-faa9aef0c3f2` and characteristic UUID `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f`.
- VERIFIED: `iscarelli/niimbot-web-bluetooth` registry lists B1 Pro model id 4097, dpi 300, protocol/task `v4`, name prefix `B1`, density 3, label_type 1, speed 1.
- VERIFIED: `iscarelli/niimbot-web-bluetooth` registry lists B1 model id 4096, dpi 203, task `b1`, name prefix `B1`.
- VERIFIED: `iscarelli/niimbot-web-bluetooth` registry lists B1 Pro `T50x30` as 50 × 30 mm, 576 × 354 px, 300 dpi.
- VERIFIED: `iscarelli/niimbot-web-bluetooth` README warns B1 and B1 Pro advertise with the same BLE name prefix and must be distinguished by model id.
- ASSUMED: The Android app can implement direct BLE through native Android/Capacitor APIs without requiring a separate licensed NIIMBOT SDK.
- ASSUMED: Persisting selected printer metadata can be done with local app/native preferences without a domain database migration.
- ASSUMED: Initial production scope is one label per print action for the current box.

Open questions:
- Which Android minimum and target SDK versions must be supported, and therefore what exact Bluetooth/location permission matrix is required?
- Should the UI use a separate `Connect printer` setup action, or should the first `Print Niimbot Label` action guide through setup and then print?
- Which printer identity fields should be shown to users: advertised name, Android device address/id where available, serial/model info, or a future nickname?
- Should selected printer persistence live in native SharedPreferences, existing app storage, or both?
- Should label bitmap rendering be implemented in JS/canvas and passed to native, or generated and packed entirely in native Android code?
- Which B1 Pro printer status fields are reliable enough to map into user-facing messages in the first implementation?
- Should print density remain fixed at the validated default initially, or become configurable later after real stock testing?
