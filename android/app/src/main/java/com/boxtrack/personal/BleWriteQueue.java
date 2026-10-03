package com.boxtrack.personal;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Queue;

final class BleWriteQueue {
    static final int DEFAULT_MAX_ATTEMPTS = 3;
    static final long DEFAULT_RETRY_DELAY_MS = 25L;
    static final long DEFAULT_FALLBACK_COMPLETE_DELAY_MS = 20L;

    interface Transport {
        boolean write(byte[] value, String stage);
    }

    interface Scheduler {
        void postDelayed(Runnable runnable, long delayMs);
    }

    interface Callback {
        void onAccepted();
        void onRejected(String stage);
    }

    private final Transport transport;
    private final Scheduler scheduler;
    private final int maxAttempts;
    private final long retryDelayMs;
    private final long fallbackCompleteDelayMs;
    private final Queue<PendingWrite> pending = new ArrayDeque<>();

    private PendingWrite inFlight;
    private boolean closed;

    BleWriteQueue(Transport transport, Scheduler scheduler) {
        this(transport, scheduler, DEFAULT_MAX_ATTEMPTS, DEFAULT_RETRY_DELAY_MS, DEFAULT_FALLBACK_COMPLETE_DELAY_MS);
    }

    BleWriteQueue(Transport transport, Scheduler scheduler, int maxAttempts, long retryDelayMs, long fallbackCompleteDelayMs) {
        this.transport = transport;
        this.scheduler = scheduler;
        this.maxAttempts = Math.max(1, maxAttempts);
        this.retryDelayMs = Math.max(0L, retryDelayMs);
        this.fallbackCompleteDelayMs = Math.max(0L, fallbackCompleteDelayMs);
    }

    void enqueue(byte[] value, String stage, Callback callback) {
        if (closed) {
            if (callback != null) callback.onRejected(stage);
            return;
        }
        pending.add(new PendingWrite(value, stage, callback));
        drain();
    }

    void onCharacteristicWriteComplete(int status) {
        // WRITE_TYPE_NO_RESPONSE callbacks are not consistently delivered and
        // cannot be correlated to the queued packet after fallback pacing has
        // advanced. Treat the queue's bounded fallback as the single completion
        // source so a late callback for packet A cannot release packet B.
    }

    void clear() {
        pending.clear();
        inFlight = null;
    }

    void close() {
        closed = true;
        clear();
    }

    int pendingCountForTest() {
        return pending.size() + (inFlight == null ? 0 : 1);
    }

    private void drain() {
        if (closed || inFlight != null) return;
        PendingWrite next = pending.poll();
        if (next == null) return;
        inFlight = next;
        attempt(next);
    }

    private void attempt(PendingWrite write) {
        if (closed || inFlight != write) return;
        write.attempts += 1;
        boolean accepted;
        try {
            accepted = transport.write(write.value, write.stage);
        } catch (RuntimeException exception) {
            accepted = false;
        }
        if (accepted) {
            scheduler.postDelayed(() -> completeFallback(write), fallbackCompleteDelayMs);
            return;
        }
        if (write.attempts < maxAttempts) {
            scheduler.postDelayed(() -> attempt(write), retryDelayMs);
            return;
        }
        fail(write);
    }

    private void completeFallback(PendingWrite write) {
        if (closed || inFlight != write) return;
        inFlight = null;
        if (write.callback != null) write.callback.onAccepted();
        drain();
    }

    private void fail(PendingWrite write) {
        if (inFlight == write) inFlight = null;
        if (write.callback != null) write.callback.onRejected(write.stage);
        clear();
    }

    private static final class PendingWrite {
        final byte[] value;
        final String stage;
        final Callback callback;
        int attempts;

        PendingWrite(byte[] value, String stage, Callback callback) {
            this.value = Arrays.copyOf(value, value.length);
            this.stage = stage;
            this.callback = callback;
        }
    }
}
