<script>
  import { CategoriesContext, setCategoriesContext } from "$lib/contexts/categories.svelte";
  import { pushNotificationService } from "$lib/services/pushNotifications.svelte";
  import { BillingContext, setBillingContext } from "$lib/contexts/billing.svelte";
  import { UsersContext, setUsersContext } from "$lib/contexts/users.svelte";
  import { setTasksContext, TasksContext } from "$lib/contexts/tasks.svelte";
  import { notifications } from "$lib/services/notification.svelte";
  import { onDestroy, onMount, setContext, untrack } from "svelte";
  import { SyncService } from "$lib/services/syncService";
  import { backHandler } from "$logic/navigation";
  import { Photos } from "$lib/services/photos.svelte";
  import { goto, pushState } from "$app/navigation";
  import Backup from "$lib/services/backup.svelte";
  import { sortTasksByDueDate, wait } from "$lib";
  import { Selected } from "$lib/selected.svelte";
  import { navigating, page } from "$app/state";
  import { user } from "$lib/core/user.svelte";
  import { Widget } from "$lib/core/widget";
  import { Value } from "$lib/utils.svelte";
  // import { OnlineDB } from "$lib/OnlineDB";
  import { alert } from "$lib/core/alert";
  import Heading from "$display/features/header/Heading.svelte";
  import Footer from "$display/features/footer/Footer.svelte";
  import { App } from "@capacitor/app";
  // import { DB } from "$lib/DB";
  import "../../app.css";

  let { children } = $props();

  const search_text = new Value("");
  setContext("search_text", search_text);

  const usersContext = setUsersContext(new UsersContext());
  const categoriesContext = setCategoriesContext(new CategoriesContext());
  const tasksContext = setTasksContext(new TasksContext());
  const billingContext = setBillingContext(new BillingContext());

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

    untrack(() => billingContext.refresh());
    untrack(() => Backup.populateLastBackupTime());
    untrack(async () => {
      if (!user.is_logged_in) return;

      const online_user = await usersContext.ensureOnlineUserExists();
      if (online_user) await usersContext.ensureLocalUserExists(online_user.id);
    });
  });

  $effect(() => {
    if (!user.is_friends_enabled) return;
    if (!category_ids.length) return;

    untrack(() => {
      try {
        // if (unsubscribeOnlineTasks) unsubscribeOnlineTasks();
        // unsubscribeOnlineTasks = OnlineDB.Task.subscribe((t) => DB.Task.sync(t), {
        //   filters: [{ field: "category_id", operator: "in", value: category_ids }],
        // });
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        if (error_message.includes("insufficient permissions")) return;
        alert.error(`Fout met aanmelding vir aanlyn take: ${error_message}`);
      }
    });
  });

  $effect(() => {
    if (!user.is_friends_enabled) return;

    const user_email_addresses = usersContext.users.map((u) => u.email_address);
    if (!user_email_addresses.length) return;

    untrack(() => {
      try {
        // unsubscribeOnlineUsers = OnlineDB.User.subscribe(
        //   (online_users) => DB.User.sync(online_users, usersContext.users),
        //   {
        //     filters: [{ field: "email_address", operator: "in", value: user_email_addresses }],
        //   },
        // );
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error);
        alert.error(`Fout met aanmelding vir aanlyn gebruikers: ${error_message}`);
      }
    });
  });

  $effect(() => {
    if (!user.is_friends_enabled) return;

    // untrack(() => Backup.init());
    // untrack(() => usersContext.init());
    // untrack(() => categoriesContext.onlineInit());
    // untrack(() => pushNotificationService.init());
    // untrack(() => {
    //   try {
    //     if (unsubscribeInvites) unsubscribeInvites();
    //     unsubscribeInvites = OnlineDB.Invite.subscribe(async (i) => DB.Invite.set(i), {
    //       filters: [
    //         {
    //           or: [
    //             { field: "to_email_address", operator: "==", value: user.email_address },
    //             { field: "from_email_address", operator: "==", value: user.email_address },
    //           ],
    //         },
    //       ],
    //       sort: [{ field: "created_at", direction: "asc" }],
    //     });
    //   } catch (error) {
    //     const error_message = error instanceof Error ? error.message : String(error);
    //     alert.error(`Fout met aanmelding vir uitnodigings: ${error_message}`);
    //   }
    // });
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
    document.documentElement.setAttribute("data-theme", user.theme);
  });

  onMount(() => {
    untrack(async () => {
      await notifications.init();
      await wait(3 * 1000);
      await notifications.requestPermission();
    });
  });

  onMount(() => {
    untrack(async () => {
      // Listen for notification taps
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.addListener("localNotificationActionPerformed", async (notification) => {
        const extra = notification.notification.extra;
        if (extra?.type === "daily_summary") {
          await goto("/daily-summary");
        } else {
          await goto("/");
        }
      });
    });
  });

  onMount(() => {
    categoriesContext.init();
    window.addEventListener("online", () => billingContext.refresh());
  });

  // onMount(() => {
  //   try {
  //     const sub = DB.Task.subscribe((ts) => handleTasksUpdate(ts));
  //     return () => sub.unsubscribe();
  //   } catch (error) {
  //     const error_message = error instanceof Error ? error.message : String(error);
  //     alert.error(`Kon nie aan plaaslike databasis koppel nie: ${error_message}`);
  //     return () => {};
  //   }
  // });

  onMount(() => {
    // Hanteering van sinkronisasie indien vanlyn
    const sync = SyncService.getInstance();
    sync.startBackgroundSync();

    return () => sync.stopBackgroundSync();
  });

  onMount(() => {
    // Register default navigation handler (lowest priority)
    const nav_token = backHandler.register(() => {
      if (!page.data.is_home) {
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
    // if (unsubscribeInvites) unsubscribeInvites();
    if (unsubscribeOnlineUsers) unsubscribeOnlineUsers();

    usersContext.destroy();
    categoriesContext.destroy();
  });

  /**
   * @param {Task[]} tasks
   */
  async function handleTasksUpdate(tasks) {
    const active_tasks = sortTasksByDueDate(tasks.filter((t) => !t.archived));
    await notifications.scheduleNotifications(active_tasks);
    tasksContext.setTasks(active_tasks);

    const { searchParams, origin, pathname } = page.url;
    const task_id = navigating.from?.params?.item_id || searchParams.get("new_id");
    if (!!task_id) scrollToTask(task_id);

    const completed_task_ids = searchParams.get("completed_task_ids");
    if (!!completed_task_ids) {
      const task_ids = [...new Set(completed_task_ids.split(","))];

      const completed_tasks = [];
      for (const id of task_ids) {
        const task = tasksContext.getTaskById(id);
        if (task) completed_tasks.push(task);
      }

      // const promises = completed_tasks.map((task) => DB.Task.complete(task));
      // const result = await Promise.all(promises);

      // const has_failed_tasks = result.some((res) => !res);
      // if (has_failed_tasks) alert.error("Fout met take voltooi.");
    }

    // Update the URL without reloading the page
    searchParams.delete("new_id");
    searchParams.delete("completed_task_ids");
    const url_search = !!searchParams.size ? `${page.url.search}` : "";
    const new_url = `${origin}${pathname}${url_search}`;
    pushState(new_url, {});

    await Widget.updateTasks(active_tasks.slice(0, 20), categoriesContext.categories);
  }

  /**
   * Cleanup orphaned photos (photos not referenced by any task)
   */
  async function cleanupOrphanedPhotos() {
    if (!Photos.PHOTOS_ENABLED) return;

    try {
      const tasks = tasksContext.tasks;
      const photo_ids = tasks.flatMap((task) => task.photo_ids || []).filter(Boolean);

      await Photos.cleanupOrphanedPhotos(photo_ids);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert.error(`Fout tydens wees-foto skoonmaak: ${error_message}`);
    }
  }

  /**
   * @param {string} task_id
   */
  function scrollToTask(task_id) {
    const element = document.getElementById(task_id);
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }
</script>

<svelte:window onload={() => document.documentElement.setAttribute("data-theme", user.theme)} />

<div
  class="min-h-dvh relative grid grid-rows-[auto_1fr_auto] text-md text-normal bg-page **:select-none **:transition-all **:duration-300"
>
  <Heading />

  <main class="max-w-250 scrollbar-none overflow-x-hidden w-full md:mx-auto grow overflow-y-auto p-2">
    {@render children()}
  </main>

  <Footer />
</div>
