<script>
  import InputTime from "$lib/components/element/input/InputTime.svelte";
  import InputDate from "$lib/components/element/input/InputDate.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { slide } from "svelte/transition";
  import { untrack } from "svelte";
  import ButtonClear from "./element/button/ButtonClear.svelte";
  import { t, language } from "$lib/services/language.svelte";

  let { start, end, onchange, error_message = $bindable() } = $props();

  const [sd, st] = start ? start.split(" ") : ["", ""];
  const [ed, et] = end ? end.split(" ") : ["", ""];

  let show_picker = $state(false);
  let start_date = $state(sd);
  let start_time = $state(st);
  let end_date = $state(ed);
  let end_time = $state(et);

  $effect(() => {
    const ed = end?.split(" ")[0] || "";

    untrack(() => {
      if (ed !== end_date) {
        end_date = ed;
      }
    });
  });

  $effect(() => {
    onchange({ start_date, start_time, end_date, end_time });
  });

  $effect(() => {
    untrack(() => {
      error_message = "";
    });

    // Check that start date and time is before end date and time
    if (!start_date || !end_date) return;
    const startDateTime = new Date(`${start_date}T${start_time || "00:00"}`);
    const endDateTime = new Date(`${end_date}T${end_time || "23:59"}`);

    if (!!startDateTime && !!endDateTime && startDateTime > endDateTime) {
      error_message = "Begin datum moet voor eind datum wees.";
    }
  });

  function toggle() {
    show_picker = !show_picker;
  }

  function done() {
    show_picker = false;
    const from = start_date ? `${start_date}${start_time ? "T" + start_time : ""}` : "";
    const to = end_date ? `${end_date}${end_time ? "T" + end_time : ""}` : "";
    dispatchEvent(new CustomEvent("update", { detail: { from, to } }));
  }

  /**
   * Custom action to handle clicks outside the date picker.
   * @param {HTMLDivElement} node
   */
  function clickOutside(node) {
    /**
     * Handles click events outside the date picker.
     * @param {MouseEvent & { target: * }} event - The click event.
     */
    const handleClick = (event) => {
      if (!node.contains(event.target)) {
        show_picker = false;
      }
    };

    document.addEventListener("click", handleClick, true);
    return {
      destroy() {
        document.removeEventListener("click", handleClick, true);
      },
    };
  }

  /**
   * @param {string} date
   */
  function displayDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString(language.value === "af" ? "af-ZA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleStartTimeChange({ value }) {
    if (value === start_time) return;
    start_time = value;
  }

  function handleEndTimeChange({ value }) {
    if (value === end_time) return;
    end_time = value;
  }
</script>

<div use:clickOutside>
  <div class="relative">
    <button
      type="button"
      onclick={toggle}
      class={{
        "px-3 py-2 w-full text-left bg-card rounded-lg border border-default": true,
        "border-error text-error": !!error_message,
        "text-muted": !start_date && !end_date,
      }}
    >
      {#if start_date || end_date}
        <div class="flex items-center">
          {#if start_date}
            <span>{displayDate(start_date)} {start_time || ""}</span>
          {/if}

          {#if start_date && end_date}
            <Icon name="arrow-left" />
          {/if}

          <span>{displayDate(end_date)} {end_time || ""}</span>
        </div>
      {:else}
        Kies datum en tyd
      {/if}
    </button>

    {#if start_date || end_date}
      <ButtonClear
        onclick={() => {
          start_date = "";
          start_time = "";
          end_date = "";
          end_time = "";
          error_message = "";
          show_picker = false;
        }}
      />
    {/if}
  </div>

  {#if error_message && !show_picker}
    <div class="text-error text-sm mt-1 flex justify-end">
      {error_message}
    </div>
  {/if}

  {#if show_picker}
    <div class="absolute z-50 bg-surface border border-default rounded-lg shadow-lg p-4 w-full mt-2" transition:slide>
      <div class="flex flex-col space-y-2">
        <div>
          <label for="start-date" class="block font-medium">{t("from_date")}</label>
          <div class="flex gap-2 w-full">
            <InputDate
              id="start-date"
              placeholder={t("choose_start_date")}
              class={!!error_message ? "border border-error text-error" : ""}
              value={start_date}
              max={end_date ? end_date : undefined}
              onchange={({ value }) => {
                start_date = value;
                if (!value) start_time = "";
              }}
            />

            {#if start_date}
              <InputTime
                id="start-time"
                value={start_time}
                onchange={handleStartTimeChange}
                placeholder={t("choose_start_time")}
                invalid={true}
              />
            {/if}
          </div>
        </div>

        {#if error_message}
          <div class="text-error text-sm mt-1 flex justify-end">
            {error_message}
          </div>
        {/if}

        <div>
          <label for="end-date" class="block font-medium">{t("to_date")}</label>

          <div class="flex gap-2">
            <InputDate
              open_on_mount={!end_date}
              id="end-date"
              placeholder={t("choose_due_date")}
              value={end_date}
              onchange={({ value }) => {
                end_date = value;
                if (!value) end_time = "";
              }}
            />

            {#if end_date}
              <InputTime
                id="end-time"
                value={end_time}
                onchange={handleEndTimeChange}
                placeholder={t("choose_end_time")}
                invalid={true}
              />
            {/if}
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={done}
          class="w-24 flex items-center justify-center h-12 bg-primary text-alt rounded-lg"
        >
          <Icon name="check" />
        </button>
      </div>
    </div>
  {/if}
</div>
