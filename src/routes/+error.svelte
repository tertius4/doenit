<script>
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import Icon from "$display/comps/Icon.svelte";
  import "../app.css";

  const error_message = $derived.by(() => {
    if (page.error?.message === "Internal Error") {
      return "Interne Fout";
    }
    return page.error?.message ?? "Iets het verkeerd gegaan";
  });
</script>

<div
  class="h-dvh flex flex-col items-center justify-center bg-page text-normal text-md px-6 **:transition-all **:duration-300"
>
  <div class="flex flex-col items-center gap-3 text-center">
    <div class="text-error">
      <Icon name="x-circle" size={56} />
    </div>

    <p class="text-5xl font-bold text-strong">{page.status}</p>

    <p class="text-xl font-semibold text-normal">
      {error_message}
    </p>

    <p class="text-sm text-muted max-w-xs">
      {#if page.status === 404}
        Die bladsy wat jy soek bestaan nie of is verskuif.
      {:else if page.status === 403}
        Jy het nie toegang tot hierdie bladsy nie.
      {:else}
        'n Onverwagte fout het voorgekom. Probeer asseblief weer.
      {/if}
    </p>
  </div>

  <button
    onclick={() => goto("/")}
    class="h-12 flex gap-2 border border-default rounded-lg px-6 items-center justify-center text-normal hover:bg-card bg-surface mt-4"
  >
    <Icon name="home" size={20} />
    <span>Tuis</span>
  </button>
</div>
