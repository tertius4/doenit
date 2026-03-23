<script>
  import t from "$display/translate";
  import ButtonClear from "$display/comps/button/ButtonClear.svelte"

  /**
   * @typedef {Object} Props
   * @property {string} value
   * @property {(e: Event) => Promise<void>} [onsubmit]
   * @property {Readonly<boolean>} [invalid]
   * @property {Readonly<boolean>} [focus_on_mount]
   * @property {Readonly<boolean>} [can_clear]
   */

  /** @type {Props & Record<string, any>} */
  let { value = $bindable(), onsubmit, invalid, focus_on_mount = false, can_clear = false, ...rest } = $props();

  /** @type {HTMLTextAreaElement | null} */
  let textarea = null;

  // Adjust height when value changes externally
  $effect(() => {
    value;
    setTimeout(() => adjustHeight(), 0);
  });

  /**
   * Adjust the height of the textarea based on content
   */
  function adjustHeight() {
    if (!textarea) return;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const maxHeight = lineHeight * 4; // 4 lines max

    textarea.style.height = `${Math.min(scrollHeight, maxHeight) + 2}px`;
  }

  /**
   * Handle input event
   */
  function handleInput() {
    invalid = false;
    adjustHeight();
  }

  /**
   * Clear the textarea value
   */
  function clearValue() {
    value = "";
    if (textarea) {
      textarea.style.height = "auto";
    }
  }

  /**
   * Focus the textarea when it is mounted
   * @param {HTMLTextAreaElement} el
   */
  function init(el) {
    textarea = el;

    if (focus_on_mount) {
      setTimeout(() => {
        el?.focus();
        el?.click();
      }, 100);
    }

    // Initial height adjustment
    adjustHeight();
  }
</script>

<div {...rest} class={["relative w-full", rest.class]}>
  <div
    tabindex="-1"
    class={[
      "z-10 pointer-events-none",
      !value && "pl-[9px] text-muted translate-y-[140%]",
      !!value && "z-50 relative font-semibold",
      invalid && "text-error",
    ]}
  >
    {t("what_needs_to_be_done")}
  </div>

  <textarea
    {...rest}
    use:init
    bind:value
    oninput={handleInput}
    {invalid}
    rows="1"
    class={{
      "border-b border-default p-2 w-full placeholder:text-muted outline-none focus:border-primary resize-none overflow-y-auto": true,
      "bg-card border border-default rounded-lg bg-card": true,
      "bg-error/20! border-error!": invalid,
    }}
  ></textarea>

  {#if can_clear && value}
    <ButtonClear onclick={clearValue} />
  {/if}
</div>
