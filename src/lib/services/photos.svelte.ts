import { Camera, CameraResultType, CameraSource, type Photo } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import DateUtil from "$display/date-util";
import { config } from "$lib/config";
import t from "$display/translate";

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

  /**
   * Take or select a photo
   * @param source - Camera or gallery
   */
  async addPhoto(source: CameraSource = CameraSource.Prompt): AsyncResult<AL.TaskPhoto> {
    if (!config.photos_enabled) return { ok: false, error: "Photos are not enabled" };

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: source,
        quality: 80,
        width: 1920,
        height: 1920,
        correctOrientation: true,
      });

      return await this.savePhoto(photo);
    } catch (error: any) {
      if (error?.message?.includes("User cancelled")) {
        return { ok: false, error: t("user_cancelled") };
      }

      return { ok: false, error: error.message };
    }
  }

  /**
   * Save photo to filesystem
   */
  private async savePhoto(photo: Photo): AsyncResult<AL.TaskPhoto> {
    if (!photo.base64String) return { ok: false, error: t("no_photo_data") };

    const result = await this.ensureDirectory();
    if (!result.ok) return result;

    const timestamp = DateUtil.format(new Date(), "YYYY-MM-DD_HHmmss");
    const filename = `${timestamp}.${photo.format}`;

    const saved_file = await Filesystem.writeFile({
      path: `doenit_photos/${filename}`,
      data: photo.base64String,
      directory: Directory.Data,
    });

    const webview_path = Capacitor.isNativePlatform()
      ? Capacitor.convertFileSrc(saved_file.uri)
      : `data:image/${photo.format};base64,${photo.base64String}`;

    return { ok: true, value: { id: filename, filepath: saved_file.uri, webview_path } };
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
      const orphaned_ids: string[] = [];
      for (let i = 0; i < all_photo_ids.length; i++) {
        const photo_id = all_photo_ids[i];

        let is_orphaned = true;
        for (let j = 0; j < photo_ids.length; j++) {
          if (photo_ids[j] !== photo_id) continue;

          is_orphaned = false;
          break;
        }

        if (!is_orphaned) continue;

        orphaned_ids.push(photo_id);
      }

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
