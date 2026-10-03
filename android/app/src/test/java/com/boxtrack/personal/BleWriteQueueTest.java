package com.boxtrack.personal;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

public class BleWriteQueueTest {
    @Test
    public void writesAreSerializedUntilFallbackCompletion() {
        ManualScheduler scheduler = new ManualScheduler();
        RecordingTransport transport = new RecordingTransport(true, true, true);
        List<String> accepted = new ArrayList<>();
        BleWriteQueue queue = new BleWriteQueue(transport, scheduler, 3, 1, 20);

        queue.enqueue(new byte[] { 0x01 }, "row-1", callback("row-1", accepted));
        queue.enqueue(new byte[] { 0x02 }, "row-2", callback("row-2", accepted));
        queue.enqueue(new byte[] { 0x03 }, "page-end", callback("page-end", accepted));

        assertEquals(1, transport.stages.size());
        assertEquals("row-1", transport.stages.get(0));

        scheduler.runNext();
        assertEquals(2, transport.stages.size());
        assertEquals("row-2", transport.stages.get(1));

        scheduler.runNext();
        assertEquals(3, transport.stages.size());
        assertEquals("page-end", transport.stages.get(2));

        scheduler.runNext();
        assertEquals("row-1,row-2,page-end", String.join(",", accepted));
        assertEquals(0, queue.pendingCountForTest());
    }

    @Test
    public void rejectedWriteRetriesBeforeFailingAndClearsLaterWrites() {
        ManualScheduler scheduler = new ManualScheduler();
        RecordingTransport transport = new RecordingTransport(false, false, false);
        List<String> rejected = new ArrayList<>();
        BleWriteQueue queue = new BleWriteQueue(transport, scheduler, 3, 5, 20);

        queue.enqueue(new byte[] { 0x01 }, "ble-write-raster-row-1", new BleWriteQueue.Callback() {
            @Override public void onAccepted() {}
            @Override public void onRejected(String stage) { rejected.add(stage); }
        });
        queue.enqueue(new byte[] { 0x02 }, "page-end", callback("page-end", new ArrayList<>()));

        assertEquals(1, transport.stages.size());
        scheduler.runNext();
        scheduler.runNext();

        assertEquals(3, transport.stages.size());
        assertEquals("ble-write-raster-row-1", rejected.get(0));
        assertEquals(0, queue.pendingCountForTest());
    }

    @Test
    public void characteristicWriteCallbackDoesNotRaceFallbackCompletion() {
        ManualScheduler scheduler = new ManualScheduler();
        RecordingTransport transport = new RecordingTransport(true, true, true);
        BleWriteQueue queue = new BleWriteQueue(transport, scheduler, 3, 5, 20);

        queue.enqueue(new byte[] { 0x01 }, "first", callback("first", new ArrayList<>()));
        queue.enqueue(new byte[] { 0x02 }, "second", callback("second", new ArrayList<>()));
        queue.enqueue(new byte[] { 0x03 }, "third", callback("third", new ArrayList<>()));

        assertEquals(1, transport.stages.size());
        scheduler.runNext();
        assertEquals(2, transport.stages.size());

        // A late Android callback for the first write must not be attributed to
        // the second write that fallback pacing has already started.
        queue.onCharacteristicWriteComplete(0);
        assertEquals(2, transport.stages.size());

        scheduler.runNext();
        assertEquals(3, transport.stages.size());
        assertEquals("third", transport.stages.get(2));
    }

    @Test
    public void clearStopsQueuedWritesFromContinuing() {
        ManualScheduler scheduler = new ManualScheduler();
        RecordingTransport transport = new RecordingTransport(true, true);
        BleWriteQueue queue = new BleWriteQueue(transport, scheduler, 3, 5, 20);

        queue.enqueue(new byte[] { 0x01 }, "first", callback("first", new ArrayList<>()));
        queue.enqueue(new byte[] { 0x02 }, "second", callback("second", new ArrayList<>()));
        queue.clear();
        scheduler.runAll();

        assertEquals(1, transport.stages.size());
        assertEquals(0, queue.pendingCountForTest());
    }

    private static BleWriteQueue.Callback callback(String stage, List<String> accepted) {
        return new BleWriteQueue.Callback() {
            @Override public void onAccepted() { accepted.add(stage); }
            @Override public void onRejected(String stage) {}
        };
    }

    private static final class RecordingTransport implements BleWriteQueue.Transport {
        final Queue<Boolean> results = new ArrayDeque<>();
        final List<String> stages = new ArrayList<>();
        final List<byte[]> values = new ArrayList<>();

        RecordingTransport(boolean... results) {
            for (boolean result : results) this.results.add(result);
        }

        @Override
        public boolean write(byte[] value, String stage) {
            stages.add(stage);
            values.add(value);
            return results.isEmpty() || results.remove();
        }
    }

    private static final class ManualScheduler implements BleWriteQueue.Scheduler {
        final Queue<Runnable> tasks = new ArrayDeque<>();

        @Override
        public void postDelayed(Runnable runnable, long delayMs) {
            tasks.add(runnable);
        }

        void runNext() {
            tasks.remove().run();
        }

        void runAll() {
            while (!tasks.isEmpty()) runNext();
        }
    }
}
