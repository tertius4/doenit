package doenit.app;

import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/** Tasks typed into the quick add widget ({id, name}), waiting for the app to create them in the database. */
public class PendingTasks {
    public static synchronized JSONArray get() {
        try {
            String json = DB.getString(Const.WIDGET_PENDING_TASKS);
            return Utils.isEmpty(json) ? new JSONArray() : new JSONArray(json);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static synchronized void add(String name) {
        try {
            JSONArray tasks = get();
            tasks.put(new JSONObject().put("id", UUID.randomUUID().toString()).put("name", name));
            DB.saveData(Const.WIDGET_PENDING_TASKS, tasks.toString());
        } catch (Exception e) {
            // name and id are plain strings, so put() cannot fail
        }
    }

    public static synchronized void remove(JSONArray processed) {
        JSONArray remaining = new JSONArray();
        JSONArray tasks = get();

        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task == null) continue;

            boolean done = false;
            for (int j = 0; j < processed.length(); j++) {
                if (task.optString("id").equals(processed.optString(j))) done = true;
            }
            if (!done) remaining.put(task);
        }

        if (remaining.length() == 0) {
            DB.remove(Const.WIDGET_PENDING_TASKS);
        } else {
            DB.saveData(Const.WIDGET_PENDING_TASKS, remaining.toString());
        }
    }
}
