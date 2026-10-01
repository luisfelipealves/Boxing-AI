package com.boxtrack.personal;

import android.app.Activity;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    private static final String TAG = "NativePrint";
    private static final String LABEL_MEDIA_SIZE_ID = "NIIMBOT_B1_PRO_50X30";
    private static final String LABEL_MEDIA_SIZE_LABEL = "Niimbot B1 Pro 50 x 30 mm";
    private static final int LABEL_WIDTH_MILS = 1969;
    private static final int LABEL_HEIGHT_MILS = 1181;
    private static final PrintAttributes.MediaSize NIIMBOT_B1_PRO_50X30 =
            new PrintAttributes.MediaSize(
                    LABEL_MEDIA_SIZE_ID,
                    LABEL_MEDIA_SIZE_LABEL,
                    LABEL_WIDTH_MILS,
                    LABEL_HEIGHT_MILS
            );

    @PluginMethod
    public void print(PluginCall call) {
        Log.i(TAG, "[PRINT] native print requested");

        try {
            Activity activity = getActivity();
            if (activity == null) {
                reject(call, "Activity is unavailable");
                return;
            }

            WebView webView = getBridge().getWebView();
            if (webView == null) {
                reject(call, "WebView is unavailable");
                return;
            }

            PrintManager printManager =
                    (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) {
                reject(call, "Android PrintManager is unavailable");
                return;
            }

            activity.runOnUiThread(() -> {
                try {
                    Log.i(TAG, "[PRINT] creating print adapter from current WebView");
                    PrintDocumentAdapter adapter =
                            webView.createPrintDocumentAdapter("BoxTrack label");
                    printManager.print(
                            "BoxTrack label",
                            adapter,
                            new PrintAttributes.Builder()
                                    .setMediaSize(NIIMBOT_B1_PRO_50X30)
                                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                    .build()
                    );

                    Log.i(TAG, "[PRINT] Android print job submitted");
                    call.resolve();
                } catch (Exception exception) {
                    Log.e(TAG, "[PRINT] Android print failed on UI thread", exception);
                    reject(call, exception.getMessage() == null
                            ? "Unknown Android printing error"
                            : exception.getMessage(), exception);
                }
            });
        } catch (Exception exception) {
            Log.e(TAG, "[PRINT] Android print failed", exception);
            reject(call, exception.getMessage() == null
                    ? "Unknown Android printing error"
                    : exception.getMessage(), exception);
        }
    }

    private void reject(PluginCall call, String message) {
        Log.e(TAG, "[PRINT] " + message);
        call.reject(message);
    }

    private void reject(PluginCall call, String message, Exception exception) {
        Log.e(TAG, "[PRINT] " + message, exception);
        call.reject(message, exception);
    }
}
