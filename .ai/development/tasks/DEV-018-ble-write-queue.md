---
id: DEV-018
type: development
title: Serialize NIIMBOT B1 Pro BLE writes with bounded retry
status: IMPLEMENTED
source:
  - PD-010
  - Human feedback after v0.0.26: "BLE write was not accepted by Android ... nothing printed"
depends_on:
  - DEV-017
parallel_class: SERIAL
assigned_agent: Hermes
branch: agent/dev-018-ble-write-queue
worktree: /home/felipe/.hermes/cache/scratch/boxing-ai-dev-018-ble-write-queue
created_at: 2026-10-03T03:51:09Z
updated_at: 2026-10-03T03:51:09Z
completed_at: 2026-10-03T03:51:09Z
---

# Objective

Prevent Android from rejecting NIIMBOT B1 Pro BLE writes during print transfer by serializing native GATT writes and adding bounded retry/backpressure.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

The user reported that printing reaches native BLE transfer, then fails with `BLE write was not accepted by Android`, diagnostic only included device id, and nothing printed.

# Scope

- Add a native Android BLE write queue that allows only one in-flight write at a time.
- Add bounded retry when Android rejects a write synchronously.
- Serialize raster row writes and ensure `PageEnd` cannot overtake row packets.
- Clear pending writes on print failure, disconnect, close, and success.
- Include write-stage diagnostics in user-visible bridge errors.
- Add JVM-testable queue coverage where environment allows.

# Out of Scope

- Changing NIIMBOT protocol constants or label geometry.
- Changing QR payload or box numbering semantics.
- Supporting other printer models.

# Acceptance Criteria

- Raster rows are queued sequentially instead of being written in a tight loop.
- Android synchronous `writeCharacteristic` rejection retries before failing.
- A permanent rejection fails with a stage such as `ble-write-raster-row-N`.
- The app no longer reports only `device=...` for this class of write failure.
- `npm run test`, `npm run build`, and `npx cap sync android` pass.
- Android Gradle validation is attempted and documented.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- BLE write queue focused JVM/harness validation
- `cd android && ./gradlew :app:testDebugUnitTest --tests com.boxtrack.personal.BleWriteQueueTest` or document SDK blocker

# Dependencies

DEV-017 must be present because this task builds on the fixed WebView raster renderer.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-018-implementation-handoff.md`
