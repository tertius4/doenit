<script>
  import ButtonClear from "$display/comps/button/ButtonClear.svelte";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @property {string} value
   * @property {(value: string) => Promise<void> | void} [onchange]
   * @property {Readonly<boolean>} [invalid]
   * @property {Readonly<boolean>} [focus_on_mount]
   * @property {Readonly<boolean>} [can_clear]
   */

  /** @type {Props & Record<string, any>} */
  const { value, onchange = () => {}, invalid, focus_on_mount = false, can_clear = false, ...rest } = $props();

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
    onchange(textarea?.value || "");
  }

  /**
   * Clear the textarea value
   */
  function clearValue() {
    onchange("");
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
  }
</script>

<div {...rest} class={["relative w-full", rest.class]}>
  <div
    tabindex="-1"
    class={[
      "z-10 pointer-events-none",
      !value && "pl-3.5 text-muted translate-y-[160%]",
      !!value && "z-50 relative font-semibold",
      invalid && "text-error",
    ]}
  >
    {t("what_needs_to_be_done")}
  </div>

  <textarea
    {...rest}
    use:init
    {value}
    oninput={handleInput}
    {invalid}
    rows="1"
    class={{
      "border-b min-h-12 border-default p-3 w-full placeholder:text-muted outline-none focus:border-primary resize-none overflow-y-auto": true,
      "bg-card border border-default rounded-lg bg-card": true,
      "bg-error/20! border-error!": invalid,
    }}
  ></textarea>

  {#if can_clear && value}
    <ButtonClear onclick={clearValue} />
  {/if}
</div>
