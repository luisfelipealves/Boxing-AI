package com.boxtrack.personal;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import android.webkit.WebView;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

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

            activity.runOnUiThread(() -> {
                try {
                    PrintAttributes attributes = new PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build();
                    PrintDocumentAdapter webAdapter =
                            webView.createPrintDocumentAdapter("BoxTrack label");
                    File pdfFile = new File(
                            activity.getCacheDir(),
                            "boxtrack-label-" + System.currentTimeMillis() + ".pdf"
                    );

                    Log.i(TAG, "[PRINT] generating PDF from current WebView");
                    webAdapter.onLayout(
                            null,
                            attributes,
                            new CancellationSignal(),
                            new PrintDocumentAdapter.LayoutResultCallback() {
                                @Override
                                public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                                    try {
                                        ParcelFileDescriptor descriptor = ParcelFileDescriptor.open(
                                                pdfFile,
                                                ParcelFileDescriptor.MODE_CREATE
                                                        | ParcelFileDescriptor.MODE_TRUNCATE
                                                        | ParcelFileDescriptor.MODE_READ_WRITE
                                        );
                                        webAdapter.onWrite(
                                                new android.print.PageRange[]{android.print.PageRange.ALL_PAGES},
                                                descriptor,
                                                new CancellationSignal(),
                                                new PrintDocumentAdapter.WriteResultCallback() {
                                                    @Override
                                                    public void onWriteFinished(android.print.PageRange[] pages) {
                                                        closeQuietly(descriptor);
                                                        sendPdfToPrintManager(
                                                                printManager,
                                                                pdfFile,
                                                                attributes,
                                                                call
                                                        );
                                                    }

                                                    @Override
                                                    public void onWriteFailed(CharSequence error) {
                                                        closeQuietly(descriptor);
                                                        failPrint(call, error == null
                                                                ? "Unable to generate label PDF"
                                                                : error.toString(), null);
                                                    }
                                                }
                                        );
                                    } catch (Exception exception) {
                                        failPrint(call, "Unable to create label PDF", exception);
                                    }
                                }

                                @Override
                                public void onLayoutFailed(CharSequence error) {
                                    failPrint(call, error == null
                                            ? "Unable to prepare label PDF"
                                            : error.toString(), null);
                                }
                            },
                            null
                    );
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

    private void sendPdfToPrintManager(
            PrintManager printManager,
            File pdfFile,
            PrintAttributes attributes,
            PluginCall call
    ) {
        try {
            Log.i(TAG, "[PRINT] sending generated PDF to Android print service");
            printManager.print(
                    "BoxTrack label",
                    new PdfPrintAdapter(pdfFile),
                    attributes
            );
            call.resolve();
        } catch (Exception exception) {
            failPrint(call, "Unable to start Android print service", exception);
        }
    }

    private void failPrint(PluginCall call, String message, Exception exception) {
        if (exception == null) {
            reject(call, message);
        } else {
            reject(call, message, exception);
        }
    }

    private static void closeQuietly(ParcelFileDescriptor descriptor) {
        try {
            descriptor.close();
        } catch (IOException ignored) {
            // The print operation has already completed or failed.
        }
    }

    private static class PdfPrintAdapter extends PrintDocumentAdapter {
        private final File pdfFile;

        PdfPrintAdapter(File pdfFile) {
            this.pdfFile = pdfFile;
        }

        @Override
        public void onLayout(
                PrintAttributes oldAttributes,
                PrintAttributes newAttributes,
                CancellationSignal cancellationSignal,
                LayoutResultCallback callback,
                Bundle extras
        ) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }

            callback.onLayoutFinished(
                    new PrintDocumentInfo.Builder(pdfFile.getName())
                            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                            .setPageCount(1)
                            .build(),
                    true
            );
        }

        @Override
        public void onWrite(
                android.print.PageRange[] pages,
                ParcelFileDescriptor destination,
                CancellationSignal cancellationSignal,
                WriteResultCallback callback
        ) {
            try (FileInputStream input = new FileInputStream(pdfFile);
                    ParcelFileDescriptor.AutoCloseOutputStream output =
                            new ParcelFileDescriptor.AutoCloseOutputStream(destination)) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while (!cancellationSignal.isCanceled()
                        && (bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                }

                if (cancellationSignal.isCanceled()) {
                    callback.onWriteCancelled();
                } else {
                    callback.onWriteFinished(new android.print.PageRange[]{android.print.PageRange.ALL_PAGES});
                }
            } catch (IOException exception) {
                callback.onWriteFailed(exception.getMessage());
            }
        }

        @Override
        public void onFinish() {
            if (!pdfFile.delete()) {
                Log.w(TAG, "[PRINT] unable to delete temporary PDF: " + pdfFile.getName());
            }
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
