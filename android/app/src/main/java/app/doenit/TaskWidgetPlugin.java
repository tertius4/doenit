package doenit.app;

import android.appwidget.AppWidgetManager;
import android.content.SharedPreferences;
import android.content.ComponentName;
import android.content.Context;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;
import org.json.JSONArray;

@CapacitorPlugin(name = "TaskWidget")
public class TaskWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateTasks(PluginCall call) {
        try {
            Context context = getContext();

            // Tasks
            JSONArray tasks = call.getArray("tasks");
            if (tasks == null) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("message", "Tasks data is null or empty");
                call.resolve(ret);
                return;
            }

            // Categories
            JSONArray categories = call.getArray("categories");
            JSONObject category_hash = new JSONObject();
            int categoriesCount = categories != null ? categories.length() : 0;
            if (categoriesCount > 0) {
                for (int i = 0; i < categories.length(); i++) {
                    JSONObject category = categories.getJSONObject(i);
                    String category_id = category.optString("id");
                    if (!Utils.isEmpty(category_id)) {
                        category_hash.put(category_id, category);
                    }
                }
            }

            Log.d(Const.LOG_TAG_DOENIT, "Tasks count: " + tasks.length());
            Log.d(Const.LOG_TAG_DOENIT, "Categories count: " + categoriesCount);
            TaskWidgetProvider.updateTasksData(context, tasks.toString(), category_hash.toString());

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Widget updated successfully");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPendingCompletions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ids", PendingCompletions.get());
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingCompletions(PluginCall call) {
        try {
            PendingCompletions.remove(call.getArray("ids", new JSArray()));
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to clear pending completions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateLanguage(PluginCall call) {
        try {
            String language = call.getString("language");
            if (Utils.isEmpty(language)) {
                call.reject("Missing 'language' parameter");
                return;
            }

            Context context = getContext();

            // Delegate to the widget provider which will persist and refresh widgets
            TaskWidgetProvider.updateLanguage(context, language);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("language", language);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget language: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateTheme(PluginCall call) {
        try {
            String theme = call.getString("theme");
            if (Utils.isEmpty(theme)) {
                call.reject("Missing 'theme' parameter");
                return;
            }

            Context context = getContext();

            // Delegate to the widget provider which will persist and refresh widgets
            TaskWidgetProvider.updateTheme(context, theme);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("theme", theme);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget theme: " + e.getMessage());
        }
    }
}