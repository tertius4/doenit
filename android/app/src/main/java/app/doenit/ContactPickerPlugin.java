package doenit.app;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract.CommonDataKinds.Email;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens the system contact picker for one e-mail address. The picker grants read access to just the picked row,
 * so no contacts permission is needed. Resolves { name, email }, or {} when the user backs out.
 */
@CapacitorPlugin(name = "ContactPicker")
public class ContactPickerPlugin extends Plugin {

    @PluginMethod
    public void pickEmail(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_PICK).setType(Email.CONTENT_TYPE);
        startActivityForResult(call, intent, "pickEmailResult");
    }

    @ActivityCallback
    private void pickEmailResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject value = new JSObject();
        Uri uri = result.getData() != null ? result.getData().getData() : null;
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.resolve(value);
            return;
        }

        String[] projection = { Email.DISPLAY_NAME, Email.ADDRESS };
        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                value.put("name", cursor.getString(0));
                value.put("email", cursor.getString(1));
            }
            call.resolve(value);
        } catch (Exception e) {
            call.reject("Could not read the picked contact", e);
        }
    }
}
