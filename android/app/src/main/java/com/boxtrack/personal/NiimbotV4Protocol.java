package com.boxtrack.personal;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

final class NiimbotV4Protocol {
    static final int COMMAND_CONNECT = 0xC1;
    static final int COMMAND_PRINTER_INFO = 0x40;
    static final int RESPONSE_PRINTER_INFO = 0x48;
    static final int COMMAND_SET_DENSITY = 0x21;
    static final int RESPONSE_SET_DENSITY = 0x31;
    static final int COMMAND_SET_LABEL_TYPE = 0x23;
    static final int RESPONSE_SET_LABEL_TYPE = 0x33;
    static final int COMMAND_PRINT_START = 0x01;
    static final int RESPONSE_PRINT_START = 0x02;
    static final int COMMAND_PRINT_STATUS = 0xA3;
    static final int RESPONSE_PRINT_STATUS = 0xB3;
    static final int COMMAND_SET_PAGE_SIZE = 0x13;
    static final int RESPONSE_SET_PAGE_SIZE = 0x14;
    static final int COMMAND_PRINT_EMPTY_ROW = 0x84;
    static final int COMMAND_PRINT_BITMAP_ROW = 0x85;
    static final int COMMAND_PAGE_END = 0xE3;
    static final int RESPONSE_PAGE_END = 0xE4;
    static final int COMMAND_PRINT_END = 0xF3;
    static final int RESPONSE_PRINT_END = 0xF4;

    static final byte[] INITIAL_CONNECTION_PACKET = new byte[] {
            0x03, 0x55, 0x55, (byte) COMMAND_CONNECT, 0x01, 0x01, (byte) COMMAND_CONNECT, (byte) 0xAA, (byte) 0xAA
    };

    private static final int MAX_ROW_RUN = 200;

    private NiimbotV4Protocol() {}

    static byte checksum(int command, byte[] data) {
        byte[] payload = data == null ? new byte[0] : data;
        int crc = (command & 0xff) ^ payload.length;
        for (byte datum : payload) {
            crc ^= datum & 0xff;
        }
        return (byte) (crc & 0xff);
    }

    static byte[] pack(int command, byte[] data) {
        byte[] payload = data == null ? new byte[0] : data;
        if (payload.length > 255) {
            throw new IllegalArgumentException("NIIMBOT v4 frame payload must fit in one byte length.");
        }
        byte[] packet = new byte[7 + payload.length];
        packet[0] = 0x55;
        packet[1] = 0x55;
        packet[2] = (byte) command;
        packet[3] = (byte) payload.length;
        System.arraycopy(payload, 0, packet, 4, payload.length);
        packet[4 + payload.length] = checksum(command, payload);
        packet[5 + payload.length] = (byte) 0xAA;
        packet[6 + payload.length] = (byte) 0xAA;
        return packet;
    }

    static NiimbotResponse unpack(byte[] value) {
        if (value == null || value.length < 7) return null;
        if ((value[0] & 0xff) != 0x55 || (value[1] & 0xff) != 0x55) return null;
        int command = value[2] & 0xff;
        int length = value[3] & 0xff;
        if (value.length < 7 + length) return null;
        int crcOffset = 4 + length;
        if ((value[crcOffset] & 0xff) != (checksum(command, Arrays.copyOfRange(value, 4, crcOffset)) & 0xff)) return null;
        if ((value[crcOffset + 1] & 0xff) != 0xAA || (value[crcOffset + 2] & 0xff) != 0xAA) return null;
        return new NiimbotResponse(command, Arrays.copyOfRange(value, 4, crcOffset));
    }

    static int parseModelId(NiimbotResponse response) {
        if (response == null || response.command != RESPONSE_PRINTER_INFO || response.data.length < 1) {
            return -1;
        }
        if (response.data.length >= 2) {
            return ((response.data[0] & 0xff) << 8) | (response.data[1] & 0xff);
        }
        return (response.data[0] & 0xff) << 8;
    }

    static byte[] printStartPayload(int pages, int speed) {
        int safePages = clampU16(pages, "pages");
        return new byte[] {
                (byte) ((safePages >> 8) & 0xff), (byte) (safePages & 0xff),
                0x00, 0x00, 0x00, 0x00, 0x00, (byte) (speed & 0xff), 0x00
        };
    }

    static List<SetupPacket> initialPrintSetupPackets(int pages) {
        List<SetupPacket> packets = new ArrayList<>();
        packets.add(new SetupPacket("ble-write-initial-connect", INITIAL_CONNECTION_PACKET));
        packets.add(new SetupPacket("ble-write-set-density", pack(COMMAND_SET_DENSITY, new byte[] { 0x03 })));
        packets.add(new SetupPacket("ble-write-set-label-type", pack(COMMAND_SET_LABEL_TYPE, new byte[] { 0x01 })));
        packets.add(new SetupPacket("ble-write-print-start", pack(COMMAND_PRINT_START, printStartPayload(pages, 1))));
        return packets;
    }

    static byte[] setPageSizePayload(int heightPx, int widthPx) {
        int safeHeight = clampU16(heightPx, "heightPx");
        int safeWidth = clampU16(widthPx, "widthPx");
        return new byte[] {
                (byte) ((safeHeight >> 8) & 0xff), (byte) (safeHeight & 0xff),
                (byte) ((safeWidth >> 8) & 0xff), (byte) (safeWidth & 0xff),
                0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        };
    }

    static PrintStatus parsePrintStatus(NiimbotResponse response) {
        if (response == null || response.command != RESPONSE_PRINT_STATUS || response.data.length < 4) return null;
        return new PrintStatus(
                ((response.data[0] & 0xff) << 8) | (response.data[1] & 0xff),
                response.data[2] & 0xff,
                response.data[3] & 0xff
        );
    }

    static String mapPrinterStatusFailure(PrintStatus status, int expectedPage) {
        if (status == null) return "timeout";
        if (status.page >= expectedPage && status.printPercent >= 100 && status.feedPercent >= 100) return null;
        if (status.page >= expectedPage && (status.printPercent < 100 || status.feedPercent < 100)) return "unconfirmed-print";
        return "printer-status";
    }

    static List<RowCommand> buildRowCommands(byte[] packedRaster, int widthPx, int heightPx) {
        if (packedRaster == null) {
            throw new IllegalArgumentException("rasterBase64 is required.");
        }
        int stride = strideBytes(widthPx);
        int expected = stride * heightPx;
        if (packedRaster.length != expected) {
            throw new IllegalArgumentException("Packed raster length " + packedRaster.length + " does not match " + expected + " bytes for " + widthPx + "×" + heightPx + ".");
        }

        List<RowCommand> commands = new ArrayList<>();
        int row = 0;
        while (row < heightPx) {
            int run = 1;
            int rowOffset = row * stride;
            while (row + run < heightPx && run < MAX_ROW_RUN) {
                int nextOffset = (row + run) * stride;
                if (!rowsEqual(packedRaster, rowOffset, nextOffset, stride)) break;
                run++;
            }
            byte[] rowBytes = Arrays.copyOfRange(packedRaster, rowOffset, rowOffset + stride);
            commands.add(rowCommand(row, run, rowBytes));
            row += run;
        }
        return commands;
    }

    static byte[] rowPayload(int rowIndex, int run, byte[] rowBytes) {
        return rowCommand(rowIndex, run, rowBytes).data;
    }

    static int countBlackBits(byte[] rowBytes) {
        int total = 0;
        for (byte rowByte : rowBytes) total += Integer.bitCount(rowByte & 0xff);
        return total;
    }

    private static RowCommand rowCommand(int rowIndex, int run, byte[] rowBytes) {
        int safeRow = clampU16(rowIndex, "rowIndex");
        int safeRun = clampU8(run, "run");
        int blackBits = countBlackBits(rowBytes);
        if (blackBits == 0) {
            return new RowCommand(COMMAND_PRINT_EMPTY_ROW, new byte[] {
                    (byte) ((safeRow >> 8) & 0xff), (byte) (safeRow & 0xff), (byte) safeRun
            });
        }
        byte[] data = new byte[6 + rowBytes.length];
        data[0] = (byte) ((safeRow >> 8) & 0xff);
        data[1] = (byte) (safeRow & 0xff);
        data[2] = 0x00;
        data[3] = (byte) (blackBits & 0xff);
        data[4] = (byte) ((blackBits >> 8) & 0xff);
        data[5] = (byte) safeRun;
        System.arraycopy(rowBytes, 0, data, 6, rowBytes.length);
        return new RowCommand(COMMAND_PRINT_BITMAP_ROW, data);
    }

    private static boolean rowsEqual(byte[] bytes, int left, int right, int length) {
        for (int i = 0; i < length; i++) {
            if (bytes[left + i] != bytes[right + i]) return false;
        }
        return true;
    }

    private static int strideBytes(int widthPx) {
        if (widthPx <= 0) throw new IllegalArgumentException("widthPx must be positive.");
        return (widthPx + 7) / 8;
    }

    private static int clampU16(int value, String name) {
        if (value < 0 || value > 0xffff) throw new IllegalArgumentException(name + " must fit uint16.");
        return value;
    }

    private static int clampU8(int value, String name) {
        if (value < 0 || value > 0xff) throw new IllegalArgumentException(name + " must fit uint8.");
        return value;
    }

    static final class RowCommand {
        final int command;
        final byte[] data;

        RowCommand(int command, byte[] data) {
            this.command = command;
            this.data = data;
        }
    }

    static final class SetupPacket {
        final String stage;
        final byte[] packet;

        SetupPacket(String stage, byte[] packet) {
            this.stage = stage;
            this.packet = Arrays.copyOf(packet, packet.length);
        }
    }

    static final class NiimbotResponse {
        final int command;
        final byte[] data;

        NiimbotResponse(int command, byte[] data) {
            this.command = command;
            this.data = data;
        }
    }

    static final class PrintStatus {
        final int page;
        final int printPercent;
        final int feedPercent;

        PrintStatus(int page, int printPercent, int feedPercent) {
            this.page = page;
            this.printPercent = printPercent;
            this.feedPercent = feedPercent;
        }
    }
}
