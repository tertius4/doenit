package doenit.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.util.Log;

import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.text.ParseException;

import java.util.Locale;
import java.util.Date;
import java.util.Calendar;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import doenit.app.R;

public class TaskWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "TaskWidgetService.onGetViewFactory called");
        return new TaskRemoteViewsFactory(this.getApplicationContext(), intent);
    }

    class TaskRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {
        private Context context;
        private List<Task> tasks;

        TaskRemoteViewsFactory(Context context, Intent intent) {
            this.context = context;
            this.tasks = new ArrayList<>();
            Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "TaskRemoteViewsFactory created");
        }

        @Override
        public void onCreate() {
            Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "TaskRemoteViewsFactory.onCreate called");
            DB.init(context);
            loadTasks();
        }

        @Override
        public void onDataSetChanged() {
            try {
                Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "onDataSetChanged called - refreshing widget data");
                loadTasks();
            } catch (Exception e) {
                Log.e(Const.LOG_TAG_DOENIT_WIDGET, "Error refreshing widget data", e);
            }
        }

        @Override
        public void onDestroy() {
            tasks.clear();
        }

        @Override
        public int getCount() {
            return Math.min(tasks.size(), 20); // Limit to 20 tasks for widget
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position >= tasks.size()) {
                return null;
            }

            Task task = tasks.get(position);
            Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Creating view for task: " + task.name + " (ID: " + task.id + ")");

            RemoteViews views = new RemoteViews(this.context.getPackageName(), R.layout.task_widget_item);

            // Determine task state
            boolean isPast = isDatePast(task.startDate);
            boolean isOngoing = isTaskOngoing(task.startDate, task.dueDate);

            // Set task name
            views.setTextViewText(R.id.task_name, task.name);
            int text_name_color = Colors.get((isOngoing || isPast) ? "text-alt" : "text-normal");
            int app_name_text_color = context.getResources().getColor(text_name_color);
            views.setTextColor(R.id.task_name, app_name_text_color);

            // Set background based on task state
            int backgroundColor = Drawable.taskDefault();
            if (isOngoing)
                backgroundColor = Drawable.taskOngoing();
            else if (isPast)
                backgroundColor = Drawable.taskPast();
            views.setInt(R.id.task_container, "setBackgroundResource", backgroundColor);
            views.setImageViewResource(R.id.icon_checkbox, Drawable.iconCheckbox());

            // Handle due date display with icon

            // Show date pill if either startDate or dueDate is present
            String date = TaskUtil.getDate(task);
            if (!Utils.isEmpty(date)) {
                views.setViewVisibility(R.id.date_pill, View.VISIBLE);
                views.setViewVisibility(R.id.pills_container, View.VISIBLE);
                views.setTextViewText(R.id.pill_date, date);

                int color = Colors.get((isOngoing || isPast) ? "text-alt" : "text-normal");
                int dueDateTextColor = context.getResources().getColor(color);
                views.setTextColor(R.id.pill_date, dueDateTextColor);
                int clockIconRes = Drawable.iconClockNormal();
                if (isOngoing || isPast) {
                    clockIconRes = Drawable.iconClockAlt();
                }
                views.setImageViewResource(R.id.icon_clock, clockIconRes);

                // Set pill background based on state
                int pill = Drawable.pillDefault();
                if (isOngoing) {
                    pill = Drawable.pillOngoing();
                } else if (isPast) {
                    pill = Drawable.pillPast();
                }
                views.setInt(R.id.date_pill, "setBackgroundResource", pill);

                // Show repeat icon if task is repeating
                views.setViewVisibility(R.id.repeat_icon, task.is_repeating ? View.VISIBLE : View.GONE);
                if (task.is_repeating) {
                    int repeatIconRes = Drawable.iconSyncNormal();
                    if (isOngoing || isPast) {
                        repeatIconRes = Drawable.iconSyncAlt();
                    }
                    views.setImageViewResource(R.id.repeat_icon, repeatIconRes);
                }
            } else {
                views.setViewVisibility(R.id.date_pill, View.GONE);
            }

            // Handle category display with icon
            if (!Utils.isEmpty(task.category)) {
                views.setViewVisibility(R.id.category_container, View.VISIBLE);
                views.setViewVisibility(R.id.pills_container, View.VISIBLE);
                views.setTextViewText(R.id.pill_category, task.category);

                int color = Colors.get((isOngoing || isPast) ? "text-alt" : "text-normal");
                int categoryTextColor = context.getResources().getColor(color);

                views.setTextColor(R.id.pill_category, categoryTextColor);
                int categoryIconRes = Drawable.iconCategoryNormal();
                if (isOngoing || isPast) {
                    categoryIconRes = Drawable.iconCategoryAlt();
                }
                views.setImageViewResource(R.id.icon_category, categoryIconRes);

                // Set pill background based on state
                int pill = Drawable.pillDefault();
                if (isOngoing) {
                    pill = Drawable.pillOngoing();
                } else if (isPast) {
                    pill = Drawable.pillPast();
                }
                views.setInt(R.id.category_container, "setBackgroundResource", pill);
            } else {
                views.setViewVisibility(R.id.category_container, View.GONE);
            }

            // Hide pills container if both date and category are hidden
            if (Utils.isEmpty(date) && Utils.isEmpty(task.category)) {
                views.setViewVisibility(R.id.pills_container, View.GONE);
            }

            // Set priority indicators
            views.setImageViewResource(R.id.important_icon, Drawable.iconImportant());
            views.setViewVisibility(R.id.important_icon, task.important ? View.VISIBLE : View.GONE);

            // Set up fill-in intent for COMPLETE_TASK (complete_button)
            Intent completeIntent = new Intent();
            completeIntent.setAction(TaskWidgetProvider.ACTION_COMPLETE_TASK);
            completeIntent.putExtra(TaskWidgetProvider.EXTRA_TASK_ID, task.id);
            views.setOnClickFillInIntent(R.id.complete_button, completeIntent);

            // Set up fill-in intent for OPEN_TASK (task_item_layout)
            Intent openIntent = new Intent();
            openIntent.setAction(TaskWidgetProvider.ACTION_OPEN_TASK);
            openIntent.putExtra(TaskWidgetProvider.EXTRA_TASK_ID, task.id);
            views.setOnClickFillInIntent(R.id.task_item_layout, openIntent);

            return views;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        private void loadTasks() {
            tasks.clear();
            Log.d(Const.LOG_TAG_DOENIT_SIMPLE, "Loading tasks from widget data");

            String tasksJson = DB.getString(Const.WIDGET_TASKS);
            String categoriesJson = DB.getString(Const.WIDGET_CATEGORIES);

            if (Utils.isEmpty(tasksJson)) {
                return;
            }

            // Parse categories for name lookup
            try {
                JSONObject categories = Utils.isEmpty(categoriesJson) ? new JSONObject() : new JSONObject(categoriesJson);
                JSONArray tasksArray = new JSONArray(tasksJson);

                for (int i = 0; i < tasksArray.length(); i++) {
                    JSONObject taskJson = tasksArray.getJSONObject(i);

                    Task task = new Task();
                    task.id = taskJson.optString("id", "");
                    task.name = taskJson.optString("name", "");
                    task.dueDate = toDisplayDate(taskJson.optString("due_date", ""));
                    task.startDate = toDisplayDate(taskJson.optString("start_date", ""));

                    // Get category name from category ID
                    String category_id = taskJson.optString("category_id", "");
                    task.category = getCategoryName(category_id, categories);
                    task.important = taskJson.optBoolean("important", false);
                    task.is_repeating = !taskJson.optString("repeat_interval", "").isEmpty();

                    tasks.add(task);
                }

                Log.d(Const.LOG_TAG_DOENIT_WIDGET, "Found " + tasksArray.length() + " total tasks, loaded "
                        + tasks.size() + " active tasks for widget");
            } catch (JSONException e) {
                Log.e(Const.LOG_TAG_DOENIT_WIDGET, "Error parsing JSON", e);
                e.printStackTrace();
            }
        }

        private String getCategoryName(String category_id, JSONObject categories) {
            // Get category name from category ID
            if (!category_id.isEmpty() && categories.has(category_id)) {
                try {
                    JSONObject category = categories.getJSONObject(category_id);
                    return category.optString("name", "");
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            return "";
        }

        private String toDisplayDate(String dateString) {
            if (Utils.isEmpty(dateString)) {
                return "";
            }

            // Get user preferred language
            Locale locale = new Locale("af", "ZA");
            String language = DB.getString("language", "af");
            if ("en".equals(language)) {
                locale = Locale.ENGLISH;
            }

            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH);
                Date date = inputFormat.parse(dateString);

                SimpleDateFormat outputFormat = new SimpleDateFormat("d MMM yyyy", locale);
                return outputFormat.format(date);
            } catch (ParseException e) {
                return dateString; // Return original string if parsing fails
            }
        }

        private boolean isDatePast(String startDateStr) {
            if (startDateStr == null || startDateStr.isEmpty()) {
                return false;
            }

            try {
                // Parse ISO date format (yyyy-MM-dd)
                SimpleDateFormat inputFormat = new SimpleDateFormat("d MMM yyyy", new Locale("af", "ZA"));
                Date startDate = inputFormat.parse(startDateStr);

                // Get today's date at midnight for comparison
                Calendar today = Calendar.getInstance();
                today.set(Calendar.HOUR_OF_DAY, 0);
                today.set(Calendar.MINUTE, 0);
                today.set(Calendar.SECOND, 0);
                today.set(Calendar.MILLISECOND, 0);

                return startDate != null && startDate.before(today.getTime());
            } catch (ParseException e) {
                return false; // If we can't parse the date, assume it's not past
            }
        }

        private boolean isTaskOngoing(String startDateStr, String dueDateFormatted) {
            if (startDateStr == null || startDateStr.isEmpty()) {
                return false;
            }

            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("d MMM yyyy", new Locale("af", "ZA"));
                Date startDate = inputFormat.parse(startDateStr);

                // Get today's date at midnight
                Calendar today = Calendar.getInstance();
                today.set(Calendar.HOUR_OF_DAY, 0);
                today.set(Calendar.MINUTE, 0);
                today.set(Calendar.SECOND, 0);
                today.set(Calendar.MILLISECOND, 0);
                Date todayDate = today.getTime();

                if (startDate == null) {
                    return false;
                }

                // If there's a due date, check if today is between start and due
                if (dueDateFormatted != null && !dueDateFormatted.isEmpty()) {
                    SimpleDateFormat outputFormat = new SimpleDateFormat("d MMM yyyy", new Locale("af", "ZA"));
                    Date dueDate = outputFormat.parse(dueDateFormatted);

                    if (dueDate != null) {
                        return !todayDate.before(startDate) && !todayDate.after(dueDate);
                    }
                }

                // If no due date, check if today equals start date
                Calendar startCal = Calendar.getInstance();
                startCal.setTime(startDate);
                startCal.set(Calendar.HOUR_OF_DAY, 0);
                startCal.set(Calendar.MINUTE, 0);
                startCal.set(Calendar.SECOND, 0);
                startCal.set(Calendar.MILLISECOND, 0);

                return todayDate.equals(startCal.getTime()) && !todayDate.after(startDate);
            } catch (ParseException e) {
                return false;
            }
        }

        private int compareDueDates(String dateA, String dateB) {
            boolean aHasDate = dateA != null && !dateA.isEmpty();
            boolean bHasDate = dateB != null && !dateB.isEmpty();

            // Tasks with due dates come before tasks without due dates
            if (aHasDate && !bHasDate)
                return -1;
            if (!aHasDate && bHasDate)
                return 1;
            if (!aHasDate && !bHasDate)
                return 0;

            // Both have due dates - compare them
            try {
                SimpleDateFormat outputFormat = new SimpleDateFormat("d MMM yyyy", new Locale("af", "ZA"));
                Date parsedDateA = outputFormat.parse(dateA);
                Date parsedDateB = outputFormat.parse(dateB);
                return parsedDateA.compareTo(parsedDateB);
            } catch (ParseException e) {
                return dateA.compareTo(dateB); // Fallback to string comparison
            }
        }
    }
}
