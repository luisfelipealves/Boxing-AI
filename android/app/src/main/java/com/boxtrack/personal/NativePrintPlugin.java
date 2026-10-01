package com.boxtrack.personal;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
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

import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

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
    private static final UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private static final int NIIMBOT_B1_MODEL_ID = 4096;
    private static final int NIIMBOT_B1_PRO_MODEL_ID = 4097;
    private static final String PROFILE_ID = "niimbot-b1-pro-50x30";
    private static final String PREFS = "niimbot_ble_printer";
    private static final String PREF_SELECTED = "selected_printer";
    private static final long DEFAULT_SCAN_TIMEOUT_MS = 8_000L;
    private static final long DEFAULT_CONNECT_TIMEOUT_MS = 10_000L;
    private static final long IDENTIFY_TIMEOUT_MS = 1_000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Map<String, JSObject> discoveredDevices = new LinkedHashMap<>();
    private final Map<Integer, ResponseWaiter> responseWaiters = new HashMap<>();

    private BluetoothGatt currentGatt;
    private BluetoothGattCharacteristic currentCharacteristic;
    private String currentDeviceId;

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

        connectInternal(call, deviceId, true, false, identifiedPrinter -> resolveError(
                call,
                "transmission-failed",
                "NIIMBOT B1 Pro print transfer is pending DEV-008. The printer was re-identified before this print request.",
                NIIMBOT_B1_PRO_MODEL_ID,
                deviceId,
                true
        ));
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
            return hasPermission(Manifest.permission.BLUETOOTH_SCAN);
        }
        return hasPermission(Manifest.permission.ACCESS_FINE_LOCATION);
    }

    private boolean hasConnectPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasPermission(Manifest.permission.BLUETOOTH_CONNECT);
    }

    private boolean hasPermission(String permission) {
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
        Runnable timeout = () -> {
            closeCurrentGatt();
            resolveError(call, "connection-failed", "Timed out connecting to the selected NIIMBOT printer.", null, deviceId, true);
        };
        mainHandler.postDelayed(timeout, timeoutMs);

        BluetoothGattCallback callback = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    mainHandler.removeCallbacks(timeout);
                    closeGatt(gatt);
                    resolveError(call, "connection-failed", "Unable to connect to the selected NIIMBOT printer.", null, deviceId, true);
                    return;
                }
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    currentGatt = gatt;
                    currentDeviceId = deviceId;
                    gatt.discoverServices();
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    closeGatt(gatt);
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                mainHandler.removeCallbacks(timeout);
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    resolveError(call, "connection-failed", "Unable to discover BLE services on the selected printer.", null, deviceId, true);
                    return;
                }
                BluetoothGattService service = gatt.getService(NIIMBOT_SERVICE_UUID);
                if (service == null) {
                    resolveError(call, "missing-gatt-service", "The selected device does not expose the NIIMBOT BLE service.", null, deviceId, false);
                    return;
                }
                BluetoothGattCharacteristic characteristic = service.getCharacteristic(NIIMBOT_CHARACTERISTIC_UUID);
                if (characteristic == null) {
                    resolveError(call, "missing-gatt-characteristic", "The selected device does not expose the NIIMBOT BLE characteristic.", null, deviceId, false);
                    return;
                }

                currentGatt = gatt;
                currentCharacteristic = characteristic;
                enableNotifications(gatt, characteristic);

                if (!identify) {
                    call.resolve(ok(deviceObject(device, null, null)));
                    return;
                }

                identifyConnectedPrinter(call, device, persistOnIdentify, success);
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
    private void enableNotifications(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
        gatt.setCharacteristicNotification(characteristic, true);
        BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
        if (descriptor != null) {
            descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
            gatt.writeDescriptor(descriptor);
        }
    }

    private void identifyConnectedPrinter(PluginCall call, BluetoothDevice device, boolean persist, IdentifySuccess success) {
        try {
            writeRaw(new byte[] { 0x03, 0x55, 0x55, (byte) 0xC1, 0x01, 0x01, (byte) 0xC1, (byte) 0xAA, (byte) 0xAA });
            mainHandler.postDelayed(() -> sendWait(0x40, new byte[] { 0x08 }, 0x48, IDENTIFY_TIMEOUT_MS, response -> {
                if (response == null || response.data.length < 1) {
                    resolveError(call, "identification-failed", "The selected printer did not report a model id.", null, device.getAddress(), true);
                    return;
                }
                int modelId = response.data.length >= 2
                        ? ((response.data[0] & 0xff) << 8) | (response.data[1] & 0xff)
                        : ((response.data[0] & 0xff) << 8);

                if (modelId != NIIMBOT_B1_PRO_MODEL_ID) {
                    String message = modelId == NIIMBOT_B1_MODEL_ID
                            ? "NIIMBOT B1 (model id 4096) is not supported. Use NIIMBOT B1 Pro (model id 4097)."
                            : "NIIMBOT model id " + modelId + " is not supported. Use NIIMBOT B1 Pro (model id 4097).";
                    resolveError(call, "unsupported-model", message, modelId, device.getAddress(), false);
                    return;
                }

                JSObject identified = selectedPrinterObject(device, modelId);
                if (persist) {
                    getPrefs().edit().putString(PREF_SELECTED, identified.toString()).apply();
                }
                if (success != null) {
                    success.onIdentified(identified);
                } else {
                    call.resolve(ok(identified));
                }
            }), 200L);
        } catch (Exception exception) {
            resolveError(call, "identification-failed", messageOrDefault(exception, "Unable to identify the selected printer."), null, device.getAddress(), true);
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
        writeRaw(pack(command, data));
    }

    private byte[] pack(int command, byte[] data) {
        byte[] payload = data == null ? new byte[0] : data;
        byte[] packet = new byte[7 + payload.length];
        packet[0] = 0x55;
        packet[1] = 0x55;
        packet[2] = (byte) command;
        packet[3] = (byte) payload.length;
        int crc = command ^ payload.length;
        for (int i = 0; i < payload.length; i++) {
            packet[4 + i] = payload[i];
            crc ^= payload[i] & 0xff;
        }
        packet[4 + payload.length] = (byte) (crc & 0xff);
        packet[5 + payload.length] = (byte) 0xaa;
        packet[6 + payload.length] = (byte) 0xaa;
        return packet;
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
        if (value == null || value.length < 7) return;
        if ((value[0] & 0xff) != 0x55 || (value[1] & 0xff) != 0x55) return;
        int command = value[2] & 0xff;
        int length = value[3] & 0xff;
        if (value.length < 7 + length) return;
        byte[] data = Arrays.copyOfRange(value, 4, 4 + length);
        ResponseWaiter waiter = responseWaiters.remove(command);
        if (waiter != null) {
            waiter.callback.onResponse(new NiimbotResponse(command, data));
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
    private JSObject selectedPrinterObject(BluetoothDevice device, int modelId) {
        JSObject object = deviceObject(device, null, null);
        String displayName = device.getName() == null || device.getName().trim().isEmpty()
                ? "NIIMBOT B1 Pro"
                : device.getName();
        object.put("displayName", displayName);
        object.put("reconnectId", device.getAddress());
        object.put("modelId", modelId);
        object.put("profileId", PROFILE_ID);
        object.put("profile", profileObject());
        object.put("serviceUuid", NIIMBOT_SERVICE_UUID.toString());
        object.put("characteristicUuid", NIIMBOT_CHARACTERISTIC_UUID.toString());
        object.put("identifiedAt", isoNow());
        return object;
    }

    private JSObject profileObject() {
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
        JSObject error = new JSObject();
        error.put("code", code);
        error.put("message", message);
        if (modelId != null) error.put("modelId", modelId);
        if (deviceId != null) error.put("deviceId", deviceId);
        error.put("recoverable", recoverable);
        JSObject result = new JSObject();
        result.put("ok", false);
        result.put("error", error);
        call.resolve(result);
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

    private interface ResponseCallback {
        void onResponse(NiimbotResponse response);
    }

    private interface IdentifySuccess {
        void onIdentified(JSObject identifiedPrinter);
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
