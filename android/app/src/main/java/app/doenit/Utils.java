package doenit.app;

import android.content.Intent;
import android.os.Build;
import android.webkit.WebView;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.app.AlarmManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher;
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
     * Cancels the scheduled and any visible "task_<id>" reminder, mirroring the
     * local-notifications plugin's own cancel. The id must match hash() in
     * schedule-builder.ts.
     */
    public static void cancelNotification(Context context, String taskId) {
        if (context == null || isEmpty(taskId)) {
            return;
        }

        try {
            int notificationId = notificationIdForTask(taskId);

            // Must match LocalNotificationManager.cancelTimerForNotification in the plugin.
            int flags = PendingIntent.FLAG_NO_CREATE;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            Intent intent = new Intent(context, TimedNotificationPublisher.class);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, flags);
            if (pendingIntent != null) {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }

            NotificationManagerCompat.from(context).cancel(notificationId);

            // The plugin restores scheduled notifications from here (NOTIFICATION_STORE_ID) after a reboot.
            context.getSharedPreferences("NOTIFICATION_STORE", Context.MODE_PRIVATE)
                    .edit().remove(Integer.toString(notificationId)).apply();

            Log.d(Const.LOG_TAG_DOENIT, "Cancelled reminder " + notificationId + " for task " + taskId + " (alarm found: "
                    + (pendingIntent != null) + ")");
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT, "Error cancelling reminder", e);
        }
    }

    /** Port of hash("task_" + id) in schedule-builder.ts. */
    static int notificationIdForTask(String taskId) {
        long id = Integer.toUnsignedLong(("task_" + taskId).hashCode()) % 2147483646L;
        return id == 0 ? 1 : (int) id;
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
