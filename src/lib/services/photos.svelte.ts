import { Camera, CameraResultType, CameraSource, type Photo } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { alert } from "$lib/core/alert";
import t from "$display/translate";
import { DateUtil } from "$lib/core/date_util";

class PhotoService {
  readonly PHOTOS_ENABLED: boolean = true;

  private is_dir_created = false;

  /**
   * Ensure the photo directory exists
   */
  private async ensureDirectory(): Promise<void> {
    if (this.is_dir_created) return;

    try {
      await Filesystem.mkdir({
        path: "doenit_photos",
        directory: Directory.Data,
        recursive: true,
      });
      this.is_dir_created = true;
    } catch (error: any) {
      // Directory might already exist
      if (error?.message?.includes("exists")) {
        this.is_dir_created = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Take or select a photo
   * @param source - Camera or gallery
   */
  async addPhoto(source: CameraSource = CameraSource.Prompt): Promise<TaskPhoto | null> {
    if (!this.PHOTOS_ENABLED) return null;

    try {
      if (!Capacitor.isNativePlatform()) {
        alert.info(t("photos_not_supported_web"));
        return null;
      }

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
        return null;
      }

      alert.error(t("error_adding_photo") + " " + error.message);
      return null;
    }
  }

  /**
   * Save photo to filesystem
   */
  private async savePhoto(photo: Photo): Promise<TaskPhoto> {
    if (!photo.base64String) throw new Error(t("no_photo_data"));

    await this.ensureDirectory();

    const timestamp = DateUtil.format(new Date(), "YYYY-MM-DD_HHmmss");
    const filename = `${timestamp}.${photo.format}`;

    const saved_file = await Filesystem.writeFile({
      path: `doenit_photos/${filename}`,
      data: photo.base64String,
      directory: Directory.Data,
    });

    const webview_path = Capacitor.convertFileSrc(saved_file.uri);

    return { id: filename, filepath: saved_file.uri, webview_path };
  }

  /**
   * Load a photo from filesystem
   */
  async loadPhoto(photo_id: string): Promise<TaskPhoto | null> {
    try {
      if (!this.PHOTOS_ENABLED) throw new Error("Photos are not enabled");

      // Get the full URI for the file
      const file_uri = await Filesystem.getUri({
        path: `doenit_photos/${photo_id}`,
        directory: Directory.Data,
      });

      // Convert to webview path for display
      const webview_path = Capacitor.convertFileSrc(file_uri.uri);

      return { id: photo_id, filepath: file_uri.uri, webview_path };
    } catch (error) {
      console.error("Fout met laai van die foto:", error);
      return null;
    }
  }

  /**
   * Load multiple photos
   */
  async loadPhotos(photo_ids: string[]): Promise<TaskPhoto[]> {
    if (!this.PHOTOS_ENABLED) throw new Error("Photos are not enabled");

    const all_photos = await Promise.all(photo_ids.map((id) => this.loadPhoto(id)));

    const photos: TaskPhoto[] = [];
    for (let i = 0; i < all_photos.length; i++) {
      const photo = all_photos[i];
      if (photo) photos.push(photo);
    }

    return photos;
  }
  /**
   * Delete a photo from filesystem
   */
  async deletePhoto(photo_id: string): Promise<boolean> {
    try {
      if (!this.PHOTOS_ENABLED) throw new Error("Photos are not enabled");

      await Filesystem.deleteFile({
        path: `doenit_photos/${photo_id}`,
        directory: Directory.Data,
      });

      return true;
    } catch (error) {
      console.error("Error deleting photo:", error);
      return false;
    }
  }

  /**
   * Delete multiple photos
   */
  async deletePhotos(photo_ids: string[]): Promise<void> {
    await Promise.all(photo_ids.map((id) => this.deletePhoto(id)));
  }

  /**
   * Cleanup orphaned photos (photos not referenced by any task)
   * Should be called periodically
   */
  async cleanupOrphanedPhotos(photo_ids: string[]): Promise<void> {
    try {
      if (!this.PHOTOS_ENABLED) throw new Error("Photos are not enabled");

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
        await this.deletePhotos(orphaned_ids);
        console.log(`Het ${orphaned_ids.length} wees-foto's skoongemaak.`);
      }
    } catch (error) {
      console.error("Fout tydens wees-foto skoonmaak:", error);
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

export const Photos = new PhotoService();
