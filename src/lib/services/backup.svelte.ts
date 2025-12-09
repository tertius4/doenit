import { cached_automatic_backup, cached_last_backup } from "$lib/cached";
import { t } from "$lib/services/language.svelte";
import Files from "$lib/services/files.svelte";
import * as env from "$env/static/public";
import { OnlineDB } from "$lib/OnlineDB";
import { user } from "$lib/base/user.svelte";
import { Alert } from "$lib/core/alert";
import { DateUtil } from "$lib/core/date_util";
import { DB } from "$lib/DB";

class BackupClass {
  last_backup_at: string = $state(t("never"));
  is_loading: boolean = $state(false);
  #automatic_backup: boolean = $state(false);

  constructor() {
    cached_automatic_backup.get().then((value) => {
      if (value === null) {
        cached_automatic_backup.set(false);
      }

      this.#automatic_backup = value ?? false;
    });
  }

  set automatic_backup(value: boolean) {
    this.#automatic_backup = value;
    cached_automatic_backup.set(value);
    if (value) {
      this.checkLastBackup();
    }
  }

  get automatic_backup(): boolean {
    return this.#automatic_backup;
  }

  init() {
    this.checkLastBackup();
    window.addEventListener("online", async () => {
      this.checkLastBackup();
    });
  }

  async checkLastBackup() {
    this.is_loading = true;

    try {
      const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      let last_backup_str = await cached_last_backup.get();
      if (!last_backup_str) {
        last_backup_str = await this.getLastBackupTime();
      }

      const last_backup_at = last_backup_str ? new Date(last_backup_str) : null;
      this.last_backup_at = last_backup_at ? DateUtil.format(last_backup_at, "ddd, DD MMM YYYY, HH:mm") : t("never");

      // If more than a day ago, create a backup
      const time_diff_ms = last_backup_at ? Date.now() - +last_backup_at : Infinity;
      if (time_diff_ms > BACKUP_INTERVAL) {
        const result = await Backup.createBackup();
        if (!result.success && result.error_message === t("no_changes_since_last_backup")) {
          // If no changes since last backup, just update the last_backup_at
          this.last_backup_at = DateUtil.format(new Date(), "ddd, DD MMM YYYY, HH:mm");
        }
      }
    } catch (error) {
      Alert.error(t("error_checking_last_backup") + " " + error);
    }
    this.is_loading = false;
  }

  async populateLastBackupTime() {
    const last_backup_str = await this.getLastBackupTime();
    if (last_backup_str) {
      const last_backup_at = new Date(last_backup_str);
      this.last_backup_at = DateUtil.format(last_backup_at, "ddd, DD MMM YYYY, HH:mm");
    } else {
      this.last_backup_at = t("never");
    }
  }

  private async getLastBackupTime(): Promise<string | null> {
    try {
      const user_id = user.uid;
      if (!user_id) return null;

      const [backup] = await OnlineDB.BackupManifest.getAll({
        filters: [{ field: "user_id", operator: "==", value: user_id }],
        sort: [{ field: "timestamp", direction: "desc" }],
        limit: 1,
      }).catch(() => []);

      if (!backup) {
        await cached_last_backup.set(null);
        return null;
      }

      await cached_last_backup.set(backup.timestamp);
      return backup.timestamp;
    } catch (error) {
      Alert.error(t("error_fetching_last_backup_time") + " " + error);
      return null;
    }
  }

  async createBackup(): Promise<SimpleResult> {
    try {
      this.is_loading = true;

      const user_id = user.uid;
      if (!user_id) throw Error(t("user_not_logged_in"));

      const tasks = await DB.Task.getAll({
        selector: { archived: { $ne: true } },
        sort: [{ created_at: "desc" }],
      });
      const categories = await DB.Category.getAll({
        selector: { archived: { $ne: true } },
        sort: [{ created_at: "desc" }],
      });
      const users = await DB.User.getAll({
        sort: [{ created_at: "desc" }],
      });

      const encrypted_data = await this.compressAndEncrypt({ tasks, categories, users });
      const encrypted_blob = new Blob([encrypted_data], { type: "application/octet-stream" });
      const sha256 = await this.sha256FromJson({ tasks, categories, users });

      const existing_backups = await OnlineDB.BackupManifest.getAll({
        filters: [
          { field: "user_id", operator: "==", value: user_id },
          { field: "sha256", operator: "==", value: sha256 },
        ],
      }).catch(() => []);
      if (!existing_backups.length) {
        throw Error(t("no_changes_since_last_backup"));
      }

      // Max 3 backups per user
      const user_backups = await OnlineDB.BackupManifest.getAll({
        filters: [{ field: "user_id", operator: "==", value: user_id }],
        sort: [{ field: "timestamp", direction: "desc" }],
      }).catch(() => []);
      for (let i = 2; i < user_backups.length; i++) {
        const backup_to_delete = user_backups[i];
        await OnlineDB.BackupManifest.delete(backup_to_delete.id);
        await Files.delete(backup_to_delete.file_path);
      }

      const file_path = `users/${user_id}/snapshots/${new Date().toISOString()}.bin`;
      const uploadResult = await Files.upload(file_path, encrypted_blob);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error_message || t("file_upload_failed"));
      }

      await OnlineDB.BackupManifest.create({
        sha256,
        file_path: file_path,
        timestamp: new Date().toISOString(),
        user_id,
        size: encrypted_blob.size,
      });

      await cached_last_backup.set(new Date().toISOString());
      this.last_backup_at = DateUtil.format(new Date(), "ddd, DD MMM YYYY, HH:mm");
      this.is_loading = false;
      return { success: true };
    } catch (error) {
      this.is_loading = false;
      const error_message = error instanceof Error ? error.message : String(error);
      return { success: false, error_message };
    }
  }

  async restoreBackup(manifest: BackupManifest): Promise<SimpleResult> {
    this.is_loading = true;

    try {
      if (!manifest) {
        throw new Error(t("no_backup_data_found"));
      }

      const blob = await Files.download(manifest.file_path);
      const encrypted_data = await blob.text();
      if (!encrypted_data) {
        throw new Error(t("failed_to_read_backup_data"));
      }

      const data = await this.decryptAndDecompress(encrypted_data);
      if (!data.tasks || !data.categories) {
        throw new Error(t("invalid_backup_data_format"));
      }

      // Clear data.
      await DB.Task.clear();
      await DB.Category.clear();
      await DB.User.clear();

      // Restore data.
      await DB.Task.createMany(data.tasks);
      await DB.Category.createMany(data.categories);
      await DB.User.createMany(data.users);

      this.is_loading = false;

      return { success: true };
    } catch (error) {
      this.is_loading = false;
      const error_message = error instanceof Error ? error.message : String(error);
      return { success: false, error_message };
    }
  }

  async getBackup(): Promise<Result<BackupManifest>> {
    try {
      const user_id = user.uid;
      if (!user_id) return { success: false, error_message: t("user_not_logged_in") };

      const backup_manifests = await OnlineDB.BackupManifest.getAll({
        filters: [{ field: "user_id", operator: "==", value: user_id }],
        sort: [{ field: "timestamp", direction: "desc" }],
      }).catch(() => []);

      return { success: true, data: backup_manifests[0] };
    } catch (error) {
      console.error(t("listing_backups_failed"), error);
      return { success: false, error_message: (error as Error).message || t("something_went_wrong") };
    }
  }

  private async compressAndEncrypt(data: any): Promise<string> {
    try {
      const { gzip } = await import("pako");

      // Convert data to JSON string
      const jsonString = JSON.stringify(data);

      // Compress the data
      const compressed = gzip(jsonString);

      // Convert compressed data to base64
      const compressedBase64 = btoa(String.fromCharCode(...compressed));
      const data_to_encrypt = new TextEncoder().encode(compressedBase64);

      // Encrypt the compressed data using Web Crypto API
      const key = await this.deriveKey();

      // Generate a random IV (Initialization Vector)
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data_to_encrypt);

      // Combine IV and encrypted data, then convert to base64
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      const result = btoa(String.fromCharCode(...combined));

      return result;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      throw new Error(`${t("failed_to_compress_encrypt")}: ${error_message}`);
    }
  }

  private async decryptAndDecompress(encryptedData: string): Promise<any> {
    try {
      // Convert base64 back to buffer
      const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt the data
      const key = await this.deriveKey();
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted);

      // Convert decrypted data back to string
      const decoder = new TextDecoder();
      const compressedBase64 = decoder.decode(decrypted);

      // Convert base64 back to buffer
      const compressed = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));

      // Decompress the data
      const { ungzip } = await import("pako");
      const decompressed = ungzip(compressed, { to: "string" });

      // Parse JSON and return
      const result = JSON.parse(decompressed);
      return result;
    } catch (error) {
      console.error(t("error_decrypting_decompressing"), error);
      throw new Error(t("error_during_decryption_decompression") + " " + (error as Error).message);
    }
  }

  /**
   * Helper function to derive a crypto key from string
   */
  private async deriveKey(): Promise<CryptoKey> {
    const keyString = `${env.PUBLIC_ENCRYPTION_KEY || ""}`.padEnd(32, "0").substring(0, 32);
    const keyData = new TextEncoder().encode(keyString);
    return crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }

  private async sha256FromJson(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: "application/json" });
    return this.sha256FromBlob(blob);
  }

  private async sha256FromBlob(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
  }
}

const Backup = new BackupClass();
export default Backup;
