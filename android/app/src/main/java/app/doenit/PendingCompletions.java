package doenit.app;

import org.json.JSONArray;

/** Task ids completed from the widget, waiting for the app to apply them to the database. */
public class PendingCompletions {
    public static synchronized JSONArray get() {
        try {
            String json = DB.getString(Const.WIDGET_PENDING_COMPLETIONS);
            return Utils.isEmpty(json) ? new JSONArray() : new JSONArray(json);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static synchronized void add(String taskId) {
        JSONArray ids = get();
        for (int i = 0; i < ids.length(); i++) {
            if (taskId.equals(ids.optString(i))) return;
        }

        ids.put(taskId);
        DB.saveData(Const.WIDGET_PENDING_COMPLETIONS, ids.toString());
    }

    public static synchronized void remove(JSONArray processed) {
        JSONArray remaining = new JSONArray();
        JSONArray ids = get();

        for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i);
            boolean done = false;
            for (int j = 0; j < processed.length(); j++) {
                if (id.equals(processed.optString(j))) done = true;
            }
            if (!done) remaining.put(id);
        }

        if (remaining.length() == 0) {
            DB.remove(Const.WIDGET_PENDING_COMPLETIONS);
        } else {
            DB.saveData(Const.WIDGET_PENDING_COMPLETIONS, remaining.toString());
        }
    }
}
