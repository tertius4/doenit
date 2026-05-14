<script lang="ts">
  import { goto } from "$app/navigation";
  import DB from "$domain/db";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { context } from "$logic/context.svelte";
  import { backHandler } from "$logic/navigation";
  import { onMount } from "svelte";

  let session = $state<DB.Session | null>(null);

  onMount(async () => {
    const result = await DB.session.get();
    if (result.ok) session = result.value;

    console.log("Loaded session:", session);
  });

  onMount(() => {
    const token = backHandler.register(() => goto("/db"), -1);
    BACK_BUTTON_FUNCTION.value = token;

    return () => backHandler.unregister(token);
  });

  function safe<T>(getter: () => T): T | null {
    try {
      return getter();
    } catch {
      return null;
    }
  }

  const settings = $derived(safe(() => context.settings));
  const app_state = $derived(safe(() => context.app_state));
  const user_state = $derived(safe(() => context.user_state));
</script>

<h2 class="text-xl font-bold mb-4">Context / DB State</h2>

<div class="flex flex-col gap-4">
  <!-- Session -->
  <section class="border border-default rounded p-3">
    <h3 class="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Session</h3>
    {#if session}
      <div class="flex flex-col gap-1 text-xs">
        <div><span class="text-muted">id:</span> {session.id}</div>
        <div>
          <span class="text-muted">user_id:</span>
          {#if session.user_id}
            <span class="text-green-400">{session.user_id}</span>
          {:else}
            <span class="text-amber-400">null (logged out)</span>
          {/if}
        </div>
      </div>
    {:else}
      <p class="text-xs text-muted">Loading...</p>
    {/if}
  </section>

  <!-- Logged-in User -->
  <section class="border border-default rounded p-3">
    <h3 class="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">User</h3>
    {#if context.user}
      <pre class="text-xs whitespace-pre-wrap break-all">{JSON.stringify(context.user, null, 2)}</pre>
    {:else}
      <p class="text-xs text-muted">— No user logged in —</p>
    {/if}
  </section>

  <!-- Settings -->
  <section class="border border-default rounded p-3">
    <h3 class="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Settings</h3>
    {#if settings}
      <pre class="text-xs whitespace-pre-wrap break-all">{JSON.stringify(settings, null, 2)}</pre>
    {:else}
      <p class="text-xs text-muted">— Not loaded —</p>
    {/if}
  </section>

  <!-- App State -->
  <section class="border border-default rounded p-3">
    <h3 class="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">App State</h3>
    {#if app_state}
      <pre class="text-xs whitespace-pre-wrap break-all">{JSON.stringify(app_state, null, 2)}</pre>
    {:else}
      <p class="text-xs text-muted">— Not loaded —</p>
    {/if}
  </section>

  <!-- User State -->
  <section class="border border-default rounded p-3">
    <h3 class="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">User State</h3>
    {#if user_state}
      <!-- Active scopes highlighted -->
      <div class="mb-3">
        <p class="text-xs text-muted mb-1">active_scopes ({user_state.active_scopes?.length ?? 0})</p>
        {#if user_state.active_scopes?.length}
          <ul class="flex flex-col gap-1">
            {#each user_state.active_scopes as scope}
              <li class="text-xs font-mono bg-blue-950 text-blue-300 rounded px-2 py-0.5">{scope}</li>
            {/each}
          </ul>
        {:else}
          <p class="text-xs text-muted">— No active scopes —</p>
        {/if}
      </div>
      <pre class="text-xs whitespace-pre-wrap break-all">{JSON.stringify(user_state, null, 2)}</pre>
    {:else}
      <p class="text-xs text-muted">— Not loaded —</p>
    {/if}
  </section>
</div>
