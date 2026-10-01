---
id: DEV-010
type: development
title: Replace label page with direct B1 Pro setup/print UI and progress/error states
status: IMPLEMENTED
source:
  - PD-010
depends_on:
  - DEV-006
parallel_class: PARALLEL_CONDITIONAL
parallel_notes:
  - Depends on bridge types from DEV-006.
  - Will integrate with native methods from DEV-007/DEV-008 and renderer from DEV-009 in DEV-011.
assigned_agent: Developer-DEV-010
branch: agent/dev-010-b1-pro-print-ui
worktree: worktrees/dev-010
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Replace the Android label print button flow with an in-app direct B1 Pro BLE setup/print user experience.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

# Scope

- Update `App.tsx` or extracted React components/services.
- Add permission explanation, grant path, scan/select/connect/identify/persist states.
- Show selected printer/profile details.
- Add print progress, retry, rescan/change/forget, and actionable errors.
- Preserve non-Android preview fallback without presenting it as the supported Android path.

# Out of Scope

- Native BLE implementation.
- Protocol helper implementation.
- Bitmap renderer implementation beyond contract usage/mocks.

# Acceptance Criteria

- Android UI copy references direct connection to NIIMBOT B1 Pro and never instructs Android print services/system printer selection.
- First-run path guides permission, scan, select/connect, identify, persist, and print or disables print with setup guidance.
- Selected printer identity and configured 50 × 30 mm profile are visible before printing.
- User can rescan/change/reconnect/forget persisted printer.
- UI shows progress for permission/setup, scanning, connecting, identifying, rendering, sending, printing/confirming, success, and failure.
- All PD-010 failure classes have visible actionable messages, including unconfirmed print after transfer starts.
- Retry after recoverable failure does not mutate QR payload, box number, box data, or selected label content.

# Validation

- `npm run test`
- `npm run build`

# Dependencies

- DEV-006 implemented.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-010-b1-pro-print-ui.md`

Branch: `agent/dev-010-b1-pro-print-ui`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-010`

Commit: `69af7b54987cdcfe36e0e29ad806c7647f44b37b`

# Validation Result

- `npm run test` — passed: 5 files, 26 tests.
- `npm run build` — passed with existing warnings.
