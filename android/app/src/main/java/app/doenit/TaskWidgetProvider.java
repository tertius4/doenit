package doenit.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.content.res.Resources;
import android.util.Log;
import android.net.Uri;

import doenit.app.R;

import java.util.Set;
import java.util.Locale;
import java.util.Date;
import java.util.Calendar;

import java.text.SimpleDateFormat;
import java.text.ParseException;

import org.json.JSONObject;
import org.json.JSONException;
import org.json.JSONArray;

public class TaskWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_ADD_TASK = Const.ACTION_ADD_TASK;
    public static final String ACTION_COMPLETE_TASK = Const.ACTION_COMPLETE_TASK;
    public static final String ACTION_OPEN_TASK = Const.ACTION_OPEN_TASK;
    public static final String EXTRA_TASK_ID = Const.EXTRA_TASK_ID;

    public static void updateTasksData(Context context, String tasksJson, String categoriesStr) {
        try {
            DB.saveData(Const.WIDGET_TASKS, tasksJson);
            DB.saveData(Const.WIDGET_CATEGORIES, categoriesStr);
    
            // Update all widgets
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, TaskWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(cn);
    
            Log.d(Const.LOG_TAG_DOENIT_UPDATE, "Found " + appWidgetIds.length + " widget instances");
    
            for (int i = 0; i < appWidgetIds.length; i++) {
                updateAppWidget(context, appWidgetManager, appWidgetIds[i]);
            }
    
            // Notify that the data has changed so ListView refreshes
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);
            Log.d(Const.LOG_TAG_DOENIT_UPDATE, "Notified " + appWidgetIds.length + " widgets of data change");
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT, "Error updating widget tasks data", e);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        DB.init(context);
        for (int i = 0; i < appWidgetIds.length; i++) {
            updateAppWidget(context, appWidgetManager, appWidgetIds[i]);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        DB.init(context);

        String action = intent.getAction();
        Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "onReceive called with action: " + action);
        Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Intent extras: " + intent.getExtras());

        if (ACTION_ADD_TASK.equals(action)) {
            try {
                Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Handling ADD_TASK action");
                // Open CreateTaskActivity for fastest startup
                Intent appIntent = new Intent(context, CreateTaskActivity.class);
                appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                context.startActivity(appIntent);
            } catch (Exception e) {
                Log.e(Const.LOG_TAG_TASK_WIDGET, "Failed to start CreateTaskActivity", e);
            }
        } else if (ACTION_COMPLETE_TASK.equals(action)) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Handling COMPLETE_TASK action for taskId: " + taskId);

            if (taskId != null) {
                completeTask(context, taskId);
                refreshAll(context);
            } else {
                Log.e(Const.LOG_TAG_TASK_WIDGET, "COMPLETE_TASK action received but no task ID found");
            }
        } else if (ACTION_OPEN_TASK.equals(action)) {
            try {
                String taskId = intent.getStringExtra(EXTRA_TASK_ID);
                Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Handling OPEN_TASK action for taskId: " + taskId);

                if (taskId != null) {
                    // Open the app to view/edit the task
                    Intent appIntent = new Intent(context, MainActivity.class);
                    appIntent.putExtra("route", "/" + taskId);
                    appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    context.startActivity(appIntent);
                    Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Started MainActivity to view task: " + taskId);
                }
            } catch (Exception e) {
                Log.e(Const.LOG_TAG_TASK_WIDGET, "Failed to start MainActivity", e);
            }
        } else {
            // Found unhandled action: android.appwidget.action.APPWIDGET_UPDATE
            Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Unhandled action: " + action);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "[updateAppWidget] " + appWidgetId);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_widget);
        setWidgetColors(context, views);

        // Set up the list view
        Intent serviceIntent = new Intent(context, TaskWidgetService.class);
        views.setRemoteAdapter(R.id.widget_list_view, serviceIntent);

        // Set up PendingIntent template for COMPLETE_TASK actions
        Intent completeTemplateIntent = new Intent(context, TaskWidgetProvider.class);
        PendingIntent completeTemplatePendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                completeTemplateIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        views.setPendingIntentTemplate(R.id.widget_list_view, completeTemplatePendingIntent);

        // Set up empty view
        views.setEmptyView(R.id.widget_list_view, R.id.empty_view);

        String empty_text = TaskUtil.getListIsEmptyString();
        views.setTextViewText(R.id.empty_view, empty_text);

        // Set up add task button
        Intent addTaskIntent = new Intent(context, TaskWidgetProvider.class);
        addTaskIntent.setAction(ACTION_ADD_TASK);
        PendingIntent addTaskPendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId + 1000,
                addTaskIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.add_button, addTaskPendingIntent);

        // Set up click action for app name/logo to open main app
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent mainAppPendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId + 2000,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        views.setOnClickPendingIntent(R.id.app_name, mainAppPendingIntent);
        views.setOnClickPendingIntent(R.id.app_logo, mainAppPendingIntent);

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);

        Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Updated widget " + appWidgetId + " with PendingIntent template");
    }

    static void setWidgetColors(Context context, RemoteViews views) {
        Resources resources = context.getResources();

        views.setImageViewResource(R.id.widget_background, Drawable.mainContainer());
        views.setInt(R.id.widget_header, "setBackgroundResource", Drawable.headerContainer());

        int app_name_text_res_id = Colors.get("text-strong");
        int app_name_text_color = resources.getColor(app_name_text_res_id);
        views.setTextColor(R.id.app_name, app_name_text_color);

        views.setInt(R.id.add_button, "setBackgroundResource", Drawable.addButton());
        views.setImageViewResource(R.id.add_button, Drawable.iconAdd());

        int empty_view_text_res_id = Colors.get("text-normal");
        int empty_view_text_color = resources.getColor(empty_view_text_res_id);
        views.setInt(R.id.empty_view, "setTextColor", empty_view_text_color);
    }

    /**
     * Update language for widgets. Saves new language to SharedPreferences and
     * triggers an update for all widget instances so they re-read the language.
     * Call this from the app when the user changes language.
     */
    public static void updateLanguage(Context context, String language) {
        try {
            DB.saveData("language", language);

            // Trigger immediate update for all widgets
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, TaskWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(cn);

            Log.d(Const.LOG_TAG_DOENIT_SIMPLE,
                    "updateLanguage: updating " + appWidgetIds.length + " widget(s) to language=" + language);

            // Update each widget (this will call updateAppWidget)
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }

            // Notify ListView to refresh
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);

            // Also send a standard broadcast update (helps some launchers)
            Intent intent = new Intent(context, TaskWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
            context.sendBroadcast(intent);
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT, "Error updating widget language", e);
        }
    }

    public static void updateTheme(Context context, String theme) {
        try {
            DB.saveData("theme", theme);

            // Trigger immediate update for all widgets
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, TaskWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(cn);

            Log.d(Const.LOG_TAG_DOENIT_SIMPLE,
                    "updateTheme: updating " + appWidgetIds.length + " widget(s) to theme=" + theme);

            // Update each widget (this will call updateAppWidget)
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }

            // Notify ListView to refresh
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);

            // Also send a standard broadcast update (helps some launchers)
            Intent intent = new Intent(context, TaskWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
            context.sendBroadcast(intent);
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT, "Error updating widget theme", e);
        }
    }

    /**
     * Completes a task without opening the app: queues it for the app to apply,
     * hides it from the widget and cancels its reminder.
     */
    public static void completeTask(Context context, String taskId) {
        try {
            PendingCompletions.add(taskId);
            Utils.cancelNotification(context, taskId);
            removeFromWidgetTasks(taskId);
        } catch (Exception e) {
            Log.e(Const.LOG_TAG_DOENIT, "Error completing task", e);
        }
    }

    private static boolean removeFromWidgetTasks(String taskId) throws JSONException {
        String json = DB.getString(Const.WIDGET_TASKS);
        if (Utils.isEmpty(json)) return false;

        JSONArray tasks = new JSONArray(json);
        JSONArray remaining = new JSONArray();
        boolean found = false;

        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.getJSONObject(i);
            if (taskId.equals(task.optString("id"))) {
                found = true;
            } else {
                remaining.put(task);
            }
        }

        if (found) DB.saveData(Const.WIDGET_TASKS, remaining.toString());
        return found;
    }

    /** Re-renders every widget instance and reloads its list. */
    static void refreshAll(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, TaskWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(cn);

        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }

        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);
    }
}
