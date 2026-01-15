package doenit.app;

import android.content.Intent;
import android.webkit.WebView;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.app.AlarmManager;
import android.app.PendingIntent;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class Utils {

    private static final String TAG = Const.LOG_TAG_DOENIT_UTILS;

    /**
     * Escapes a string for safe use in JavaScript by replacing single and double
     * quotes.
     * 
     * @param str The string to escape
     * @return The escaped string
     */
    public static String escapeForJavaScript(String str) {
        if (str == null) {
            return "";
        }

        return str.replace("'", "\\'").replace("\"", "\\\"");
    }

    /**
     * Cancels a notification using the taskId as the notification ID.
     * 
     * @param context The application context
     * @param taskId  The task ID used as notification ID
     */
    public static void cancelNotification(Context context, String taskId) {
        // TODO: I need to write my own LocalNotifications plugin that can be accessed
        // by the widget.

        // if (context == null || taskId == null) {
        // return;
        // }

        // int notificationId = taskId.hashCode();

        // // Cancel the notification
        // NotificationManager nm = (NotificationManager)
        // context.getSystemService(Context.NOTIFICATION_SERVICE);
        // nm.cancel(notificationId);

        // // Cancel the alarm
        // try {

        // Intent intent = new Intent(context,
        // Class.forName("com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin"));
        // intent.setAction("com.capacitorjs.plugins.localnotifications.NOTIFICATION_INTENT");
        // intent.putExtra("com.capacitorjs.plugins.localnotifications.NOTIFICATION_INTENT",
        // notificationId);

        // PendingIntent pendingIntent = PendingIntent.getBroadcast(context,
        // notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT |
        // PendingIntent.FLAG_IMMUTABLE);

        // AlarmManager alarmManager = (AlarmManager)
        // context.getSystemService(Context.ALARM_SERVICE);
        // alarmManager.cancel(pendingIntent);

        // Log.d(Const.LOG_TAG_DOENIT, "Cancelled alarm for notificationId: " +
        // notificationId);
        // } catch (Exception e) {
        // Log.e(Const.LOG_TAG_DOENIT, "Error canceling alarm", e);
        // }

        // Log.d(Const.LOG_TAG_DOENIT, "Cancelled notification for taskId HASH: " +
        // notificationId);
    }

    /**
     * Handles navigation to a specific route in the web app.
     * 
     * @param bridge The Capacitor bridge
     * @param route  The route to navigate to
     */
    public static void navigateToRoute(Bridge bridge, Intent intent) {
        if (bridge == null || intent == null) {
            return;
        }

        String route = intent.getStringExtra("route");
        if (route == null || route.isEmpty() || route.equals("null")) {
            return;
        }

        // URL encode the route to handle special characters
        String encodedRoute = Utils.escapeForJavaScript(route);

        WebView webView = bridge.getWebView();
        if (webView == null) {
            Log.w(Const.LOG_TAG_DOENIT, "WebView is null, cannot navigate to route");
            return;
        }

        Log.d(Const.LOG_TAG_DOENIT, "Navigating to route: " + encodedRoute);
        webView.post(() -> {
            try {
                webView.evaluateJavascript(
                        "if (window.location && window.location.pathname !== '" + encodedRoute + "') { " +
                                "  window.location.pathname = '" + encodedRoute + "'; " +
                                "}",
                        null);
            } catch (Exception e) {
                Log.e(Const.LOG_TAG_DOENIT, "Error navigating to route: " + encodedRoute, e);
            }
        });
    }

    public static void saveData(Context context, String name, String data) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(Const.DB_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(name, data);
            editor.apply();
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT_UTILS, "Error saving data", e);
        }
    }

    public static String getData(Context context, String name) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(Const.DB_NAME, Context.MODE_PRIVATE);
            return prefs.getString(name, null);
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT_UTILS, "Error getting data", e);
            return null;
        }
    }

    public static void clearData(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(Const.DB_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
    }

    public static boolean isEmpty(String value) {
        return value == null || value.trim().isEmpty() || value.equals("null");
    }

    /**
     * Hashes a string using SHA-256 and returns the first 64 characters.
     * Used for obfuscating account IDs in Google Play billing.
     * 
     * @param input The string to hash
     * @return The hashed string truncated to 64 characters, or null if hashing
     *         fails
     */
    public static String hashAccountId(String input) {
        if (Utils.isEmpty(input)) {
            return null;
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            StringBuilder hexString = new StringBuilder();

            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            // Truncate to 64 characters (Google's max for obfuscatedAccountId)
            return hexString.substring(0, Math.min(64, hexString.length()));
        } catch (NoSuchAlgorithmException e) {
            Log.e(TAG, "Failed to hash account ID", e);
            return null;
        }
    }
}
