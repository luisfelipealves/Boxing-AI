ID: PD-011
Status: APPROVED_FOR_DEVELOPMENT
Source: User instruction: "o trace ainda aparece na tela. E agora que está funcionando, podemos deixar o processo de pareamento mais automatico. lembre-se que este app ainda não é comercial. depois de obter o grant de bluetooth, ja se pode pesquisar pela niimbot e, como só há mesmo uma, conecte a ela sem precisat de iteração do usuario. mantenha o check list e vá atualizando."
Related question: None
Created: 2026-10-04

Question:
How should the NIIMBOT B1 Pro setup flow behave now that the direct BLE printing path is working, the visible trace panel is no longer desired, and the expected environment has only one NIIMBOT printer?

Decision:
The Android NIIMBOT B1 Pro label-print screen must remove the visible diagnostic trace panel from the normal user-facing UI and make first-time printer setup automatic after Bluetooth permission is granted.

After Bluetooth permission is granted, if no printer is already selected/persisted, the app must automatically scan for NIIMBOT B1 Pro candidates without requiring the user to press a separate Scan button. If exactly one candidate is found, the app must automatically identify/connect that candidate and persist it only after confirming it is a NIIMBOT B1 Pro by model id 4097. If multiple candidates are found, the app must not guess; it must show a compact candidate-selection fallback. If no candidates are found, it must show the existing no-printer-found recovery guidance and retry/rescan path.

The setup checklist remains the primary visible progress surface and must update through permission/setup, scanning, identifying/preparing, rendering, sending, and printing/confirming. Manual controls such as rescan/change, reconnect, and forget printer remain available as recovery actions after setup.

Rationale:
The trace panel was introduced as temporary diagnostic UI for hardware debugging. Now that the BLE print flow is functioning, the normal print screen should not expose raw trace/opcode details. The checklist provides the right user-facing progress feedback.

The app is currently personal/non-commercial and the expected operating environment has one NIIMBOT printer, so requiring separate scan and candidate-selection taps creates unnecessary friction. However, automatic selection should remain bounded by candidate count and B1 Pro model identification to avoid persisting or printing to the wrong model if the environment changes.

Requirements:
- Remove the visible `NIIMBOT print trace` panel, trace entry list, and trace Clear button from the normal label-print screen.
- Do not show native TX/RX opcode trace details or debug trace rows as normal user-facing UI.
- Lower-level/native diagnostic event emission may remain internally available if it is not rendered in the normal screen.
- Keep the setup/progress checklist visible.
- After Bluetooth permission is granted, automatically start scanning when no selected printer is persisted.
- If permission is already granted on page load and no selected printer is persisted, the app may automatically start setup once, with guard logic to avoid repeated scan loops.
- If exactly one NIIMBOT candidate is found, automatically identify/connect it without requiring a candidate-list tap.
- Persist selected printer metadata only after successful B1 Pro identification by model id 4097.
- Continue rejecting NIIMBOT B1 model id 4096 and unsupported models.
- If multiple candidates are found, show a manual candidate-selection fallback instead of guessing.
- If zero candidates are found, show no-printer-found guidance and a retry/rescan action.
- If a printer is already selected/persisted, keep showing its identity and use existing reconnect/re-identify behavior rather than forcing a fresh scan.
- Keep rescan/change, reconnect, and forget actions available after a printer is selected.
- Retry after recoverable print failure must continue to use the same label snapshot and must not change QR payload, box number, box data, or selected label content.

Acceptance criteria:
- The normal Android label-print screen no longer renders `NIIMBOT print trace`, trace entries, native opcode rows, or a trace `Clear` button.
- User-facing copy no longer asks the user to read or report trace/opcode/native RX/TX details during the normal print flow.
- After the user grants Bluetooth permission, the app automatically starts scanning without a second tap.
- When the automatic scan finds exactly one candidate, the app automatically attempts identification/preparation without user selection.
- The app persists the selected printer only after model id 4097 is confirmed.
- If multiple candidates are found, the app shows a chooser and does not auto-pick one.
- If no candidates are found, the app shows actionable no-printer-found feedback and a retry/rescan path.
- The checklist remains visible and shows accurate active, complete, failed, and pending states for permission/setup, scanning, identifying/preparing, rendering, sending, and printing/confirming.
- Selected printer identity and the 50 × 30 mm label profile remain visible before printing.
- Rescan/change/reconnect/forget controls remain available after a printer is selected.
- Automated source/UI guards assert that the visible trace panel and `niimbotTrace` UI subscription are absent while checklist/progress and error affordances remain present.
- `npm run test`, `npm run build`, `npx cap sync android`, and Android debug build validation pass after implementation, or any environment blocker is explicitly recorded.

UX behavior:
- Before permission is granted, show the checklist and a single primary action to grant Bluetooth access.
- After permission is granted, the UI should visibly move into scanning without asking the user to press Scan.
- During automatic scan, the checklist row for scanning should be active.
- During automatic identification/preparation, the checklist row for preparing the B1 Pro should be active.
- On successful setup, the selected printer card should show the printer identity and label profile and the print button should become available.
- The candidate list should be hidden during the happy path and shown only as a fallback when multiple candidates are found.
- Failure messages should be concise and actionable, not raw trace logs.
- Permission denied, Bluetooth unavailable/off, no printer found, unsupported model, connection/identification failure, transfer failure, timeout, disconnect, and unconfirmed print should continue to show recovery guidance.
- The UI should not look frozen during automation; the checklist and loading indicators must communicate ongoing work.

Technical constraints:
- Android Bluetooth/Nearby Devices permission prompts cannot be bypassed; explicit user permission remains required.
- Automatic setup must use the existing direct BLE plugin flow, not Android Print Framework or Android system printer selection.
- Automatic selection must still validate the connected device by model id before persistence or printing.
- Guard automatic page-load setup to prevent repeated scans/reconnect loops caused by React re-renders or state changes.
- Do not remove native diagnostic emitters unless separately scoped; this decision removes their normal UI exposure.
- Browser/non-Android behavior may remain a preview/development fallback and is not required to auto-pair.
- Implementation should prefer extracting/test-covering setup state decisions where practical so checklist behavior is testable.

Edge cases:
- Bluetooth permission denied or permanently denied: do not scan; mark permission/setup failed and show permission guidance.
- Bluetooth is off or unavailable after permission: show actionable Bluetooth guidance and stop automatic setup.
- No persisted printer and permission already granted on page entry: perform at most one automatic scan/setup attempt unless the user retries.
- Scan returns zero candidates: fail scanning with no-printer-found guidance and retry/rescan.
- Scan returns exactly one candidate: automatically identify/prep that candidate.
- Scan returns multiple candidates: show chooser and require the user to pick.
- Candidate advertises as B1-like but identifies as B1 model id 4096 or unsupported: reject and do not persist.
- Persisted printer is unavailable: show reconnect failure and provide rescan/change/forget actions.
- Print fails after transfer starts: warn that print result is unconfirmed and instruct the user to inspect the physical label before retrying.
- Future commercial/multi-printer use: this automatic behavior may need revisiting before commercial release.

Out of scope:
- Supporting multiple printer profiles or commercial multi-printer fleet management.
- Automatically choosing among multiple candidates by strongest RSSI or first result.
- Adding a user-facing debug mode or advanced diagnostics panel.
- Removing native/internal logging or diagnostic event emission.
- Changing QR payload semantics, box-number assignment, label content, raster geometry, BLE protocol sequence, or printer status mapping.
- Supporting NIIMBOT B1 or other NIIMBOT models.
- Changing release/build signing behavior.

Evidence:
- VERIFIED: The human explicitly reported that the trace still appears on screen and asked for it to be removed from the normal user-facing flow.
- VERIFIED: The human explicitly said the app is not commercial yet and that there is only one NIIMBOT in the expected environment.
- VERIFIED: The human explicitly requested that after Bluetooth grant the app should search for the NIIMBOT and connect without user interaction.
- VERIFIED: The human explicitly requested keeping and updating the checklist.
- VERIFIED: `.ai/README.md` requires Product Decisions to be persisted under `.ai/product/decisions/` with status `READY_FOR_HUMAN_REVIEW` until explicit human approval.
- VERIFIED: `PD-010` is `APPROVED_FOR_DEVELOPMENT` and requires direct BLE NIIMBOT B1 Pro printing, Bluetooth permission, scanning, B1 Pro identification, persisted selected printer metadata, progress states, and actionable errors.
- VERIFIED: `PD-010` requires rejecting NIIMBOT B1 model id 4096 and unsupported models while accepting B1 Pro model id 4097.
- VERIFIED: Subagent repository inspection found existing checklist steps for permission/setup, scanning, identifying/preparing, rendering, sending, and printing/confirming in the NIIMBOT label screen.
- VERIFIED: Subagent repository inspection found the current/manual flow includes separate permission, scan, candidate selection, reconnect/change/forget, and print actions in the NIIMBOT label UI.
- VERIFIED: Subagent repository inspection found trace UI exists in at least one NIIMBOT trace/integration worktree and the released v0.0.32 APK still contains `NIIMBOT print trace`, confirming the user's report can occur from the released artifact.
- ASSUMED: The intended operating environment has one nearby NIIMBOT printer, but BLE scans may still detect multiple candidates in some future environments.
- ASSUMED: Automatically scanning after permission is acceptable for this internal/non-commercial app from a battery/privacy perspective.
- ASSUMED: Existing native scan results provide enough candidate count and identity data to choose the exactly-one-candidate path safely.

Open questions:
- Should automatic setup also begin from the primary Print button when permission is missing, or should the permission grant remain a separate explicit first action?
- Should a future debug mode re-expose trace details behind an explicit development-only control, or should trace remain internal/logcat-only unless a new debugging task is approved?
- Before commercial release, should the default behavior change to a more explicit multi-printer setup flow?
