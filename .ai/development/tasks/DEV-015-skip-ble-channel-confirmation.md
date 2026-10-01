---
id: DEV-015
type: development
title: Treat discovered B1 Pro GATT characteristic as connected channel
status: IMPLEMENTED
source:
  - PD-010
  - Human feedback after v0.0.21: "o problema do canal persiste. e mesmo necessario determinar o canal? a impressora ja apresenta luz verde de conectada"
depends_on:
  - DEV-014
parallel_class: SERIAL
assigned_agent: Developer-01
branch: agent/dev-015-skip-ble-channel-confirmation
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-015-skip-ble-channel-confirmation
started_at: 2026-10-01T20:12:00Z
updated_at: 2026-10-01T20:27:00Z
completed_at: 2026-10-01T20:27:00Z
---

# Objective

Remove the user-visible/blocking B1 Pro BLE channel confirmation step. If the printer connects and exposes the configured NIIMBOT B1 Pro GATT service and characteristic, treat that as the connected channel and advance.

# Product Context

PD-010 approves direct BLE NIIMBOT B1 Pro printing. DEV-013 fixed the printer model to B1 Pro model id 4097. DEV-014 bounded descriptor setup timeout, but hardware testing still reports the app stuck on channel confirmation while the printer itself shows green/connected.

The human asked whether determining the channel is really necessary. Technical interpretation: for this fixed-printer flow, discovering the known service/characteristic is sufficient to establish the channel. CCCD notification setup must not block setup or printing progress.

# Scope

- Stop blocking setup/connect/identify on BLE notification descriptor setup.
- Remove or bypass the user-visible “Confirm B1 Pro BLE channel” phase as a gate.
- Preserve fixed B1 Pro model id 4097 and required service/characteristic validation.
- Ensure print attempts proceed after service/characteristic discovery without waiting for descriptor confirmation.
- If notification-based confirmations are unavailable, do not leave the user in an indefinite state; report unconfirmed print or recoverable transmission failure according to where transfer reached.
- Update UI copy/tests as needed.

# Out of Scope

- Supporting NIIMBOT B1 or other models.
- Changing label geometry, QR payload, or box numbering.
- Reintroducing Android Print Framework.
- Generic Bluetooth printer support.

# Technical Notes

Current code calls `enableNotifications(...)` in `onServicesDiscovered` and waits for `onDescriptorWrite` before resolving connect/identify/print setup. On the tested B1 Pro, the printer shows green connected while the app still waits. The implementation should regard the known service UUID `e7810a71-73ae-499d-8c15-faa9aef0c3f2` and characteristic UUID `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f` as the channel contract.

Avoid concurrent GATT operation problems. If descriptor writes are kept, they must be non-blocking and must not conflict with immediate print writes. Prefer simpler behavior that does not enqueue CCCD writes before starting command writes if those writes are not required for the B1 Pro path under current hardware evidence.

# Acceptance Criteria

- After connecting and discovering the configured service/characteristic, setup advances without waiting for descriptor/channel confirmation.
- The UI no longer remains on “Confirm B1 Pro BLE channel”.
- Printing proceeds after service/characteristic discovery using fixed model id 4097.
- No indefinite wait is introduced elsewhere if print confirmations are unavailable.
- Existing JS tests pass.
- Build passes.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- Attempt Android Gradle validation if SDK is available; otherwise record `VALIDATION_NOT_RUN` with SDK blocker.

# Dependencies

DEV-014 must be present because this task builds on the bounded BLE setup behavior and preserves fixed B1 Pro model id 4097.
