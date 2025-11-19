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
  import { SvelteMap } from "svelte/reactivity";

  let { children } = $props();

  const search_text = new Value("");
  setContext("search_text", search_text);

  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeOnlineTasks = null;
  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeInvites = null;
  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeOnlineCategory = null;
  /** @type {FirebaseUnsubscribe?} */
  let unsubscribeOnlineUsers = null;
  /** @type {Subscription?} */
  let usersSubscription = null;
  /** @type {Subscription?} */
  let unsubscribeCategory = null;

  /** @type {SvelteMap<string, Category>} */
  let categories_map = new SvelteMap();

  /** @type {symbol?} */
  let selection_token = null;
  /** @type {string[]} */
  let category_ids = $state([]);
  /** @type {User[]} */
  let users = $state([]);

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
    if (!category_ids.length) return;

    // Clean up existing subscription before creating a new one
    unsubscribeOnlineTasks = OnlineDB.Task.subscribe((t) => DB.Task.sync(t), {
      filters: [{ field: "category_id", operator: "in", value: category_ids }],
    });
  });

  $effect(() => {
    if (unsubscribeCategory) unsubscribeCategory.unsubscribe();
    if (!user.value?.is_friends_enabled) return;

    // Clean up existing subscription before creating a new one
    unsubscribeCategory = DB.Category.subscribe((c) => {
      categories_map.clear();
      for (const category of c) {
        categories_map.set(category.id, category);
      }
    });

    return () => {
      if (unsubscribeCategory) unsubscribeCategory.unsubscribe();
    };
  });

  $effect(() => {
    if (!user.value?.is_friends_enabled) return;

    // Clean up existing subscription before creating a new one
    untrack(() => {
      if (unsubscribeInvites) unsubscribeInvites();
      unsubscribeInvites = OnlineDB.Invite.subscribe(async (i) => DB.Invite.set(i), {
        filters: [
          {
            or: [
              { field: "to_email_address", operator: "==", value: user.value?.email },
              { field: "from_email_address", operator: "==", value: user.value?.email },
            ],
          },
        ],
        sort: [{ field: "created_at", direction: "asc" }],
      });
    });
  });

  $effect(() => {
    if (!user.value?.is_friends_enabled) return;

    untrack(() => {
      usersSubscription = DB.User.subscribe((result) => (users = result), {
        sort: [{ name: "asc" }],
      });
    });
  });

  $effect(() => {
    if (unsubscribeOnlineUsers) unsubscribeOnlineUsers();
    if (!user.value?.is_friends_enabled) return;

    const user_email_addresses = users.map((u) => u.email_address);
    if (!user_email_addresses.length) return;

    untrack(() => {
      unsubscribeOnlineUsers = OnlineDB.User.subscribe((online_users) => DB.User.sync(online_users, users), {
        filters: [{ field: "email_address", operator: "in", value: user_email_addresses }],
      });
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

  $effect(() => {
    // Hierdie kategorieë dui aan watter take om te sinkroniseer
    if (unsubscribeOnlineCategory) unsubscribeOnlineCategory();
    if (!user.value?.is_friends_enabled) return;

    unsubscribeOnlineCategory = OnlineDB.Category.subscribe(
      async (online_categories) => {
        const category_id_set = new Set(online_categories.map((c) => c.category_id));
        category_ids = Array.from(category_id_set);

        const sync_operations = [];

        for (const online_category of online_categories) {
          const local_category = categories_map.get(online_category.category_id);

          if (local_category) {
            // Update existing category if data differs
            if (
              local_category.name !== online_category.name ||
              JSON.stringify(local_category.users) !== JSON.stringify(online_category.users)
            ) {
              sync_operations.push(
                DB.Category.update(online_category.category_id, {
                  name: online_category.name,
                  users: online_category.users,
                })
              );
            }
          } else {
            // Create new category
            sync_operations.push(
              DB.Category.create({
                id: online_category.category_id,
                name: online_category.name,
                users: online_category.users,
              })
            );
          }
        }

        if (sync_operations.length > 0) {
          await Promise.all(sync_operations);
        }
      },
      {
        filters: [{ field: "users", operator: "array-contains", value: user.value?.email }],
      }
    );
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
    if (unsubscribeOnlineCategory) unsubscribeOnlineCategory();
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

  <main class="max-w-[1000px] scrollbar-none overflow-x-hidden w-full md:mx-auto grow overflow-y-auto p-2">
    {@render children()}
  </main>

  <Footer />
</div>
