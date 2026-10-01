ID: PQ-001
Status: ANSWERED
Source: Dev Team analysis of PD-009
Related task: DEV-005
Created: 2026-10-01
Answered: 2026-10-01

Question:
What exact Niimbot B1 Pro label stock size should BoxTrack AI target as the single supported physical label size, in millimeters?

Answer:
Use 50 × 30 mm as the single supported Niimbot B1 Pro label stock size.

Why it matters:
PD-009 requires one fixed Niimbot-only label flow and requires the web print layout and Android native print attributes to use the same fixed physical dimensions. The repository does not contain verified Niimbot label stock dimensions. Implementing without the exact width and height would require inventing product behavior and could produce clipped, scaled, or unscannable labels.

Options:
- Provide the exact label stock width and height in millimeters, for example `<width> × <height> mm`, and confirm orientation if needed.
- Provide the Niimbot label roll/package specification so Development can derive the exact width and height.
- Defer implementation until the physical label stock is available for measurement and manual testing.

Technical impact:
- Final CSS `@page` size, label container dimensions, QR physical size, safe margins, and Android `PrintAttributes.MediaSize` custom dimensions should target 50 × 30 mm.
- Development can proceed as a single DEV task targeting 50 × 30 mm with no selector or multiple modes.

Blocking:
No. Human answered with 50 × 30 mm.