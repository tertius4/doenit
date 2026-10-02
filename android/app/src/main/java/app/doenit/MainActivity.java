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
import com.getcapacitor.Plugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.GoogleProvider;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

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
    }

    @Override
    public void onResume() {
        Log.d(Const.LOG_TAG_DOENIT, "MainActivity onResume called");
        super.onResume();

        // Wait for WebView to be ready before performing operations
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.post(() -> {
                    // Handle intent navigation
                    Intent intent = getIntent();
                    Utils.navigateToRoute(bridge, intent);
                });
            }
        }
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

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required by ModifiedMainActivityForSocialLoginPlugin to enable scopes support
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (
            requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN &&
            requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX
        ) {
            Bridge bridge = getBridge();
            if (bridge != null) {
                Plugin plugin = bridge.getPlugin("SocialLogin").getInstance();
                if (plugin instanceof SocialLoginPlugin) {
                    ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
                }
            }
        }
    }
}
