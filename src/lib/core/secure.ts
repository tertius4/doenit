import * as env from "$env/static/public";

export class Secure {
  static async compressAndEncrypt(data: Record<string, any>): Promise<string | undefined> {
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
      const key = await Secure.deriveKey();

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
      alert(`Kon nie data kompreseer en enkripteer nie: ${error_message}`);
    }
  }

  static async decryptAndDecompress(data: string): Promise<Record<string, any> | undefined> {
    try {
      // Convert base64 back to buffer
      const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt the data
      const key = await Secure.deriveKey();
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
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Fout tydens dekripsie en dekompressie: ${error_message}`);
    }
  }

  /**
   * Helper function to derive a crypto key from string
   */
  private static async deriveKey(): Promise<CryptoKey> {
    const keyString = `${env.PUBLIC_ENCRYPTION_KEY || ""}`.padEnd(32, "0").substring(0, 32);
    const keyData = new TextEncoder().encode(keyString);
    return crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }
}
