package doenit.app;

import android.os.Bundle;
import android.content.Intent;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class CreateTaskActivity extends BridgeActivity {

    /**
     * Called when the activity is first created.
     * This activity is optimized for fast startup when creating a new task.
     * It skips non-essential initialization to provide the quickest path to the /create route.
     *
     * @param savedInstanceState If the activity is being re-initialized after
     *                           previously being shut down,
     *                           this Bundle contains the data it most recently
     *                           supplied in onSaveInstanceState.
     *                           Will be null if this is the activity's first
     *                           creation.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(Const.LOG_TAG_DOENIT, "CreateTaskActivity onCreate called");

        // Register only the essential plugins
        registerPlugin(TaskWidgetPlugin.class);

        super.onCreate(savedInstanceState);

        // Initialize DB lazily - very lightweight operation
        DB.init(getApplicationContext());

        // Navigate directly to /create route
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                Log.d(Const.LOG_TAG_DOENIT, "Navigating to /create route");
                webView.post(() -> {
                    try {
                        webView.evaluateJavascript(
                                "if (window.location && window.location.pathname !== '/create') { " +
                                        "  window.location.pathname = '/create'; " +
                                        "}",
                                null);
                    } catch (Exception e) {
                        Log.e(Const.LOG_TAG_DOENIT, "Error navigating to /create route", e);
                    }
                });
            } else {
                Log.w(Const.LOG_TAG_DOENIT, "WebView is null, cannot navigate to /create");
            }
        }
    }

    /**
     * Called when the activity is already running and receives a new intent.
     * Simply navigates to the /create route.
     *
     * @param intent The new intent that was delivered to the activity.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        // Always navigate to /create
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.post(() -> {
                    try {
                        webView.evaluateJavascript(
                                "if (window.location && window.location.pathname !== '/create') { " +
                                        "  window.location.pathname = '/create'; " +
                                        "}",
                                null);
                    } catch (Exception e) {
                        Log.e(Const.LOG_TAG_DOENIT, "Error navigating to /create route in onNewIntent", e);
                    }
                });
            } else {
                Log.w(Const.LOG_TAG_DOENIT, "WebView is null in onNewIntent, cannot navigate to /create");
            }
        }
    }
}
