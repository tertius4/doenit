<script>
  import Toast from "./Toast.svelte";
  import toast from "./toast.svelte";
</script>

<div class="fixed top-4 left-4 right-4 flex flex-col gap-2 z-50">
  {#each toast.toasts as t (t.id)}
    <Toast toast={t} />
  {/each}
</div>
