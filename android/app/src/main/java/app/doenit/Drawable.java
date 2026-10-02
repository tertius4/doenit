package doenit.app;

import doenit.app.R.drawable;

public class Drawable {
    public static int iconSyncNormal() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");
        return is_light ? drawable.ic_sync_light_normal : drawable.ic_sync_dark_normal;
    }

    public static int iconSyncAlt() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");
        return is_light ? drawable.ic_sync_light_alt : drawable.ic_sync_dark_alt;
    }

    public static int mainContainer() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.container_main_light : drawable.container_main_dark;
    }

    public static int headerContainer() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.container_header_light : drawable.container_header_dark;
    }

    public static int taskDefault() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.task_default_light : drawable.task_default_dark;
    }

    public static int taskOngoing() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.task_ongoing_light : drawable.task_ongoing_dark;
    }

    public static int taskPast() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.task_past_light : drawable.task_past_dark;
    }

    public static int pillDefault() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.pill_default_light : drawable.pill_default_dark;
    }

    public static int pillOngoing() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.pill_ongoing_light : drawable.pill_ongoing_dark;
    }

    public static int pillPast() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.pill_past_light : drawable.pill_past_dark;
    }

    public static int addButton() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.add_button_light : drawable.add_button_dark;
    }

    public static int iconAdd() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_add_light : drawable.ic_add_dark;
    }

    public static int iconClockNormal() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_clock_light : drawable.ic_clock_dark;
    }

    public static int iconClockAlt() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_clock_light_alt : drawable.ic_clock_dark_alt;
    }

    public static int iconCategoryNormal() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_category_light : drawable.ic_category_dark;
    }

    public static int iconCategoryAlt() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_category_light_alt : drawable.ic_category_dark_alt;
    }

    public static int iconCheckbox() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_box_light : drawable.ic_box;
    }

    public static int iconImportant() {
        String theme = DB.getString("theme", "dark");
        Boolean is_light = theme.equals("light");

        return is_light ? drawable.ic_important_light : drawable.ic_important_dark;
    }
}
