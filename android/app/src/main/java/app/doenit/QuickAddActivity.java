package doenit.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;

/** Small native dialog with one text field. The typed task is queued for the app to create on its next start. */
public class QuickAddActivity extends Activity {
    static String getHint() {
        return "en".equals(DB.getString("language", "af")) ? "New task..." : "Nuwe taak...";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        DB.init(getApplicationContext());

        setContentView(R.layout.activity_quick_add);
        getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);

        EditText input = findViewById(R.id.quick_add_input);
        input.setBackgroundResource(Drawable.input());
        input.setHint(getHint());
        input.setTextColor(getResources().getColor(Colors.get("text-strong")));
        input.setHintTextColor(getResources().getColor(Colors.get("text-normal")));

        input.requestFocus();
        input.post(() -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            imm.showSoftInput(input, InputMethodManager.SHOW_IMPLICIT);
        });

        input.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId != EditorInfo.IME_ACTION_DONE) return false;

            String name = input.getText().toString().trim();
            if (!name.isEmpty()) PendingTasks.add(name);
            finish();
            return true;
        });
    }
}
