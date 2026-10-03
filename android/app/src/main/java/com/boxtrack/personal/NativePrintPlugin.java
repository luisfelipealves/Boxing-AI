package com.boxtrack.personal;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Base64;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(
        name = "NiimbotBlePrinter",
        permissions = {
                @Permission(alias = "bluetoothScan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
                @Permission(alias = "bluetoothConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
                @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
        }
)
public class NativePrintPlugin extends Plugin {
    private static final String TAG = "NiimbotBlePrinter";

    private static final UUID NIIMBOT_SERVICE_UUID = UUID.fromString("e7810a71-73ae-499d-8c15-faa9aef0c3f2");
    private static final UUID NIIMBOT_CHARACTERISTIC_UUID = UUID.fromString("bef8d6c9-9c21-4c9e-b632-bd58c1009f9f");
    private static final int NIIMBOT_B1_PRO_MODEL_ID = 4097;
    private static final String PROFILE_ID = "niimbot-b1-pro-50x30";
    private static final String PREFS = "niimbot_ble_printer";
    private static final String PREF_SELECTED = "selected_printer";
    private static final long DEFAULT_SCAN_TIMEOUT_MS = 8_000L;
    private static final long DEFAULT_CONNECT_TIMEOUT_MS = 10_000L;
    private static final long COMMAND_TIMEOUT_MS = 2_000L;
    private static final long PAGE_END_TIMEOUT_MS = 12_000L;
    private static final long PRINT_CONFIRM_TIMEOUT_MS = 25_000L;
    private static final long PRINT_STATUS_POLL_MS = 750L;
    private static final int B1_PRO_RASTER_WIDTH_PX = 576;
    private static final int B1_PRO_RASTER_HEIGHT_PX = 354;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Map<String, JSObject> discoveredDevices = new LinkedHashMap<>();
    private final Map<Integer, ResponseWaiter> responseWaiters = new HashMap<>();

    private BluetoothGatt currentGatt;
    private BluetoothGattCharacteristic currentCharacteristic;
    private String currentDeviceId;
    private PrintSession activePrintSession;

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(ok(permissionStatus()));
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.resolve(ok(permissionStatus()));
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAliases(new String[] { "bluetoothScan", "bluetoothConnect" }, call, "permissionsCallback");
        } else {
            requestPermissionForAlias("location", call, "permissionsCallback");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        call.resolve(ok(permissionStatus()));
    }

    @PluginMethod
    public void scan(PluginCall call) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null) {
            resolveError(call, "bluetooth-unavailable", "Bluetooth is unavailable on this device.", null, null, true);
            return;
        }
        if (!hasScanPermission()) {
            resolveError(call, "permission-denied", "Bluetooth scan permission is required to find the NIIMBOT B1 Pro.", null, null, true);
            return;
        }
        if (!adapter.isEnabled()) {
            resolveError(call, "bluetooth-disabled", "Bluetooth is turned off.", null, null, true);
            return;
        }

        BluetoothLeScanner scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            resolveError(call, "bluetooth-unavailable", "BLE scanner is unavailable on this device.", null, null, true);
            return;
        }

        long timeoutMs = Math.max(1_000L, call.getLong("timeoutMs", DEFAULT_SCAN_TIMEOUT_MS));
        discoveredDevices.clear();

        ScanCallback callback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                rememberCandidate(result);
            }

            @Override
            public void onBatchScanResults(java.util.List<ScanResult> results) {
                for (ScanResult result : results) {
                    rememberCandidate(result);
                }
            }

            @Override
            public void onScanFailed(int errorCode) {
                resolveError(call, "scan-failed", "BLE scan failed with Android error " + errorCode + ".", null, null, true);
            }
        };

        try {
            scanner.startScan(callback);
            mainHandler.postDelayed(() -> {
                try {
                    scanner.stopScan(callback);
                } catch (Exception exception) {
                    Log.w(TAG, "Unable to stop BLE scan cleanly", exception);
                }
                JSArray devices = new JSArray();
                for (JSObject device : discoveredDevices.values()) {
                    devices.put(device);
                }
                call.resolve(okArray(devices));
            }, timeoutMs);
        } catch (SecurityException exception) {
            resolveError(call, "permission-denied", "Bluetooth scan permission was denied.", null, null, true);
        } catch (Exception exception) {
            resolveError(call, "scan-failed", messageOrDefault(exception, "BLE scan failed."), null, null, true);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String deviceId = call.getString("deviceId");
        if (deviceId == null || deviceId.trim().isEmpty()) {
            resolveError(call, "device-not-found", "A Bluetooth deviceId is required.", null, null, true);
            return;
        }

        connectInternal(call, deviceId, false, true, null);
    }

    @PluginMethod
    public void identify(PluginCall call) {
        String deviceId = call.getString("deviceId");
        if (deviceId == null || deviceId.trim().isEmpty()) {
            resolveError(call, "device-not-found", "A Bluetooth deviceId is required.", null, null, true);
            return;
        }

        connectInternal(call, deviceId, true, true, null);
    }

    @PluginMethod
    public void getSelectedPrinter(PluginCall call) {
        JSObject selected = readSelectedPrinter();
        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("value", selected == null ? JSONObject.NULL : selected);
        call.resolve(result);
    }

    @PluginMethod
    public void forgetSelectedPrinter(PluginCall call) {
        getPrefs().edit().remove(PREF_SELECTED).apply();
        JSObject value = new JSObject();
        value.put("forgotten", true);
        call.resolve(ok(value));
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String deviceId = call.getString("deviceId", currentDeviceId);
        closeCurrentGatt();
        JSObject value = new JSObject();
        value.put("deviceId", deviceId == null ? "" : deviceId);
        call.resolve(ok(value));
    }

    @PluginMethod
    public void printLabel(PluginCall call) {
        String deviceId = call.getString("deviceId");
        String profileId = call.getString("profileId");
        if (deviceId == null || deviceId.trim().isEmpty()) {
            resolveError(call, "device-not-found", "A selected NIIMBOT B1 Pro deviceId is required before printing.", null, null, true);
            return;
        }
        if (!PROFILE_ID.equals(profileId)) {
            resolveError(call, "invalid-raster", "The requested label profile is not supported by this Android build.", null, deviceId, false);
            return;
        }

        int rasterWidth = call.getInt("rasterWidthPx", 0);
        int rasterHeight = call.getInt("rasterHeightPx", 0);
        if (rasterWidth != B1_PRO_RASTER_WIDTH_PX || rasterHeight != B1_PRO_RASTER_HEIGHT_PX) {
            resolveError(call, "invalid-raster", "B1 Pro 50 × 30 mm printing requires a 576 × 354 packed raster.", null, deviceId, false);
            return;
        }

        String rasterBase64 = call.getString("rasterBase64");
        byte[] packedRaster;
        try {
            packedRaster = Base64.decode(rasterBase64 == null ? "" : rasterBase64, Base64.DEFAULT);
            NiimbotV4Protocol.buildRowCommands(packedRaster, rasterWidth, rasterHeight);
        } catch (IllegalArgumentException exception) {
            resolveError(call, "invalid-raster", messageOrDefault(exception, "The packed B1 Pro raster payload is invalid."), null, deviceId, false);
            return;
        }

        int copies = Math.max(1, Math.min(call.getInt("copies", 1), 99));
        long printTimeoutMs = Math.max(5_000L, call.getLong("timeoutMs", PRINT_CONFIRM_TIMEOUT_MS));
        connectInternal(call, deviceId, true, false, identifiedPrinter -> startPrintTransfer(call, deviceId, packedRaster, copies, printTimeoutMs));
    }

    private void startPrintTransfer(PluginCall call, String deviceId, byte[] packedRaster, int copies, long printTimeoutMs) {
        PrintSession session = new PrintSession(call, deviceId, copies);
        activePrintSession = session;
        session.stage = "sending";
        try {
            sendWait(NiimbotV4Protocol.COMMAND_SET_DENSITY, new byte[] { 0x03 }, NiimbotV4Protocol.RESPONSE_SET_DENSITY, COMMAND_TIMEOUT_MS, densityResponse -> {
                logUnconfirmedSetupResponse(densityResponse, "SetDensity");
                sendWait(NiimbotV4Protocol.COMMAND_SET_LABEL_TYPE, new byte[] { 0x01 }, NiimbotV4Protocol.RESPONSE_SET_LABEL_TYPE, COMMAND_TIMEOUT_MS, labelTypeResponse -> {
                    logUnconfirmedSetupResponse(labelTypeResponse, "SetLabelType");
                    sendWait(NiimbotV4Protocol.COMMAND_PRINT_START, NiimbotV4Protocol.printStartPayload(copies, 1), NiimbotV4Protocol.RESPONSE_PRINT_START, COMMAND_TIMEOUT_MS, startResponse -> {
                        logUnconfirmedSetupResponse(startResponse, "PrintStart");
                        session.transferStarted = true;
                        sendPrintStatusProbeThenPage(session, packedRaster, printTimeoutMs);
                    });
                });
            });
        } catch (Exception exception) {
            failPrint(session, "transmission-failed", messageOrDefault(exception, "Unable to start NIIMBOT B1 Pro print transfer."), true);
        }
    }

    private void sendPrintStatusProbeThenPage(PrintSession session, byte[] packedRaster, long printTimeoutMs) {
        try {
            writeRaw(NiimbotV4Protocol.pack(NiimbotV4Protocol.COMMAND_PRINT_STATUS, new byte[] { 0x01 }));
            mainHandler.postDelayed(() -> sendPage(session, packedRaster, printTimeoutMs), 30L);
        } catch (Exception exception) {
            failPrint(session, "transmission-failed", messageOrDefault(exception, "Unable to send NIIMBOT print-status probe."), true);
        }
    }

    private void sendPage(PrintSession session, byte[] packedRaster, long printTimeoutMs) {
        try {
            sendWait(NiimbotV4Protocol.COMMAND_SET_PAGE_SIZE, NiimbotV4Protocol.setPageSizePayload(B1_PRO_RASTER_HEIGHT_PX, B1_PRO_RASTER_WIDTH_PX), NiimbotV4Protocol.RESPONSE_SET_PAGE_SIZE, COMMAND_TIMEOUT_MS, pageSizeResponse -> {
                logUnconfirmedSetupResponse(pageSizeResponse, "SetPageSize");
                try {
                    List<NiimbotV4Protocol.RowCommand> rowCommands = NiimbotV4Protocol.buildRowCommands(packedRaster, B1_PRO_RASTER_WIDTH_PX, B1_PRO_RASTER_HEIGHT_PX);
                    session.transferStarted = true;
                    for (NiimbotV4Protocol.RowCommand rowCommand : rowCommands) {
                        writeRaw(NiimbotV4Protocol.pack(rowCommand.command, rowCommand.data));
                    }
                    sendWait(NiimbotV4Protocol.COMMAND_PAGE_END, new byte[] { 0x01 }, NiimbotV4Protocol.RESPONSE_PAGE_END, PAGE_END_TIMEOUT_MS, pageEndResponse -> {
                        if (!requireResponse(session, pageEndResponse, "PageEnd")) return;
                        session.stage = "printing-confirming";
                        session.deadlineAtMs = System.currentTimeMillis() + printTimeoutMs;
                        pollPrintStatus(session);
                    });
                } catch (Exception exception) {
                    failPrint(session, "transmission-failed", messageOrDefault(exception, "Unable to transfer packed label rows to the NIIMBOT B1 Pro."), true);
                }
            });
        } catch (Exception exception) {
            failPrint(session, "transmission-failed", messageOrDefault(exception, "Unable to send NIIMBOT page setup."), true);
        }
    }

    private void pollPrintStatus(PrintSession session) {
        if (session.resolved) return;
        if (System.currentTimeMillis() > session.deadlineAtMs) {
            failPrint(session, "timeout", "Timed out waiting for the NIIMBOT B1 Pro to confirm the printed label.", true);
            return;
        }
        try {
            sendWait(NiimbotV4Protocol.COMMAND_PRINT_STATUS, new byte[] { 0x01 }, NiimbotV4Protocol.RESPONSE_PRINT_STATUS, COMMAND_TIMEOUT_MS, statusResponse -> {
                NiimbotV4Protocol.PrintStatus status = NiimbotV4Protocol.parsePrintStatus(toProtocolResponse(statusResponse));
                String failure = NiimbotV4Protocol.mapPrinterStatusFailure(status, session.copies);
                if (failure == null) {
                    finishPrint(session);
                    return;
                }
                if ("unconfirmed-print".equals(failure)) {
                    failPrint(session, "unconfirmed-print", "The printer reported the page but did not confirm print/feed completion. Inspect the physical label before retrying.", true);
                    return;
                }
                mainHandler.postDelayed(() -> pollPrintStatus(session), PRINT_STATUS_POLL_MS);
            });
        } catch (Exception exception) {
            failPrint(session, "printer-status", messageOrDefault(exception, "Unable to read NIIMBOT print status."), true);
        }
    }

    private void finishPrint(PrintSession session) {
        try {
            sendWait(NiimbotV4Protocol.COMMAND_PRINT_END, new byte[] { 0x01 }, NiimbotV4Protocol.RESPONSE_PRINT_END, COMMAND_TIMEOUT_MS, endResponse -> {
                if (!requireResponse(session, endResponse, "PrintEnd")) return;
                session.stage = "success";
                JSObject value = new JSObject();
                value.put("jobId", "niimbot-b1-pro-" + System.currentTimeMillis());
                value.put("deviceId", session.deviceId);
                value.put("modelId", NIIMBOT_B1_PRO_MODEL_ID);
                value.put("profileId", PROFILE_ID);
                value.put("status", "success");
                value.put("confirmed", true);
                value.put("copies", session.copies);
                resolvePrint(session, value);
            });
        } catch (Exception exception) {
            failPrint(session, "unconfirmed-print", messageOrDefault(exception, "The label printed, but final NIIMBOT PrintEnd confirmation failed. Inspect the physical label before retrying."), true);
        }
    }

    private boolean requireResponse(PrintSession session, NiimbotResponse response, String operation) {
        if (response != null) return true;
        failPrint(session, "timeout", "Timed out waiting for NIIMBOT " + operation + " confirmation.", true);
        return false;
    }

    private void logUnconfirmedSetupResponse(NiimbotResponse response, String operation) {
        if (response == null) {
            Log.w(TAG, "Continuing NIIMBOT B1 Pro print setup without " + operation + " notification confirmation");
        }
    }

    private NiimbotV4Protocol.NiimbotResponse toProtocolResponse(NiimbotResponse response) {
        if (response == null) return null;
        return new NiimbotV4Protocol.NiimbotResponse(response.command, response.data);
    }

    private void failPrint(PrintSession session, String code, String message, boolean recoverable) {
        if (session == null || session.resolved) return;
        session.resolved = true;
        if (activePrintSession == session) activePrintSession = null;
        String resolvedCode = code;
        String resolvedMessage = message;
        if (session.transferStarted && !"unconfirmed-print".equals(code)) {
            resolvedCode = "unconfirmed-print";
            resolvedMessage = message + " The label transfer had already started. Inspect the physical label before retrying.";
        }
        resolveError(session.call, resolvedCode, resolvedMessage, NIIMBOT_B1_PRO_MODEL_ID, session.deviceId, recoverable);
    }

    private void resolvePrint(PrintSession session, JSObject value) {
        if (session == null || session.resolved) return;
        session.resolved = true;
        if (activePrintSession == session) activePrintSession = null;
        session.call.resolve(ok(value));
    }

    private JSObject permissionStatus() {
        JSObject status = new JSObject();
        BluetoothAdapter adapter = getBluetoothAdapter();
        String bluetoothState = adapter == null ? "unavailable" : "granted";
        status.put("bluetoothScan", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? runtimePermissionState(Manifest.permission.BLUETOOTH_SCAN) : bluetoothState);
        status.put("bluetoothConnect", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? runtimePermissionState(Manifest.permission.BLUETOOTH_CONNECT) : bluetoothState);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            status.put("location", runtimePermissionState(Manifest.permission.ACCESS_FINE_LOCATION));
        }
        return status;
    }

    private String runtimePermissionState(String permission) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return "granted";
        }
        PermissionState capacitorState = getPermissionState(permissionAlias(permission));
        if (capacitorState == PermissionState.GRANTED) {
            return "granted";
        }
        if (getContext() != null && ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED) {
            return "granted";
        }
        return capacitorState == PermissionState.DENIED ? "denied" : "prompt";
    }

    private String permissionAlias(String permission) {
        if (Manifest.permission.BLUETOOTH_SCAN.equals(permission)) return "bluetoothScan";
        if (Manifest.permission.BLUETOOTH_CONNECT.equals(permission)) return "bluetoothConnect";
        return "location";
    }

    private boolean hasScanPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return hasRuntimePermission(Manifest.permission.BLUETOOTH_SCAN);
        }
        return hasRuntimePermission(Manifest.permission.ACCESS_FINE_LOCATION);
    }

    private boolean hasConnectPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasRuntimePermission(Manifest.permission.BLUETOOTH_CONNECT);
    }

    private boolean hasRuntimePermission(String permission) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private BluetoothAdapter getBluetoothAdapter() {
        Context context = getContext();
        if (context == null) return null;
        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    @SuppressLint("MissingPermission")
    private void rememberCandidate(ScanResult result) {
        if (result == null || result.getDevice() == null) return;
        BluetoothDevice device = result.getDevice();
        String name = device.getName();
        ScanRecord record = result.getScanRecord();
        if ((name == null || name.trim().isEmpty()) && record != null) {
            name = record.getDeviceName();
        }
        boolean hasNiimbotService = false;
        JSArray serviceUuids = new JSArray();
        if (record != null && record.getServiceUuids() != null) {
            for (ParcelUuid uuid : record.getServiceUuids()) {
                String uuidText = uuid.getUuid().toString().toLowerCase(Locale.US);
                serviceUuids.put(uuidText);
                if (NIIMBOT_SERVICE_UUID.toString().equals(uuidText)) {
                    hasNiimbotService = true;
                }
            }
        }

        boolean b1NameCandidate = name != null && name.toUpperCase(Locale.US).startsWith("B1");
        if (!b1NameCandidate && !hasNiimbotService) {
            return;
        }

        JSObject candidate = deviceObject(device, result.getRssi(), serviceUuids);
        if (name != null) candidate.put("name", name);
        candidate.put("b1NameCandidate", b1NameCandidate);
        candidate.put("supportProven", false);
        discoveredDevices.put(device.getAddress(), candidate);
    }

    @SuppressLint("MissingPermission")
    private void connectInternal(PluginCall call, String deviceId, boolean identify, boolean persistOnIdentify, IdentifySuccess success) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null) {
            resolveError(call, "bluetooth-unavailable", "Bluetooth is unavailable on this device.", null, deviceId, true);
            return;
        }
        if (!hasConnectPermission()) {
            resolveError(call, "permission-denied", "Bluetooth connect permission is required for the NIIMBOT B1 Pro.", null, deviceId, true);
            return;
        }
        if (!adapter.isEnabled()) {
            resolveError(call, "bluetooth-disabled", "Bluetooth is turned off.", null, deviceId, true);
            return;
        }

        BluetoothDevice device;
        try {
            device = adapter.getRemoteDevice(deviceId);
        } catch (IllegalArgumentException exception) {
            resolveError(call, "device-not-found", "The selected Bluetooth device was not found.", null, deviceId, true);
            return;
        }

        closeCurrentGatt();
        long timeoutMs = Math.max(1_000L, call.getLong("timeoutMs", DEFAULT_CONNECT_TIMEOUT_MS));
        BleChannelPreparationGate preparationGate = new BleChannelPreparationGate();
        Runnable timeout = () -> {
            if (!preparationGate.tryFinish()) return;
            closeCurrentGatt();
            resolveDetailedError(call, "connection-failed", "Timed out discovering the NIIMBOT B1 Pro BLE service and characteristic.", null, deviceId, true, "discover-services-timeout", null, null);
        };
        mainHandler.postDelayed(timeout, timeoutMs);

        BluetoothGattCallback callback = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    closeGatt(gatt);
                    if (preparationGate.tryFinish()) {
                        mainHandler.removeCallbacks(timeout);
                        resolveDetailedError(call, "connection-failed", "Unable to connect to the selected NIIMBOT printer.", null, deviceId, true, "connection-state", status, newState);
                    }
                    return;
                }
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    currentGatt = gatt;
                    currentDeviceId = deviceId;
                    gatt.discoverServices();
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    PrintSession session = activePrintSession;
                    closeGatt(gatt);
                    if (!preparationGate.isFinished()) {
                        if (preparationGate.tryFinish()) {
                            mainHandler.removeCallbacks(timeout);
                            resolveDetailedError(call, "connection-failed", "The NIIMBOT B1 Pro disconnected while discovering its BLE service and characteristic.", null, deviceId, true, "service-discovery-disconnected", status, newState);
                        }
                        return;
                    }
                    if (session != null && !session.resolved) {
                        failPrint(session, "disconnect", "The NIIMBOT B1 Pro disconnected during printing. Inspect the physical label before retrying.", true);
                    }
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    if (preparationGate.tryFinish()) {
                        mainHandler.removeCallbacks(timeout);
                        resolveDetailedError(call, "connection-failed", "Unable to discover BLE services on the selected printer.", null, deviceId, true, "services-discovered", status, null);
                    }
                    return;
                }
                BluetoothGattService service = gatt.getService(NIIMBOT_SERVICE_UUID);
                if (service == null) {
                    if (preparationGate.tryFinish()) {
                        mainHandler.removeCallbacks(timeout);
                        resolveDetailedError(call, "missing-gatt-service", "The selected device does not expose the NIIMBOT BLE service.", null, deviceId, false, "find-niimbot-service", status, null);
                    }
                    return;
                }
                BluetoothGattCharacteristic characteristic = service.getCharacteristic(NIIMBOT_CHARACTERISTIC_UUID);
                if (characteristic == null) {
                    if (preparationGate.tryFinish()) {
                        mainHandler.removeCallbacks(timeout);
                        resolveDetailedError(call, "missing-gatt-characteristic", "The selected device does not expose the NIIMBOT BLE characteristic.", null, deviceId, false, "find-niimbot-characteristic", status, null);
                    }
                    return;
                }

                currentGatt = gatt;
                currentCharacteristic = characteristic;
                listenForNotifications(gatt, characteristic);
                if (!preparationGate.tryFinish()) return;
                mainHandler.removeCallbacks(timeout);
                if (!identify) {
                    call.resolve(ok(deviceObject(device, null, null)));
                    return;
                }

                useFixedB1ProPrinter(call, device, persistOnIdentify, success);
            }

            @Override
            public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                handleNotification(characteristic.getValue());
            }

            @Override
            public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, byte[] value) {
                handleNotification(value);
            }
        };

        try {
            currentGatt = device.connectGatt(getContext(), false, callback);
        } catch (SecurityException exception) {
            mainHandler.removeCallbacks(timeout);
            resolveError(call, "permission-denied", "Bluetooth connect permission was denied.", null, deviceId, true);
        } catch (Exception exception) {
            mainHandler.removeCallbacks(timeout);
            resolveError(call, "connection-failed", messageOrDefault(exception, "Unable to connect to the selected printer."), null, deviceId, true);
        }
    }

    @SuppressLint("MissingPermission")
    private void listenForNotifications(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
        try {
            gatt.setCharacteristicNotification(characteristic, true);
        } catch (Exception exception) {
            Log.w(TAG, "Unable to request local BLE notification routing; print commands will use bounded confirmation waits", exception);
        }
    }

    private void useFixedB1ProPrinter(PluginCall call, BluetoothDevice device, boolean persist, IdentifySuccess success) {
        JSObject identified = selectedPrinterObject(device);
        if (persist) {
            getPrefs().edit().putString(PREF_SELECTED, identified.toString()).apply();
        }
        if (success != null) {
            success.onIdentified(identified);
        } else {
            call.resolve(ok(identified));
        }
    }

    private void sendWait(int command, byte[] data, int wantedResponse, long timeoutMs, ResponseCallback callback) {
        ResponseWaiter waiter = new ResponseWaiter(wantedResponse, callback);
        responseWaiters.put(wantedResponse, waiter);
        mainHandler.postDelayed(() -> {
            ResponseWaiter pending = responseWaiters.remove(wantedResponse);
            if (pending != null) {
                pending.callback.onResponse(null);
            }
        }, timeoutMs);
        writeRaw(NiimbotV4Protocol.pack(command, data));
    }

    @SuppressLint("MissingPermission")
    private void writeRaw(byte[] value) {
        if (currentGatt == null || currentCharacteristic == null) {
            throw new IllegalStateException("Printer is not connected.");
        }
        currentCharacteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
        currentCharacteristic.setValue(value);
        if (!currentGatt.writeCharacteristic(currentCharacteristic)) {
            throw new IllegalStateException("BLE write was not accepted by Android.");
        }
    }

    private void handleNotification(byte[] value) {
        NiimbotV4Protocol.NiimbotResponse parsed = NiimbotV4Protocol.unpack(value);
        if (parsed == null) return;
        ResponseWaiter waiter = responseWaiters.remove(parsed.command);
        if (waiter != null) {
            waiter.callback.onResponse(new NiimbotResponse(parsed.command, parsed.data));
        }
    }

    @SuppressLint("MissingPermission")
    private JSObject deviceObject(BluetoothDevice device, Integer rssi, JSArray advertisedServiceUuids) {
        JSObject object = new JSObject();
        object.put("deviceId", device.getAddress());
        object.put("address", device.getAddress());
        String name = device.getName();
        if (name != null && !name.trim().isEmpty()) {
            object.put("name", name);
        }
        if (rssi != null) {
            object.put("rssi", rssi);
        }
        if (advertisedServiceUuids != null) {
            object.put("advertisedServiceUuids", advertisedServiceUuids);
        }
        return object;
    }

    @SuppressLint("MissingPermission")
    private JSObject selectedPrinterObject(BluetoothDevice device) {
        String name = device.getName();
        return fixedB1ProSelectedPrinterObject(device.getAddress(), name, isoNow());
    }

    static JSObject fixedB1ProSelectedPrinterObject(String address, String name, String identifiedAt) {
        JSObject object = new JSObject();
        object.put("deviceId", address);
        object.put("address", address);
        if (name != null && !name.trim().isEmpty()) {
            object.put("name", name);
        }
        String displayName = name == null || name.trim().isEmpty()
                ? "NIIMBOT B1 Pro"
                : name;
        object.put("displayName", displayName);
        object.put("reconnectId", address);
        object.put("modelId", NIIMBOT_B1_PRO_MODEL_ID);
        object.put("profileId", PROFILE_ID);
        object.put("profile", profileObject());
        object.put("serviceUuid", NIIMBOT_SERVICE_UUID.toString());
        object.put("characteristicUuid", NIIMBOT_CHARACTERISTIC_UUID.toString());
        object.put("identifiedAt", identifiedAt);
        return object;
    }

    private static JSObject profileObject() {
        JSObject profile = new JSObject();
        profile.put("id", PROFILE_ID);
        profile.put("printerName", "Niimbot B1 Pro");
        profile.put("labelName", "50 × 30 mm");
        profile.put("widthMm", 50);
        profile.put("heightMm", 30);
        profile.put("dpi", 300);
        profile.put("rasterWidthPx", 576);
        profile.put("rasterHeightPx", 354);
        profile.put("modelId", NIIMBOT_B1_PRO_MODEL_ID);
        profile.put("protocolTask", "v4");
        profile.put("density", 3);
        profile.put("labelType", 1);
        profile.put("speed", 1);
        profile.put("marginTopPx", 0);
        profile.put("marginRightPx", 0);
        profile.put("marginBottomPx", 0);
        profile.put("marginLeftPx", 0);
        profile.put("serviceUuid", NIIMBOT_SERVICE_UUID.toString());
        profile.put("characteristicUuid", NIIMBOT_CHARACTERISTIC_UUID.toString());
        return profile;
    }

    private JSObject readSelectedPrinter() {
        String json = getPrefs().getString(PREF_SELECTED, null);
        if (json == null) return null;
        try {
            return new JSObject(json);
        } catch (JSONException exception) {
            Log.w(TAG, "Ignoring invalid persisted printer metadata", exception);
            return null;
        }
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private JSObject ok(JSObject value) {
        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("value", value);
        return result;
    }

    private JSObject okArray(JSArray value) {
        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("value", value);
        return result;
    }

    private void resolveError(PluginCall call, String code, String message, Integer modelId, String deviceId, boolean recoverable) {
        resolveDetailedError(call, code, message, modelId, deviceId, recoverable, null, null, null);
    }

    private void resolveDetailedError(PluginCall call, String code, String message, Integer modelId, String deviceId, boolean recoverable, String stage, Integer gattStatus, Integer bleState) {
        JSObject error = new JSObject();
        error.put("code", code);
        error.put("message", message);
        if (modelId != null) error.put("modelId", modelId);
        if (deviceId != null) error.put("deviceId", deviceId);
        if (stage != null) error.put("stage", stage);
        if (gattStatus != null) error.put("gattStatus", gattStatus);
        if (bleState != null) error.put("bleState", bleState);
        String diagnostic = bleDiagnostic(stage, deviceId, gattStatus, bleState);
        if (diagnostic != null) error.put("diagnostic", diagnostic);
        error.put("recoverable", recoverable);
        JSObject result = new JSObject();
        result.put("ok", false);
        result.put("error", error);
        call.resolve(result);
    }

    private String bleDiagnostic(String stage, String deviceId, Integer gattStatus, Integer bleState) {
        StringBuilder builder = new StringBuilder();
        if (stage != null) builder.append("stage=").append(stage);
        if (deviceId != null) appendDiagnosticPart(builder, "device", deviceId);
        if (gattStatus != null) appendDiagnosticPart(builder, "gattStatus", String.valueOf(gattStatus));
        if (bleState != null) appendDiagnosticPart(builder, "bleState", String.valueOf(bleState));
        return builder.length() == 0 ? null : builder.toString();
    }

    private void appendDiagnosticPart(StringBuilder builder, String key, String value) {
        if (builder.length() > 0) builder.append("; ");
        builder.append(key).append("=").append(value);
    }

    @SuppressLint("MissingPermission")
    private void closeCurrentGatt() {
        if (currentGatt != null) {
            closeGatt(currentGatt);
        }
        currentGatt = null;
        currentCharacteristic = null;
        currentDeviceId = null;
        responseWaiters.clear();
    }

    @SuppressLint("MissingPermission")
    private void closeGatt(BluetoothGatt gatt) {
        try {
            gatt.disconnect();
        } catch (Exception ignored) {
        }
        try {
            gatt.close();
        } catch (Exception ignored) {
        }
    }

    private String messageOrDefault(Exception exception, String defaultMessage) {
        return exception.getMessage() == null ? defaultMessage : exception.getMessage();
    }

    private String isoNow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return java.time.Instant.now().toString();
        }
        return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new java.util.Date());
    }

    private static class PrintSession {
        final PluginCall call;
        final String deviceId;
        final int copies;
        boolean resolved;
        boolean transferStarted;
        long deadlineAtMs;
        String stage;

        PrintSession(PluginCall call, String deviceId, int copies) {
            this.call = call;
            this.deviceId = deviceId;
            this.copies = copies;
        }
    }

    private interface ResponseCallback {
        void onResponse(NiimbotResponse response);
    }

    private interface IdentifySuccess {
        void onIdentified(JSObject identifiedPrinter);
    }

    static class BleChannelPreparationGate {
        private final AtomicBoolean finished = new AtomicBoolean(false);

        boolean tryFinish() {
            return finished.compareAndSet(false, true);
        }

        boolean isFinished() {
            return finished.get();
        }
    }


    private static class ResponseWaiter {
        final int command;
        final ResponseCallback callback;

        ResponseWaiter(int command, ResponseCallback callback) {
            this.command = command;
            this.callback = callback;
        }
    }

    private static class NiimbotResponse {
        final int command;
        final byte[] data;

        NiimbotResponse(int command, byte[] data) {
            this.command = command;
            this.data = data;
        }
    }
}
