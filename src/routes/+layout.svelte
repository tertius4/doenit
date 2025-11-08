<script>
  import { pushNotificationService } from "$lib/services/pushNotifications.svelte";
  import { notifications } from "$lib/services/notification.svelte";
  import { onDestroy, onMount, setContext, untrack } from "svelte";
  import { SyncService } from "$lib/services/syncService";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { Photos } from "$lib/services/photos.svelte";
  import Backup from "$lib/services/backup.svelte";
  import { Widget } from "$lib/services/widget";
  import { Value } from "$lib/utils.svelte";
  import user from "$lib/core/user.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { Selected } from "$lib/selected";
  import { Alert } from "$lib/core/alert";
  import Heading from "./Heading.svelte";
  import { goto } from "$app/navigation";
  import Footer from "./Footer.svelte";
  import { App } from "@capacitor/app";
  import { page } from "$app/state";
  import { DB } from "$lib/DB";
  import "../app.css";

  let { children } = $props();

  /** @type {string[]} */
  let room_ids = $state([]);

  const search_text = new Value("");
  setContext("search_text", search_text);

  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeOnlineTasks = null;
  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeInvites = null;
  /** @type {Subscription?} */
  let unsubscribeRoom = null;

  /** @type {symbol | null} */
  let selection_token = null;

  const has_selection = $derived(!!Selected.tasks.size);

  $effect(() => {
    if (!user.value?.is_backup_enabled) return;

    untrack(() => Backup.init());
  });

  $effect(() => {
    user.value;

    untrack(() => Backup.populateLastBackupTime());
  });

  $effect(() => {
    if (unsubscribeOnlineTasks) unsubscribeOnlineTasks();
    if (!user.value?.is_friends_enabled) return;
    if (!room_ids.length) return;

    // Clean up existing subscription before creating a new one
    unsubscribeOnlineTasks = OnlineDB.Task.subscribe((t) => DB.Task.sync(t), {
      filters: [{ field: "room_id", operator: "in", value: room_ids }],
    });
  });

  $effect(() => {
    if (unsubscribeInvites) unsubscribeInvites();
    if (!user.value?.is_friends_enabled) return;

    // Clean up existing subscription before creating a new one
    unsubscribeInvites = OnlineDB.Invite.subscribe((i) => DB.Invite.set(i), {
      filters: [
        {
          or: [
            { field: "to_email_address", operator: "==", value: user.value?.email },
            { field: "from_email_address", operator: "==", value: user.value?.email },
          ],
        },
      ],
    });
  });

  $effect(() => {
    if (!user.value?.is_friends_enabled) return;

    untrack(() => pushNotificationService.init());
  });

  $effect(() => {
    setTimeout(() => {
      untrack(() => cleanupOrphanedPhotos());
    }, 5000); // Wag voor skoonmaak sodat toep vinnig kan begin.
  });

  $effect(() => {
    has_selection;

    untrack(() => {
      if (has_selection && !selection_token) {
        selection_token = backHandler.register(() => {
          Selected.tasks.clear();
          if (selection_token) {
            backHandler.unregister(selection_token);
            selection_token = null;
          }

          return true;
        }, 10);
      }
    });
  });

  $effect(() => {
    if (unsubscribeRoom) unsubscribeRoom.unsubscribe();
    if (!user.value?.is_friends_enabled) return;

    unsubscribeRoom = DB.Room.subscribe((rooms) => {
      room_ids = rooms.map((r) => r.id);
    });
  });

  onMount(() => {
    const sub = DB.Task.subscribe(handleTasksUpdate, { selector: { archived: { $ne: true } } });
    return () => sub.unsubscribe();
  });

  onMount(() => {
    const sync = SyncService.getInstance();
    // Start background sync service
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

    App.addListener("backButton", () => {
      backHandler.handle();
    });

    return () => {
      if (selection_token) backHandler.unregister(selection_token);
      backHandler.unregister(nav_token);
      backHandler.unregister(exit_token);
    };
  });

  onDestroy(() => {
    if (unsubscribeOnlineTasks) unsubscribeOnlineTasks();
    if (unsubscribeInvites) unsubscribeInvites();
    if (unsubscribeRoom) unsubscribeRoom.unsubscribe();
  });

  /**
   * @param {Task[]} tasks
   */
  async function handleTasksUpdate(tasks) {
    await notifications.scheduleNotifications(tasks);
    await Widget.updateTasks(tasks);
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

  <main class="max-w-[1000px] overflow-x-hidden w-full md:mx-auto grow overflow-y-auto p-2">
    {@render children()}
  </main>

  <Footer />
</div>
