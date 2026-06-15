import { Camera, type MediaResult, type TakePhotoOptions } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { config } from "$lib/config";
import t from "$display/translate";

const PHOTO_DIR = "doenit_photos";

const PHOTO_OPTIONS: TakePhotoOptions = {
  quality: 30,
  targetWidth: 1024,
  targetHeight: 1024,
  correctOrientation: true,

  encodingType: 0,
  webUseInput: true,
  saveToGallery: true,
  includeMetadata: true,
};

class PhotoService {
  /**
   * Ensure the photo directory exists
   */
  private async ensureDirectory(): AsyncResult {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      await Filesystem.mkdir({
        path: "doenit_photos",
        directory: Directory.Data,
        recursive: true,
      });

      return { ok: true };
    } catch (error: any) {
      const exists = error?.message?.includes("exist");
      if (!exists) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        return { ok: false, error: message };
      }

      return { ok: true };
    }
  }

  async takePhoto(): AsyncResult<AL.TaskPhoto> {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      const photo = await Camera.takePhoto(PHOTO_OPTIONS);
      if (!photo?.webPath) return { ok: false, error: t("no_photo_data") };

      return await this.savePhoto(photo);
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes("cancel")) {
        return {
          ok: false,
          error: t("user_cancelled"),
        };
      }

      return {
        ok: false,
        error: error?.message ?? "Unknown error",
      };
    }
  }

  async choosePhoto(): AsyncResult<AL.TaskPhoto> {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      const result = await Camera.chooseFromGallery({ ...PHOTO_OPTIONS, limit: 1 });
      const photo = result.results[0];
      if (!photo?.webPath) return { ok: false, error: t("no_photo_data") };

      return await this.savePhoto(photo);
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes("cancel")) {
        return {
          ok: false,
          error: t("user_cancelled"),
        };
      }

      return {
        ok: false,
        error: error?.message ?? "Unknown error",
      };
    }
  }

  /**
   * Save photo to filesystem
   */
  private async savePhoto(photo: MediaResult): AsyncResult<AL.TaskPhoto> {
    if (!photo.thumbnail) return { ok: false, error: t("no_photo_data") };

    try {
      const dir = await this.ensureDirectory();
      if (!dir.ok) return dir;

      const ext = photo.metadata?.format ?? "jpeg";
      const filename = `${Date.now()}.${ext}`;

      await Filesystem.writeFile({
        path: `${PHOTO_DIR}/${filename}`,
        data: photo.thumbnail,
        directory: Directory.Data,
      });

      const file = await Filesystem.getUri({
        path: `${PHOTO_DIR}/${filename}`,
        directory: Directory.Data,
      });

      return {
        ok: true,
        value: {
          id: filename,
          filepath: file.uri,
          webview_path: Capacitor.convertFileSrc(file.uri),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      };
    }
  }

  /**
   * Load a photo from filesystem
   */
  async loadPhoto(photo_id: string): AsyncResult<AL.TaskPhoto> {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      let filepath: string;
      let webview_path: string;

      if (Capacitor.isNativePlatform()) {
        const file_uri = await Filesystem.getUri({
          path: `doenit_photos/${photo_id}`,
          directory: Directory.Data,
        });
        filepath = file_uri.uri;
        webview_path = Capacitor.convertFileSrc(filepath);
      } else {
        const file = await Filesystem.readFile({
          path: `doenit_photos/${photo_id}`,
          directory: Directory.Data,
        });
        const ext = photo_id.split(".").pop() ?? "jpeg";
        filepath = `doenit_photos/${photo_id}`;
        webview_path = `data:image/${ext};base64,${file.data}`;
      }

      return { ok: true, value: { id: photo_id, filepath, webview_path } };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  /**
   * Load multiple photos
   */
  async loadPhotos(photo_ids: string[]): AsyncResult<AL.TaskPhoto[]> {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    const all_photos = await Promise.all(photo_ids.map((id) => this.loadPhoto(id)));

    const photos: AL.TaskPhoto[] = [];
    for (let i = 0; i < all_photos.length; i++) {
      const photo = all_photos[i];
      if (photo.ok) photos.push(photo.value);
    }

    return { ok: true, value: photos };
  }
  /**
   * Delete a photo from filesystem
   */
  async deletePhoto(photo_id: string): AsyncResult {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      await Filesystem.deleteFile({
        path: `doenit_photos/${photo_id}`,
        directory: Directory.Data,
      });

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  /**
   * Delete multiple photos
   */
  async deletePhotos(photo_ids: string[]): AsyncResult {
    const results = await Promise.all(photo_ids.map((id) => this.deletePhoto(id)));
    const errors = results.filter((r) => !r.ok).map((r) => r.error);
    if (errors.length) return { ok: false, error: errors.join(", ") };
    return { ok: true };
  }

  /**
   * Cleanup orphaned photos (photos not referenced by any task)
   * Should be called periodically
   */
  async cleanupOrphanedPhotos(photo_ids: string[]): AsyncResult {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      const all_photo_ids = await this.getAllPhotoIds();
      const active = new Set(photo_ids);
      const orphaned_ids = all_photo_ids.filter((id) => !active.has(id));
      if (!!orphaned_ids.length) {
        const result = await this.deletePhotos(orphaned_ids);
        if (!result.ok) {
          const message = result.error || "Unknown error";
          return { ok: false, error: message };
        }
      }

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }

  /**
   * Get all photo files in the directory
   */
  private async getAllPhotoIds(): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        path: "doenit_photos",
        directory: Directory.Data,
      });
      return result.files.map((f) => f.name);
    } catch (error) {
      return [];
    }
  }
}

const photos = new PhotoService();
export default photos;
