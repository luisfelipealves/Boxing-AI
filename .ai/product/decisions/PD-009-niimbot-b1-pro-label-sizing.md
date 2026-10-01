ID: PD-009
Status: APPROVED_FOR_DEVELOPMENT
Source: User request: "we need to adjust the qr code label size to be printed on printer Niimbot B1 Pro"; clarification: "não precisamos de vários printing modes. Somente a Niimbot será usada"
Related question: None
Created: 2026-10-01

Question:
How should BoxTrack AI adjust the QR label size so labels print correctly when only the Niimbot B1 Pro will be used?

Decision:
BoxTrack AI must make box-label printing a single Niimbot B1 Pro print flow. The product must not add multiple printing modes, an A4 mode, a generic label-printer mode, a print-profile selector, a preset list, or user-facing custom print profiles.

The existing box-label print path must be converted to Niimbot-only output. It must print one compact physical label for the current box, using one fixed Niimbot label size expressed in millimeters once the physical label stock is confirmed.

For the initial implementation, the QR payload must remain the existing box-detail route. This decision changes printed label size, layout, and print-media targeting only; it does not change QR semantics.

Required label content priority is:
1. Scannable QR code.
2. Stable human-facing box number.
3. Box name, when it fits without reducing QR scanability or box-number readability.
4. Decorative footer or branding only if space remains.

Rationale:
The user clarified that the app does not need several printing modes because only Niimbot will be used. A selector or multiple print profiles would add friction and contradict the intended product scope.

The current print flow is visually styled as a large page/card and the Android native print path requests ISO A4 media. That is incompatible with the user goal of printing one usable compact thermal label on a Niimbot B1 Pro. Resizing only the QR code is insufficient because the media size, print layout, and preview expectations also need to target a physical label.

The repository does not contain verified dimensions for the installed Niimbot label stock. A product decision that hard-codes an unverified size would risk producing another wrong layout. Therefore the product requirement is a single Niimbot-only label flow with one explicit physical-size target, while the exact width and height remain a human/test input before final implementation or acceptance.

Requirements:
- Box label printing must have exactly one supported product target: Niimbot B1 Pro.
- Do not add a print-mode selector, profile selector, preset list, custom-size editor, A4 print option, or generic label-printer option.
- The existing box-label print path must become the Niimbot print path by default.
- The label print path must target one box label per physical Niimbot label.
- The fixed Niimbot label size must be expressed in millimeters and visible to the user before printing once the target stock size is confirmed.
- The printed output must be constrained to the fixed physical Niimbot label dimensions, not the viewport height or A4 page size.
- Android printing must not request ISO A4 media for box-label printing.
- The web print layout and Android native print attributes must use the same fixed Niimbot physical label dimensions.
- The QR code must remain fully visible, high contrast, and scannable after thermal printing.
- The stable box number must remain visible and readable on saved-box labels, consistent with PD-003.
- The box name may be truncated or reduced when space is limited, but this must not compromise QR scanability or box-number readability.
- Decorative footer/branding such as “Property of BoxTrack” may be omitted on compact labels when space is constrained.
- The QR payload must remain the existing route format unless a separate approved Product Decision changes QR behavior.
- If the app cannot verify the selected printer paper size through Android/WebView printing, the UI must say so and instruct the user to select Niimbot B1 Pro and the matching fixed label size in the print dialog.

Acceptance criteria:
- The label page contains no print-mode selector, profile selector, A4 option, preset list, or custom-size editor.
- The print page names Niimbot B1 Pro as the target print flow.
- The primary print button is singular and Niimbot-specific, such as “Print Niimbot Label” or “Print Niimbot Label (<width> × <height> mm)” when dimensions are known.
- The print page no longer presents the label as a full-screen/A4-style card for box-label printing.
- The preview clearly states the fixed target Niimbot label size in millimeters once the size is confirmed.
- The preview aspect ratio matches the fixed physical Niimbot label size once the size is confirmed.
- Printing a box label does not request A4 as the intended media size.
- A successful print action produces one label for the selected box.
- The printed QR code is not clipped and remains scannable on the target thermal label.
- The printed box number is visible and readable for saved boxes.
- Long box names do not shrink or obscure the QR code or box number; they are truncated or reduced as needed.
- Footer/branding is absent or secondary when the fixed label size cannot fit it safely.
- The UI copy does not claim generic “optimized for label printers”; it references Niimbot B1 Pro and the expected label size.
- The user can cancel, correct printer or paper-size settings, and retry from the same label page.
- `npm run test` passes after implementation.
- `npm run build` passes after implementation.
- Android build validation passes after native print changes.
- Manual human testing prints at least one real label on a Niimbot B1 Pro using the fixed target label stock and verifies no clipping, correct orientation, readable box number, and scannable QR code.

UX behavior:
- The label page should present Niimbot-specific guidance instead of generic label-printer wording.
- The page should remain a single preview-and-print flow, not a mode-selection flow.
- The primary action should be singular and direct.
- The page should show the intended Niimbot printer and fixed label size before the print dialog opens once dimensions are known.
- If the exact label size is not confirmed, the UI must not claim the label is verified for a specific millimeter size.
- If Android/WebView cannot verify paper size, show a manual instruction equivalent to: “In the print dialog, select Niimbot B1 Pro and the <width> × <height> mm label size.”
- Printing does not require destructive confirmation, but it should avoid silently wasting label stock when the paper-size expectation is unknown or mismatched.
- Users must be able to return to the box page without changing box data.
- Users must be able to retry printing the same label without regenerating a different QR code or changing the box number.

Technical constraints:
- Do not change the QR payload format in this work.
- Do not change box numbering semantics in this work.
- Remove A4/full-page assumptions from the box-label print path.
- Do not implement user-facing multiple modes, presets, template designer, custom-size editor, or persisted printer profiles.
- Treat browser/non-Android printing only as a fallback using the same Niimbot-sized layout, not as a second supported product mode.
- Use physical units for page size, label container size, margins, and QR-size constraints where possible.
- Define the fixed Niimbot label dimensions in one canonical product/config constant or generated shared config so web print CSS and Android print attributes cannot drift.
- Keep web print CSS and Android `PrintAttributes.MediaSize` aligned to the same fixed physical dimensions.
- Android printing must request a custom media size matching the fixed Niimbot label dimensions, not `ISO_A4`.
- Keep no-margin print attributes only if the label layout itself accounts for safe margins and QR quiet zone.
- Do not add database migrations or database-backed printer preferences.
- If the Niimbot B1 Pro is not exposed through Android Print Service, a separate product/technical decision may be required for proprietary Niimbot SDK or app integration.

Edge cases:
- Long box name: truncate or reduce the name; do not reduce the QR code below scannable size.
- Missing box number on a saved box: do not show “—”; this remains governed by PD-003.
- Exact label stock size not yet confirmed: development must not claim final physical correctness until the size is provided and manually tested.
- Installed roll does not match the fixed product label size: warn/instruct the user to use the expected Niimbot label stock rather than offering multiple modes.
- Orientation mismatch: the preview and print output must use the same orientation expectation.
- Printer unavailable or Android print service missing: show actionable guidance to pair/select Niimbot B1 Pro and install/enable the required print service or app.
- Browser/non-Android printing: may use the same compact Niimbot-sized layout, but it is not a separate acceptance path.

Out of scope:
- Multiple printing modes.
- Generic label-printer support.
- A4/full-page label printing as a supported product path.
- Print-profile selector, preset selector, custom-size editor, or label-template designer.
- Changing QR code destination semantics.
- Changing QR scanning behavior.
- Changing box-number assignment rules.
- Bulk printing multiple labels.
- Proprietary Niimbot SDK integration unless Android Print Service proves insufficient.
- Persisting global printer preferences.

Evidence:
- VERIFIED: User clarified: “não precisamos de vários printing modes. Somente a Niimbot será usada.”
- VERIFIED: `App.tsx` `BoxLabelPage` renders a label page with box name, `QRCode size={256}`, box number, and “Property of BoxTrack”.
- VERIFIED: `App.tsx` print CSS sets `@page { margin: 0; size: auto; }` and uses a print layout with `print:h-screen`, not a fixed physical label size.
- VERIFIED: `App.tsx` `printLabel()` calls `NativePrint.print()` on Android and `window.print()` elsewhere.
- VERIFIED: `android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java` prints the current WebView with Android PrintManager using `PrintAttributes.MediaSize.ISO_A4` and no margins.
- VERIFIED: PD-003 requires printed labels for saved boxes to display stable human-facing box numbers.
- VERIFIED: PD-003 lists changing QR code format as out of scope.
- VERIFIED: Repository search found no confirmed Niimbot B1 Pro label stock dimensions, DPI, margins, or Android print-service behavior.
- ASSUMED: The user intends physical adhesive thermal labels for storage boxes, not an A4 sheet containing a label preview.
- ASSUMED: Niimbot B1 Pro is the only product-supported printer target for box-label printing.
- ASSUMED: QR scanability is more important than preserving the current decorative border/footer.
- ASSUMED: The target Niimbot label stock has one fixed physical size that the user can identify in millimeters or select in the print dialog.

Open questions:
- What exact Niimbot label stock size should be the single supported target, in millimeters?
- Is printing performed through Android Print Service, the Niimbot app, or another bridge?
- Should the first label layout include the box name by default, or should the safest compact baseline be QR code plus box number only until stock size is confirmed?
