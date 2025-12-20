<script>
  import ButtonClear from "../button/ButtonClear.svelte";
  import { language } from "$lib/services/language.svelte";
  import { tick, untrack } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {string | null} [value] - The time value in HH:MM format.
   * @property {boolean} [can_clear=true] - Whether the time input can be cleared.
   * @property {Function} [onchange] - Callback function when the time changes.
   */

  /** @type {Props & Record<string, any>} */
  let { value, can_clear = true, onchange = () => {}, ...rest } = $props();

  let is_focused = $state(false);

  /** @type {HTMLInputElement?} */
  let time_input = $state(null);

  const display_value = $derived(value ? displayTime(value) : null);

  $effect(() => {
    if (!is_focused) return;

    untrack(async () => {
      await tick();
      if (!time_input) return;

      try {
        if (time_input && time_input !== document.activeElement) {
          time_input.focus();
        }
      } catch (error) {
        time_input.blur();
        console.error("InputTime: Error focusing time input", error);
      }
    });
  });

  /**
   * Formats the time to a human-readable string for display.
   * @param {string} [time]
   * @return {string} The formatted time string.
   */
  function displayTime(time) {
    if (!time) return "";

    try {
      const [hours, minutes] = time.split(":").map(Number);

      if (isNaN(hours) || isNaN(minutes)) return "";

      let date = new Date(0);
      date.setHours(hours, minutes, 0, 0);

      return date.toLocaleTimeString(language.value === "af" ? "af-ZA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "";
    }
  }

  /**
   * Handles input change events.
   * @param {Event} e
   */
  function handleChange(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const newValue = target.value || undefined;
    value = newValue;
    onchange({ value });

    // Close the picker after selection
    if (newValue) {
      is_focused = false;
    }
  }

  /**
   * Clears the time input value.
   * @param {MouseEvent} e
   */
  function clearValue(e) {
    e.stopPropagation();
    value = undefined;
    onchange({ value });
    is_focused = false;
  }
</script>

{#if !is_focused}
  <div class="relative w-full">
    <input
      {...rest}
      id={undefined}
      type="text"
      value={display_value}
      onfocus={() => (is_focused = true)}
      class={[
        {
          "bg-card p-2 w-full h-12 rounded-lg placeholder:text-muted border border-default outline-none focus:ring-1 ring-primary": true,
        },
        rest.class ?? "",
      ]}
    />
    {#if can_clear && !!value}
      <ButtonClear onclick={clearValue} class="absolute top-0 bottom-0 right-0" />
    {/if}
  </div>
{:else}
  <div class="relative w-full">
    <input
      {...rest}
      type="time"
      bind:this={time_input}
      value={value || ""}
      onfocus={async () => {
        if (!time_input) return;
        await tick();
        time_input.showPicker();
      }}
      onclick={(e) => {
        e.stopPropagation();
        if (!time_input) return;
        time_input.showPicker();
      }}
      onchange={handleChange}
      onblur={() => {
        // Small delay to allow picker interaction
        setTimeout(() => {
          is_focused = false;
        }, 100);
      }}
      class={[
        {
          "bg-card border border-default p-2 w-full h-12 rounded-lg text-muted appearance-none outline-none focus:ring-1 ring-primary": true,
        },
        rest.class ?? "",
      ]}
    />
    {#if can_clear && !!value}
      <ButtonClear onclick={clearValue} />
    {/if}
  </div>
{/if}
