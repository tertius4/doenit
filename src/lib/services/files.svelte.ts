import { FirebaseStorage } from "@capacitor-firebase/storage";
import { Filesystem, Directory } from "@capacitor/filesystem";

class Files {
  static async upload(path: string, blob: Blob): Promise<SimpleResult> {
    try {
      // For mobile (Android/iOS), we need to save blob to a temporary file first
      // and use the URI, not the blob directly
      const tempFileName = `temp_upload_${Date.now()}_${path.split("/").pop()}`;

      // Convert Blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write blob to temporary file
      const writeResult = await Filesystem.writeFile({
        path: tempFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Upload using the file URI
      await FirebaseStorage.uploadFile(
        {
          path: path,
          uri: writeResult.uri,
          metadata: {
            contentType: blob.type || "application/octet-stream",
            cacheControl: "public, max-age=31536000",
          },
        },
        () => {}
      );

      // Clean up temporary file
      await Filesystem.deleteFile({
        path: tempFileName,
        directory: Directory.Cache,
      });

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
      await FirebaseStorage.deleteFile({ path });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Delete failed";
      console.error(`Delete failed: ${errorMessage}`);
      return false;
    }
  }
}

export default Files;
