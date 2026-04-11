<script>
  import Toast from "./Toast.svelte";
  import toast from "./toast.svelte";
</script>

<div
  class="fixed flex flex-col gap-2 z-50"
  style="top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left)); right: max(16px, env(safe-area-inset-right));"
>
  {#each toast.toasts as t (t.id)}
    <Toast toast={t} />
  {/each}
</div>
