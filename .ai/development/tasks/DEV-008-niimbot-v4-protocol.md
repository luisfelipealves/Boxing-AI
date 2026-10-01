---
id: DEV-008
type: development
title: Implement NIIMBOT B1 Pro v4 BLE protocol transport and frame helpers
status: IMPLEMENTED
source:
  - PD-010
depends_on:
  - DEV-006
parallel_class: PARALLEL_CONDITIONAL
parallel_notes:
  - Depends on constants/contracts from DEV-006.
  - Shares native BLE plugin surface with DEV-007 and integration with DEV-011.
assigned_agent: Developer-DEV-008
branch: agent/dev-008-niimbot-v4-protocol
worktree: worktrees/dev-008
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Implement NIIMBOT B1 Pro v4 protocol helpers and BLE transport behavior needed to send and confirm label print jobs.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

# Scope

- Add native protocol helpers for v4 framing/checksum/packing.
- Add notification handling and write-without-response behavior.
- Add model-id response parsing and print-status/timeout/disconnect error mapping.
- Implement the B1 Pro v4 print command sequence for packed label rows.

# Out of Scope

- UI flow.
- Printer scanning/persistence except where required by the transport contract.
- Label bitmap generation.

# Acceptance Criteria

- Supported Android path uses no Android PrintManager, PrintDocumentAdapter, PrintAttributes, Android print dialogs, or print services.
- Protocol constants match PD-010 service/characteristic UUIDs and B1 Pro v4 behavior.
- Frame/protocol helpers have deterministic unit coverage for encoding, checksums, chunking, model-id response parsing, and error mapping where feasible.
- Transport reports sending, printing/confirming, success, timeout, disconnect, transfer failure, unconfirmed print, and printer-status failures through stable bridge result/error codes.
- Implementation re-identifies the printer before every print.

# Validation

- `npm run test`
- `npm run build`
- `cd android && ./gradlew :app:testDebugUnitTest` if Android SDK is configured.
- `cd android && ./gradlew :app:assembleDebug` or document VALIDATION_NOT_RUN with blocker.

# Dependencies

- DEV-006 implemented.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-008-niimbot-v4-protocol.md`

Branch: `agent/dev-008-niimbot-v4-protocol`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-008`

Commit: `7ca4f9aaa87a2b4df0f0b7eea6de245ca85cb03e`

# Validation Result

- `npm run test` — passed: 22 tests.
- `npm run build` — passed with existing warnings.
- `npx cap sync android` — passed.
- `javac` check for `NiimbotV4Protocol.java` — passed.
- Android Gradle validation — VALIDATION_NOT_RUN: Android SDK unavailable.
