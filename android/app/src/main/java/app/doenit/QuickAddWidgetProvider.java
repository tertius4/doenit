package doenit.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** A widget that looks like a Doenit text input; tapping it opens {@link QuickAddActivity}. */
public class QuickAddWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        DB.init(context);
        for (int id : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quick_add_widget);

        views.setInt(R.id.quick_add_container, "setBackgroundResource", Drawable.quickAddContainer());
        views.setInt(R.id.quick_add_root, "setBackgroundResource", Drawable.input());
        views.setTextViewText(R.id.quick_add_hint, QuickAddActivity.getHint());
        views.setTextColor(R.id.quick_add_hint, context.getResources().getColor(Colors.get("text-normal")));
        views.setInt(R.id.quick_add_icon, "setBackgroundResource", Drawable.addButton());
        views.setImageViewResource(R.id.quick_add_icon, Drawable.iconAdd());

        Intent intent = new Intent(context, QuickAddActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quick_add_container, pendingIntent);
        views.setOnClickPendingIntent(R.id.quick_add_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.quick_add_icon, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /** Re-renders every instance, e.g. after a theme or language change. */
    static void refreshAll(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, QuickAddWidgetProvider.class);

        for (int id : appWidgetManager.getAppWidgetIds(cn)) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }
}
