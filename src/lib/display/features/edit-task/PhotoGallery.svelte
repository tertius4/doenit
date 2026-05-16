<script>
  import { backHandler } from "$logic/navigation";
  import t from "$display/translate";
  import { CameraSource } from "@capacitor/camera";
  import Icon from "$display/comps/Icon.svelte";
  import { slide } from "svelte/transition";
  import { onMount } from "svelte";
  import Photos from "$services/photos.svelte";
  import Modal, { ModalHeader } from "$display/comps/modal";
  import toast from "$display/toast/toast.svelte";
  import Drawer from "$display/comps/Drawer.svelte";

  /**
   * @typedef {Object} Props
   * @property {string[]} [photo_ids]
   */

  /** @type {Props} */
  let { photo_ids = $bindable([]) } = $props();

  let is_prompting = $state(false);
  let is_fullscreen = $state(false);
  let is_deleting_photo = $state(false);
  let is_loading = $state(false);

  /** @type {AL.TaskPhoto?} */
  let selected_photo = $state(null);

  /** @type {AL.TaskPhoto[]} */
  let photos = $state([]);

  // Load photos when photo_ids change
  $effect(() => {
    if (photo_ids?.length) {
      loadPhotos();
    } else {
      photos = [];
    }
  });

  onMount(async () => {
    const { defineCustomElements } = await import("@ionic/pwa-elements/loader");
    defineCustomElements(window);
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
    const result = await Photos.loadPhotos(photo_ids);
    if (!result.ok) {
      is_loading = false;
      return;
    }

    photos = result.value;
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
    const result = await Photos.addPhoto(source);
    if (!result.ok) {
      toast.error(result.error);
      is_loading = false;
      return;
    }

    is_loading = false;

    const photo = result.value;

    if (!photo_ids) photo_ids = [];
    photo_ids = [...photo_ids, photo.id];
    photos = [...photos, photo];
  }

  /**
   * @param {AL.TaskPhoto} photo
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

    selected_photo = null;

    is_deleting_photo = false;
  }

  /**
   * Open photo in full screen
   * @param {AL.TaskPhoto} photo
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
      class="flex justify-center bg-card items-center aspect-square rounded-full size-13 p-3 disabled:opacity-50"
    >
      <Icon name="camera" />
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
            class="w-full h-full rounded-lg overflow-hidden bg-card border border-default border-line"
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
            <Icon name="times" class="w-4 h-4" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if is_prompting}
  <Drawer is_open={is_prompting} onclose={() => (is_prompting = false)}>
    <div class="max-w-250 mx-auto space-y-2 p-4">
      <h2 class="font-bold text-lg">{t("add_photo")}</h2>
      <div class="flex gap-4">
        <button
          type="button"
          onclick={() => addPhoto(CameraSource.Photos)}
          disabled={is_loading}
          class="flex h-12 items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 w-full justify-center bg-card border border-default"
        >
          <Icon name="gallery" />
          <span class="font-medium">{t("gallery")}</span>
        </button>
        <button
          type="button"
          onclick={() => addPhoto(CameraSource.Camera)}
          disabled={is_loading}
          class="flex h-12 items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 w-full justify-center bg-card border border-default"
        >
          <Icon name="camera" />
          <span class="font-medium">{t("take_photo")}</span>
        </button>
      </div>
    </div>
  </Drawer>
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

<Modal bind:is_open={is_deleting_photo} class="max-w-80! *:space-y-4">
  <ModalHeader>{t("delete_photo")}?</ModalHeader>
  <button class="bg-error flex gap-1 items-center text-alt ml-auto px-4 py-2 rounded-md" onclick={removePhoto}>
    <Icon name="trash" class="h-full" />
    <span>{t("delete")}</span>
  </button>
</Modal>
