<script>
  import { DailySummary } from "$lib/services/dailySummary.svelte";
  import { t } from "$lib/services/language.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$lib/BackHandler.svelte";
  import TaskCompleted from "$lib/components/task/TaskCompleted.svelte";
  import TaskComp from "$lib/components/task/Task.svelte";
  import { DB } from "$lib/DB";
  import { Alert } from "$lib/core/alert";
  import DatePicker from "./DatePicker.svelte";

  /** @type {DailySummaryData?} */
  let summary_data = $state(null);
  let selected_date = $state(new Date());
  let is_loading = $state(true);
  let current_time = $state(new Date());

  const is_today = $derived.by(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selected_date);
    selected.setHours(0, 0, 0, 0);
    return today.getTime() === selected.getTime();
  });

  onMount(() => {
    loadSummary();

    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    // Update current time every minute for task display
    const interval = setInterval(() => {
      current_time = new Date();
    }, 60000);

    return () => {
      backHandler.unregister(token);
      clearInterval(interval);
    };
  });

  async function loadSummary() {
    is_loading = true;
    try {
      summary_data = await DailySummary.getDataForDate(selected_date);
      // Only save summary if we're viewing today
      if (is_today) {
        await DailySummary.saveSummary(selected_date, summary_data);
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("error")}: ${error_message}`);
    }

    is_loading = false;
  }

  async function goToToday() {
    selected_date = new Date();
    await loadSummary();
  }

  /**
   *
   * @param {Task} task
   */
  async function completeTask(task) {
    try {
      await DB.Task.complete(task);
      await loadSummary();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("error")}: ${error_message}`);
    }
  }

  /**
   *
   * @param {Task} task
   */
  async function uncompleteTask(task) {
    try {
      await DB.Task.uncomplete(task);
      await loadSummary();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`${t("error")}: ${error_message}`);
    }
  }

  /**
   *
   * @param {number} days
   */
  function getStreakEmoji(days) {
    if (days === 0) return "";
    if (days < 7) return "🔥";
    if (days < 30) return "🔥🔥";
    if (days < 100) return "🔥🔥🔥";
    return "👑";
  }

  /**
   *
   * @param {number} completion_rate
   * @param {number} streak
   */
  function getMotivationalMessage(completion_rate, streak) {
    if (completion_rate === 1) {
      return t("daily_summary_perfect_day");
    } else if (completion_rate >= 0.8) {
      return t("daily_summary_great_work");
    } else if (completion_rate >= 0.5) {
      return t("daily_summary_good_progress");
    } else if (streak >= 7) {
      return t("daily_summary_keep_streak");
    } else {
      return t("daily_summary_new_day");
    }
  }

  /**
   *
   * @param {Date} date
   */
  async function handleDateChange(date) {
    selected_date = date;
    await loadSummary();
  }
</script>

{#if is_loading}
  <div class="flex items-center justify-center py-12">
    <div class="text-lg text-muted">{t("loading")}</div>
  </div>
{:else if summary_data}
  <DatePicker date={selected_date} ondatechange={handleDateChange} />

  <div class="space-y-6 pb-20 grow overflow-y-auto">
    {#if !is_today}
      <button
        type="button"
        onclick={goToToday}
        class="w-full px-4 py-2 bg-primary text-alt rounded-lg transition-colors"
      >
        {t("go_to_today")}
      </button>
    {/if}

    <!-- Stats Cards -->
    <section class="grid grid-cols-3 gap-4">
      <div class="bg-success/20 border border-success rounded-lg p-4 text-center">
        <div class="text-3xl font-bold text-success">{summary_data.completed_today.length}</div>
        <div class="text-sm text-muted mt-1">{t("completed")}</div>
      </div>

      <div class="bg-error/20 border border-error rounded-lg p-4 text-center">
        <div class="text-3xl font-bold text-error">{summary_data.incomplete_due_today.length}</div>
        <div class="text-sm text-muted mt-1">{t("incomplete")}</div>
      </div>

      <div class="bg-primary/20 border border-primary rounded-lg p-4 text-center">
        <div class="text-3xl font-bold text-primary">{Math.round(summary_data.completion_rate * 100)}%</div>
        <div class="text-sm text-muted mt-1 break-words">{t("completion_rate")}</div>
      </div>
    </section>

    <!-- Streak Badge -->
    {#if !!summary_data.consecutive_productive_days}
      <section
        class="bg-gradient-to-r from-orange-400/20 to-red-700/20 border border-orange-500 rounded-lg p-4 text-center"
      >
        <div class="text-2xl font-bold">
          {getStreakEmoji(summary_data.consecutive_productive_days)}
          {summary_data.consecutive_productive_days}
          {t("day_streak")}
          {getStreakEmoji(summary_data.consecutive_productive_days)}
        </div>
        {#if summary_data.consecutive_productive_days === 7}
          <div class="text-sm text-muted mt-2">{t("daily_summary_week_streak")}</div>
        {:else if summary_data.consecutive_productive_days === 30}
          <div class="text-sm text-muted mt-2">{t("daily_summary_month_streak")}</div>
        {:else if summary_data.consecutive_productive_days === 100}
          <div class="text-sm text-muted mt-2">{t("daily_summary_legendary_streak")}</div>
        {/if}
      </section>
    {/if}

    <!-- Motivational Message -->
    {#if is_today}
      <section class="bg-surface rounded-lg p-4 text-center border border-default">
        <p class="text-lg">
          {getMotivationalMessage(summary_data.completion_rate, summary_data.consecutive_productive_days)}
        </p>
      </section>
    {/if}

    <!-- Completed Tasks -->
    {#if !!summary_data.completed_today.length}
      <section class="space-y-3">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <span>✅</span>
          <span>{t("completed_today")} ({summary_data.completed_today.length})</span>
        </h3>
        <div class="space-y-1.5">
          {#each summary_data.completed_today as task (task.id)}
            <TaskCompleted
              {task}
              onclick={() => goto(`/${task.id}`)}
              onselect={() => uncompleteTask(task)}
              onlongpress={() => {}}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Incomplete Tasks -->
    {#if !!summary_data.incomplete_due_today.length}
      <section class="space-y-3">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <span>⏰</span>
          <span>{t("still_todo_today")} ({summary_data.incomplete_due_today.length})</span>
        </h3>
        <div class="space-y-1.5">
          {#each summary_data.incomplete_due_today as task (task.id)}
            <div class="relative">
              <TaskComp
                {task}
                {current_time}
                onclick={() => goto(`/${task.id}`)}
                onselect={(t) => completeTask(t)}
                onlongpress={() => {}}
              />
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Tomorrow Preview -->
    {#if is_today && !!summary_data.due_tomorrow.length}
      <section class="space-y-3">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <span>🌅</span>
          <span>{t("tomorrow_tasks")} ({summary_data.due_tomorrow.length})</span>
        </h3>
        <div class="space-y-1.5">
          {#each summary_data.due_tomorrow.slice(0, 5) as task (task.id)}
            <TaskComp
              {task}
              {current_time}
              onclick={() => goto(`/${task.id}`)}
              onselect={() => {}}
              onlongpress={() => {}}
            />
          {/each}
        </div>
        {#if summary_data.due_tomorrow.length > 5}
          <p class="text-sm text-muted text-center">
            {t("and_n_more", { count: summary_data.due_tomorrow.length - 5 })}
          </p>
        {/if}
      </section>
    {/if}

    <!-- Overdue Warning -->
    {#if !!summary_data.overdue_tasks.length}
      <section class="space-y-3">
        <h3 class="text-lg font-semibold flex items-center gap-2 text-error">
          <span>⚠️</span>
          <span>{t("overdue_tasks")} ({summary_data.overdue_tasks.length})</span>
        </h3>
        <button
          type="button"
          onclick={() => goto("/")}
          class="w-full px-4 py-3 bg-error/50 border border-error text-alt rounded-lg"
        >
          {t("view_all_overdue")}
        </button>
      </section>
    {/if}
  </div>
{/if}
