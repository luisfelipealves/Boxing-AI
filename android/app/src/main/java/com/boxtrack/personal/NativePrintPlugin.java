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

            Log.i(TAG, "[PRINT] creating print adapter from current WebView");
            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("BoxTrack label");
            printManager.print(
                    "BoxTrack label",
                    adapter,
                    new PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build()
            );

            Log.i(TAG, "[PRINT] Android print job submitted");
            call.resolve();
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
