package com.boxtrack.personal;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.json.JSONObject;

import java.util.List;

public class NiimbotV4ProtocolTest {
    @Test
    public void fixedB1ProSelectionMetadataDoesNotRequireReportedModelId() throws Exception {
        JSONObject selected = NativePrintPlugin.fixedB1ProSelectedPrinterObject(
                "AA:BB:CC:DD:EE:FF",
                "B1 Pro Lab",
                "2026-10-01T00:00:00Z"
        );

        assertEquals("AA:BB:CC:DD:EE:FF", selected.getString("deviceId"));
        assertEquals("AA:BB:CC:DD:EE:FF", selected.getString("reconnectId"));
        assertEquals("B1 Pro Lab", selected.getString("displayName"));
        assertEquals(4097, selected.getInt("modelId"));
        assertEquals("niimbot-b1-pro-50x30", selected.getString("profileId"));
        assertEquals("e7810a71-73ae-499d-8c15-faa9aef0c3f2", selected.getString("serviceUuid"));
        assertEquals("bef8d6c9-9c21-4c9e-b632-bd58c1009f9f", selected.getString("characteristicUuid"));
        assertEquals(4097, selected.getJSONObject("profile").getInt("modelId"));
        assertTrue(selected.has("identifiedAt"));
    }

    @Test
    public void packUsesV4FrameMarkersLengthAndXorChecksum() {
        byte[] frame = NiimbotV4Protocol.pack(0x40, new byte[] { 0x08 });

        assertArrayEquals(new byte[] { 0x55, 0x55, 0x40, 0x01, 0x08, 0x49, (byte) 0xaa, (byte) 0xaa }, frame);
        assertEquals(0x49, NiimbotV4Protocol.checksum(0x40, new byte[] { 0x08 }) & 0xff);
    }

    @Test
    public void unpackRejectsBadChecksumAndParsesValidNotifications() {
        byte[] modelResponse = NiimbotV4Protocol.pack(0x48, new byte[] { 0x10, 0x01 });

        NiimbotV4Protocol.NiimbotResponse parsed = NiimbotV4Protocol.unpack(modelResponse);
        assertEquals(0x48, parsed.command);
        assertArrayEquals(new byte[] { 0x10, 0x01 }, parsed.data);
        assertEquals(4097, NiimbotV4Protocol.parseModelId(parsed));

        byte[] corrupt = modelResponse.clone();
        corrupt[6] ^= 0x01;
        assertNull(NiimbotV4Protocol.unpack(corrupt));
    }

    @Test
    public void parseModelIdHandlesOneByteLegacyResponseAsHighByte() {
        NiimbotV4Protocol.NiimbotResponse response = new NiimbotV4Protocol.NiimbotResponse(0x48, new byte[] { 0x10 });

        assertEquals(4096, NiimbotV4Protocol.parseModelId(response));
    }

    @Test
    public void printCommandPayloadsMatchB1ProV4SequenceConstants() {
        assertArrayEquals(new byte[] { 0x00, 0x02, 0, 0, 0, 0, 0, 0x01, 0 }, NiimbotV4Protocol.printStartPayload(2, 1));
        assertArrayEquals(
                new byte[] { 0x01, 0x62, 0x02, 0x40, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
                NiimbotV4Protocol.setPageSizePayload(354, 576)
        );
    }

    @Test
    public void buildRowCommandsRunLengthEncodesEmptyAndBitmapRows() {
        byte[] raster = new byte[] {
                0x00, 0x00,
                0x00, 0x00,
                (byte) 0x80, 0x01,
                (byte) 0x80, 0x01,
                (byte) 0xff, 0x00,
        };

        List<NiimbotV4Protocol.RowCommand> commands = NiimbotV4Protocol.buildRowCommands(raster, 16, 5);

        assertEquals(3, commands.size());
        assertEquals(0x84, commands.get(0).command);
        assertArrayEquals(new byte[] { 0x00, 0x00, 0x02 }, commands.get(0).data);
        assertEquals(0x85, commands.get(1).command);
        assertArrayEquals(new byte[] { 0x00, 0x02, 0x00, 0x02, 0x00, 0x02, (byte) 0x80, 0x01 }, commands.get(1).data);
        assertEquals(0x85, commands.get(2).command);
        assertArrayEquals(new byte[] { 0x00, 0x04, 0x00, 0x08, 0x00, 0x01, (byte) 0xff, 0x00 }, commands.get(2).data);
    }

    @Test
    public void parsePrintStatusAndMapStableErrorCodes() {
        NiimbotV4Protocol.PrintStatus done = NiimbotV4Protocol.parsePrintStatus(
                new NiimbotV4Protocol.NiimbotResponse(0xb3, new byte[] { 0x00, 0x01, 100, 100 })
        );
        NiimbotV4Protocol.PrintStatus partial = NiimbotV4Protocol.parsePrintStatus(
                new NiimbotV4Protocol.NiimbotResponse(0xb3, new byte[] { 0x00, 0x01, 100, 99 })
        );
        NiimbotV4Protocol.PrintStatus stalled = NiimbotV4Protocol.parsePrintStatus(
                new NiimbotV4Protocol.NiimbotResponse(0xb3, new byte[] { 0x00, 0x00, 50, 50 })
        );

        assertEquals(1, done.page);
        assertEquals(100, done.printPercent);
        assertEquals(100, done.feedPercent);
        assertNull(NiimbotV4Protocol.mapPrinterStatusFailure(done, 1));
        assertEquals("unconfirmed-print", NiimbotV4Protocol.mapPrinterStatusFailure(partial, 1));
        assertEquals("printer-status", NiimbotV4Protocol.mapPrinterStatusFailure(stalled, 1));
        assertEquals("timeout", NiimbotV4Protocol.mapPrinterStatusFailure(null, 1));
    }
}
