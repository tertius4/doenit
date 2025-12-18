import { deleteObject, getStorage, ref, uploadBytes } from "firebase/storage";
import { FirebaseStorage } from "@capacitor-firebase/storage";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { getApp, initializeApp } from "$lib/chunk/firebase-app";
import { APP_NAME, FIREBASE_CONFIG } from "$lib";

class Files {
  static async upload(path: string, blob: Blob): Promise<SimpleResult> {
    try {
      const storage = Files.getFirebaseStorage();
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, blob);

      return { success: true };
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      return { success: false, error_message };
    }
  }

  /**
   * For some reason the Firebase SDK download method does not work on mobile.
   * This method uses Capacitor's Firebase Storage plugin to get a download URL,
   * then downloads the file using Capacitor's Filesystem plugin into a temporary file
   * Reads the file as base64, converts it to a Blob, then deletes the temporary file.
   * @param {string} path
   * @returns {Promise<Blob>}
   */
  static async download(path: string): Promise<Blob> {
    try {
      const url_result = await FirebaseStorage.getDownloadUrl({ path: path });
      if (!url_result.downloadUrl) {
        throw new Error("No download URL found");
      }

      const directory = Directory.Cache;
      const url = url_result.downloadUrl;

      path = `temp_${Date.now()}_${path.split("/").pop()}`;
      await Filesystem.downloadFile({ url, path, directory });
      const fileResult = await Filesystem.readFile({ path, directory });
      await Filesystem.deleteFile({ path, directory });

      const base64Data = fileResult.data as string;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Download failed";
      console.error(`Download failed: ${errorMessage}`);
      throw new Error(`Download failed: ${errorMessage}`);
    }
  }

  static async delete(path: string): Promise<boolean> {
    try {
      const storage = Files.getFirebaseStorage();
      const storageRef = ref(storage, path);

      await deleteObject(storageRef);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Delete failed";
      console.error(`Delete failed: ${errorMessage}`);
      return false;
    }
  }

  private static getFirebaseStorage() {
    let app;

    try {
      app = getApp(APP_NAME);
    } catch {
      app = initializeApp(FIREBASE_CONFIG, APP_NAME);
    }

    return getStorage(app, "doenitdb");
  }
}

export default Files;
