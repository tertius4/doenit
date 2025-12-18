<script>
  import { backHandler } from "$lib/BackHandler.svelte";
  import { Photos } from "$lib/services/photos.svelte";
  import { t } from "$lib/services/language.svelte";
  import { CameraSource } from "@capacitor/camera";
  import { Camera, Gallery, Trash, X } from "$lib/icon";
  import { slide } from "svelte/transition";
  import { getContext, onMount } from "svelte";
  import Modal from "../modal/Modal.svelte";

  /**
   * @typedef {Object} Props
   * @property {string[]} [photo_ids]
   */

  /** @type {Props} */
  let { photo_ids = $bindable([]) } = $props();

  const deleted_photo_ids = getContext("deleted_photo_ids");

  let is_prompting = $state(false);
  let is_fullscreen = $state(false);
  let is_deleting_photo = $state(false);
  /** @type {TaskPhoto?} */
  let selected_photo = $state(null);

  /** @type {TaskPhoto[]} */
  let photos = $state([]);
  let is_loading = $state(false);

  // Load photos when photo_ids change
  $effect(() => {
    if (photo_ids?.length) {
      loadPhotos();
    } else {
      photos = [];
    }
  });

  onMount(() => {
    const token = backHandler.register(() => {
      if (is_prompting) {
        is_prompting = false;
        return true;
      }

      if (is_fullscreen) {
        is_fullscreen = false;
        return true;
      }

      return false;
    }, 500);

    return () => backHandler.unregister(token);
  });

  async function loadPhotos() {
    if (!photo_ids?.length) return;
    is_loading = true;
    photos = await Photos.loadPhotos(photo_ids);
    is_loading = false;
  }

  async function openPhotosPrompt() {
    is_prompting = true;
  }

  /**
   * @param {CameraSource} source
   */
  async function addPhoto(source) {
    is_prompting = false;
    is_loading = true;
    const photo = await Photos.addPhoto(source);
    is_loading = false;

    if (!photo) return;

    if (!photo_ids) photo_ids = [];
    photo_ids = [...photo_ids, photo.id];
    photos = [...photos, photo];
  }

  /**
   * @param {TaskPhoto} photo
   */
  async function askToDeletePhoto(photo) {
    is_deleting_photo = true;

    selected_photo = photo;
  }

  async function removePhoto() {
    if (!selected_photo) return;

    // Remove from array
    photo_ids = photo_ids?.filter((id) => id !== selected_photo?.id) || [];
    photos = photos.filter((p) => p.id !== selected_photo?.id);

    // Delete the file
    deleted_photo_ids.add(selected_photo.id);
    selected_photo = null;

    is_deleting_photo = false;
  }

  /**
   * Open photo in full screen
   * @param {TaskPhoto} photo
   */
  function viewPhoto(photo) {
    selected_photo = photo;
    is_fullscreen = true;
  }
</script>

<div>
  <!-- Add Photo Button -->
  {#if photos.length < 3}
    <button
      type="button"
      onclick={openPhotosPrompt}
      disabled={is_loading}
      class="absolute z-2 bottom-4 left-4 flex justify-center bg-card items-center aspect-square rounded-full h-13 w-13 p-3 disabled:opacity-50"
    >
      <Camera />
    </button>
  {/if}

  <!-- Photos Grid -->
  {#if !!photos.length}
    <div class="grid grid-cols-3 gap-2 mt-4">
      {#each photos as photo (photo.id)}
        <div class="relative group aspect-square">
          <button
            type="button"
            onclick={() => viewPhoto(photo)}
            class="w-full h-full rounded-lg overflow-hidden bg-card border border-line"
          >
            <img src={photo.webview_path} alt="Attachment" class="w-full h-full object-cover" />
          </button>

          <!-- Delete button -->
          <button
            type="button"
            onclick={() => askToDeletePhoto(photo)}
            class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
            aria-label={t("delete_photo")}
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if is_prompting}
  <button
    class="fixed h-screen w-screen inset-0 bg-black/20 z-9"
    type="button"
    aria-label={t("close")}
    onclick={() => {
      is_prompting = false;
    }}
  ></button>

  <div transition:slide class="fixed bottom-0 left-0 right-0 bg-page z-10 p-2 space-y-2 border-t border-default">
    <h2 class="font-bold text-lg">{t("add_photo")}</h2>
    <button
      type="button"
      onclick={() => addPhoto(CameraSource.Photos)}
      disabled={is_loading}
      class="flex h-12 items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 w-full justify-center bg-card border border-default"
    >
      <Gallery />
      <span>{t("gallery")}</span>
    </button>
    <button
      type="button"
      onclick={() => addPhoto(CameraSource.Camera)}
      disabled={is_loading}
      class="flex h-12 items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 w-full justify-center bg-card border border-default"
    >
      <Camera />
      <span>{t("take_photo")}</span>
    </button>
  </div>
{/if}

{#if is_fullscreen}
  <div
    class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    role="button"
    tabindex="0"
    onclick={() => (is_fullscreen = false)}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        is_fullscreen = false;
        selected_photo = null;
      }
    }}
  >
    <div role="button" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <img src={selected_photo?.webview_path || ""} alt="" class="max-w-full max-h-full object-contain" />
    </div>

    <button
      class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center"
      type="button"
      aria-label={t("close")}
      onclick={() => {
        is_fullscreen = false;
        selected_photo = null;
      }}
    >
      ✕
    </button>
  </div>
{/if}

<Modal bind:is_open={is_deleting_photo}>
  <h2 class="font-bold text-lg">{t("delete_photo")}</h2>
  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md" onclick={removePhoto}>
    <Trash class="h-full" size={18} />
    <span>{t("delete")}</span>
  </button>
</Modal>
