import photos from "$lib/services/photos.svelte";

class TempMediaManager {
  private tempFiles = new Set<string>();

  async registerTemp(file_id: string) {
    this.tempFiles.add(file_id);
  }

  async commit(used_file_ids: string[] = []) {
    const unused_files = Array.from(this.tempFiles).filter((id) => !used_file_ids.includes(id));
    photos.deletePhotos(unused_files);

    this.tempFiles.clear();
  }

  async discardAll() {
    photos.deletePhotos(Array.from(this.tempFiles));

    this.tempFiles.clear();
  }
}

export const tempMediaManager = new TempMediaManager();