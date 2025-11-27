<script>
  import { CategoriesContext, setCategoriesContext } from "$lib/contexts/categories.svelte";
  import { pushNotificationService } from "$lib/services/pushNotifications.svelte";
  import { UsersContext, setUsersContext } from "$lib/contexts/users.svelte";
  import { notifications } from "$lib/services/notification.svelte";
  import { onDestroy, onMount, setContext, untrack } from "svelte";
  import { SyncService } from "$lib/services/syncService";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { Photos } from "$lib/services/photos.svelte";
  import Backup from "$lib/services/backup.svelte";
  import { user } from "$lib/base/user.svelte";
  import { sortTasksByDueDate } from "$lib";
  import { Widget } from "$lib/core/widget";
  import { Value } from "$lib/utils.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { Selected } from "$lib/selected.svelte";
  import { Alert } from "$lib/core/alert";
  import Heading from "./Heading.svelte";
  import { goto } from "$app/navigation";
  import Footer from "./Footer.svelte";
  import { App } from "@capacitor/app";
  import { page } from "$app/state";
  import { DB } from "$lib/DB";
  import "../app.css";

  let { children } = $props();

  const search_text = new Value("");
  setContext("search_text", search_text);

  const usersContext = setUsersContext(new UsersContext());
  const categoriesContext = setCategoriesContext(new CategoriesContext());

  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeOnlineTasks = null;
  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeInvites = null;
  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeOnlineUsers = null;

  /** @type {symbol?} */
  let selection_token = null;

  const has_selection = $derived(!!Selected.tasks.size);
  const category_ids = $derived(categoriesContext.categories.map((c) => c.id));

  $effect(() => {
    user.is_logged_in;

    untrack(() => Backup.populateLastBackupTime());
  });

  $effect(() => {
    if (!user.is_friends_enabled) return;
    if (!category_ids.length) return;

    untrack(() => {
      if (unsubscribeOnlineTasks) unsubscribeOnlineTasks();
      unsubscribeOnlineTasks = OnlineDB.Task.subscribe((t) => DB.Task.sync(t), {
        filters: [{ field: "category_id", operator: "in", value: category_ids }],
      });
    });
  });

  $effect(() => {
    if (!user.is_friends_enabled) return;

    const user_email_addresses = usersContext.users.map((u) => u.email_address);
    if (!user_email_addresses.length) return;

    untrack(() => {
      unsubscribeOnlineUsers = OnlineDB.User.subscribe(
        (online_users) => DB.User.sync(online_users, usersContext.users),
        {
          filters: [{ field: "email_address", operator: "in", value: user_email_addresses }],
        }
      );
    });
  });

  $effect(() => {
    if (!user.is_friends_enabled) return;

    untrack(() => Backup.init());
    untrack(() => usersContext.init());
    untrack(() => categoriesContext.init());
    untrack(() => pushNotificationService.init());
    untrack(() => {
      if (unsubscribeInvites) unsubscribeInvites();
      unsubscribeInvites = OnlineDB.Invite.subscribe(async (i) => DB.Invite.set(i), {
        filters: [
          {
            or: [
              { field: "to_email_address", operator: "==", value: user.email_address },
              { field: "from_email_address", operator: "==", value: user.email_address },
            ],
          },
        ],
        sort: [{ field: "created_at", direction: "asc" }],
      });
    });
  });

  $effect(() => {
    setTimeout(() => {
      untrack(() => cleanupOrphanedPhotos());
    }, 5000); // Wag voor skoonmaak sodat toep vinnig kan begin.
  });

  $effect(() => {
    if (!has_selection) return;

    untrack(() => {
      if (selection_token) return;

      selection_token = backHandler.register(() => {
        Selected.tasks.clear();
        if (selection_token) {
          backHandler.unregister(selection_token);
          selection_token = null;
        }

        return true;
      }, 10);
    });
  });

  onMount(() => {
    categoriesContext.init();
  });

  onMount(() => {
    const sub = DB.Task.subscribe(handleTasksUpdate, { selector: { archived: { $ne: true } } });
    return () => sub.unsubscribe();
  });

  onMount(() => {
    // Hanteering van sinkronisasie indien vanlyn
    const sync = SyncService.getInstance();
    sync.startBackgroundSync();

    return () => sync.stopBackgroundSync();
  });

  onMount(() => {
    // Register default navigation handler (lowest priority)
    const nav_token = backHandler.register(() => {
      if (page.url.pathname !== "/") {
        goto("/");
        return true;
      }
      return false;
    }, -100);

    // Register app exit handler (fallback)
    const exit_token = backHandler.register(() => {
      App.exitApp();
      return true;
    }, -1000);

    App.addListener("backButton", () => backHandler.handle());

    return () => {
      if (selection_token) backHandler.unregister(selection_token);
      backHandler.unregister(nav_token);
      backHandler.unregister(exit_token);
    };
  });

  onDestroy(() => {
    if (unsubscribeOnlineTasks) unsubscribeOnlineTasks();
    if (unsubscribeInvites) unsubscribeInvites();
    if (unsubscribeOnlineUsers) unsubscribeOnlineUsers();

    usersContext.destroy();
    categoriesContext.destroy();
  });

  /**
   * @param {Task[]} tasks
   */
  async function handleTasksUpdate(tasks) {
    await notifications.scheduleNotifications(tasks);

    tasks = sortTasksByDueDate(tasks).slice(0, 20);

    await Widget.updateTasks(tasks, categoriesContext.categories);
  }

  /**
   * Cleanup orphaned photos (photos not referenced by any task)
   */
  async function cleanupOrphanedPhotos() {
    if (!Photos.PHOTOS_ENABLED) return;

    try {
      const tasks = await DB.Task.getAll();
      const photo_ids = tasks.flatMap((task) => task.photo_ids || []).filter(Boolean);

      await Photos.cleanupOrphanedPhotos(photo_ids);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`Fout tydens wees-foto skoonmaak: ${error_message}`);
    }
  }
</script>

<div class="text-md h-dvh relative flex flex-col text-normal bg-page **:select-none **:transition-all **:duration-300">
  <Heading />

  <main class="max-w-[1000px] scrollbar-none overflow-x-hidden w-full md:mx-auto grow overflow-y-auto p-2">
    {@render children()}
  </main>

  <Footer />
</div>
