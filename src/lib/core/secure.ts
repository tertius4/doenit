import { user } from "$lib/base/user.svelte";
import { PUBLIC_ENCRYPTION_KEY } from "$env/static/public";

export class Secure {
  /**
   * Get encryption key based on category ID for shared categories,
   * or user ID for personal data (like backups)
   */
  private static async getEncryptionKey(category_id?: string, use_legacy = false): Promise<string> {
    // Legacy mode: Use the old PUBLIC_ENCRYPTION_KEY for backward compatibility
    if (use_legacy && PUBLIC_ENCRYPTION_KEY) {
      return PUBLIC_ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32);
    }

    let keySource: string;
    
    if (category_id) {
      // For shared tasks: Use category_id so all collaborators can decrypt
      keySource = category_id;
    } else {
      // For personal data (backups): Use user's UID
      const uid = user.uid;
      if (!uid) {
        throw new Error("User not authenticated - cannot derive encryption key");
      }
      keySource = uid;
    }

    // Derive a consistent 32-character key from the source
    const encoder = new TextEncoder();
    const data = encoder.encode(keySource);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    
    return keyString;
  }
  static async compressAndEncrypt(data: Record<string, any>, category_id?: string): Promise<string | undefined> {
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
      const key = await Secure.deriveKey(category_id, false);

      // Generate a random IV (Initialization Vector)
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data_to_encrypt);

      // Combine version marker (v2), IV and encrypted data, then convert to base64
      // Version marker helps detect which decryption method to use
      const version = new Uint8Array([0x76, 0x32]); // 'v2' in bytes
      const combined = new Uint8Array(version.length + iv.length + encrypted.byteLength);
      combined.set(version);
      combined.set(iv, version.length);
      combined.set(new Uint8Array(encrypted), version.length + iv.length);

      const result = btoa(String.fromCharCode(...combined));
      return result;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie data kompreseer en enkripteer nie: ${error_message}`);
    }
  }

  static async decryptAndDecompress(data: string, category_id?: string): Promise<Record<string, any> | undefined> {
    // Try new format first (with version marker)
    try {
      const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      
      // Check for v2 version marker
      const hasV2Marker = combined.length > 2 && combined[0] === 0x76 && combined[1] === 0x32;
      
      if (hasV2Marker) {
        // New format: version marker (2 bytes) + IV (12 bytes) + encrypted data
        const iv = combined.slice(2, 14);
        const encrypted = combined.slice(14);
        const key = await Secure.deriveKey(category_id, false);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted);
        
        const decoder = new TextDecoder();
        const compressedBase64 = decoder.decode(decrypted);
        const compressed = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));
        const { ungzip } = await import("pako");
        const decompressed = ungzip(compressed, { to: "string" });
        return JSON.parse(decompressed);
      }
    } catch (error) {
      // Fall through to legacy attempt
    }

    // Try legacy format (no version marker, using PUBLIC_ENCRYPTION_KEY)
    try {
      const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      
      // Legacy format: IV (12 bytes) + encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const key = await Secure.deriveKey(undefined, true); // Use legacy key
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted);

      const decoder = new TextDecoder();
      const compressedBase64 = decoder.decode(decrypted);
      const compressed = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));
      const { ungzip } = await import("pako");
      const decompressed = ungzip(compressed, { to: "string" });
      return JSON.parse(decompressed);
    } catch (legacyError) {
      const error_message = legacyError instanceof Error ? legacyError.message : String(legacyError);
      alert(`Fout tydens dekripsie en dekompressie: ${error_message}`);
      return undefined;
    }
  }

  /**
   * Helper to migrate old encrypted data to new format
   * Decrypts with legacy key, re-encrypts with category-based key
   */
  static async migrateEncryptedData(old_encrypted_data: string, category_id: string): Promise<string | undefined> {
    try {
      // Decrypt with legacy key
      const combined = Uint8Array.from(atob(old_encrypted_data), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const legacyKey = await Secure.deriveKey(undefined, true);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, legacyKey, encrypted);

      const decoder = new TextDecoder();
      const compressedBase64 = decoder.decode(decrypted);
      const compressed = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));
      const { ungzip } = await import("pako");
      const decompressed = ungzip(compressed, { to: "string" });
      const data = JSON.parse(decompressed);

      // Re-encrypt with new category-based key
      return await this.compressAndEncrypt(data, category_id);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error("Migration failed:", error_message);
      return undefined;
    }
  }

  /**
   * Helper function to derive a crypto key
   * @param category_id - If provided, uses category_id for shared encryption. Otherwise uses user UID for personal data.
   * @param use_legacy - If true, uses PUBLIC_ENCRYPTION_KEY for backward compatibility
   */
  private static async deriveKey(category_id?: string, use_legacy = false): Promise<CryptoKey> {
    const keyString = await this.getEncryptionKey(category_id, use_legacy);
    const keyData = new TextEncoder().encode(keyString);
    return crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }
}
