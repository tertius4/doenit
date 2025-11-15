package doenit.app;

import android.os.Bundle;
import android.content.Intent;
import android.content.BroadcastReceiver;
import android.content.SharedPreferences;
import android.content.IntentFilter;
import android.content.Context;
import android.util.Log;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Set;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {

    /**
     * Called when the activity is first created (the app is opened).
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
        Log.d(Const.LOG_TAG_DOENIT, "MainActivity onCreate called");

        // Register plugins
        registerPlugin(TaskWidgetPlugin.class);
        registerPlugin(BillingPlugin.class);

        super.onCreate(savedInstanceState);

        // Initialize DB lazily only when needed
        DB.init(getApplicationContext());

        // Handle intent
        Intent intent = getIntent();
        Bridge bridge = getBridge();

        Utils.navigateToRoute(bridge, intent);

        // Skip pending task updates check if we're going to /create
        String route = intent.getStringExtra("route");
        if (route == null || !route.equals("/create")) {
            // Check for pending task updates from SharedPreferences
            checkForPendingTaskUpdates();
        }
    }

    @Override
    public void onResume() {
        Log.d(Const.LOG_TAG_DOENIT, "MainActivity onResume called");
        super.onResume();

        // Handle intent
        Intent intent = getIntent();
        Bridge bridge = getBridge();

        Utils.navigateToRoute(bridge, intent);

        // Check for pending task updates from SharedPreferences
        checkForPendingTaskUpdates();
    }

    /**
     * Called when the activity is already running and receives a new intent.
     * This method updates the current intent and processes any route information
     * contained in the new intent to navigate to the appropriate route.
     *
     * @param intent The new intent that was delivered to the activity.
     *               May contain route information as an extra with key "route".
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        Bridge bridge = getBridge();
        Utils.navigateToRoute(bridge, intent);
    }

    private void checkForPendingTaskUpdates() {
        try {
            String taskIds = DB.getString(Const.TASK_ID);
            if (taskIds == null) {
                Log.d(Const.LOG_TAG_DOENIT, "No completed task found");
                return;
            }

            Bridge bridge = getBridge();
            if (bridge == null) {
                Log.w(Const.LOG_TAG_DOENIT, "Bridge is null, cannot forward task completion");
                return;
            }

            WebView webView = bridge.getWebView();
            if (webView == null) {
                return;
            }

            Log.d(Const.LOG_TAG_DOENIT, "Found pending task update for taskIds: " + taskIds);
            String js = String.format(
                "window.location.href = '/?completed_task_ids=%s';",
                taskIds
            );

            webView.post(() -> {
                webView.evaluateJavascript(js, null);
            });

            DB.clearData();
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT, "Error checking for pending task updates", e);
        }
    }
}
