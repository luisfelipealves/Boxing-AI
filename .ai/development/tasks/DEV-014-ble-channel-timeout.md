---
id: DEV-014
type: development
title: Prevent indefinite B1 Pro BLE channel confirmation
status: IMPLEMENTED
source:
  - PD-010
  - Human feedback after v0.0.20: "a app fica indefinidam..."
depends_on:
  - DEV-013
parallel_class: SERIAL
assigned_agent: Developer-01
branch: agent/dev-014-ble-channel-timeout
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-014-ble-channel-timeout
started_at: 2026-10-01T19:45:00Z
updated_at: 2026-10-01T19:58:00Z
completed_at: 2026-10-01T19:58:00Z
---

# Objective

Stop the Android NIIMBOT B1 Pro setup/print flow from hanging indefinitely during B1 Pro BLE channel confirmation.

# Product Context

PD-010 approves direct BLE NIIMBOT B1 Pro printing. DEV-013 made the printer model fixed to B1 Pro model id 4097 and removed the model-id query. Human hardware feedback now indicates the app still remains indefinitely in the setup/confirmation flow.

# Scope

- Investigate the current native Android BLE connect/identify path for callbacks that can leave a Capacitor call unresolved.
- Fix the root cause so the app either advances after the B1 Pro BLE service/characteristic are usable or returns a visible recoverable error within the requested timeout.
- Preserve fixed B1 Pro model id 4097 behavior from DEV-013.
- Preserve scan/connect permission checks, required service/characteristic validation, raster/profile validation, transfer commands, and print confirmation behavior.
- Add regression coverage where feasible for any newly extracted timeout/progress logic.

# Out of Scope

- Supporting NIIMBOT B1 or other models.
- Changing label geometry or QR payload semantics.
- Reintroducing Android Print Framework.
- Broad UI redesign.

# Technical Notes

Current suspected failure path: `connectInternal` removes the connect timeout in `onServicesDiscovered`, then `enableNotifications` may set `pendingAfterNotificationsEnabled` and wait for `onDescriptorWrite`. If Android accepts `writeDescriptor` but never invokes `onDescriptorWrite`, the Capacitor `identify`/`printLabel` call can remain unresolved and the UI stays on `identifying` / "Confirm B1 Pro BLE channel" indefinitely.

The fix should avoid indefinite waits. Options include keeping a timeout active until notification setup completes, resolving with a recoverable error when notification setup never completes, or safely proceeding/falling back if descriptor completion is not required on the tested device. Choose the approach that best preserves BLE operation and avoids concurrent GATT writes.

# Acceptance Criteria

- No connect/identify/print setup path can wait indefinitely on notification descriptor setup.
- If BLE channel preparation cannot complete, the user sees a recoverable error instead of an infinite progress state.
- If the B1 Pro channel is usable, the app advances using fixed model id 4097 without model-id query.
- Automated tests pass.
- Build passes.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- Attempt Android Gradle validation if SDK is available; otherwise record `VALIDATION_NOT_RUN` with the SDK blocker.

# Dependencies

DEV-013 must be present because this task preserves the fixed model id 4097 behavior.
