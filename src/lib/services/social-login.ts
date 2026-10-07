import { SocialLogin } from "@capgo/capacitor-social-login";
import { sha256Hex, toBase64Url } from "$lib";

export type SocialProvider = "google" | "apple";

/** Maps plugin/provider cancellations onto the single error the UI already swallows. */
function toError(error: unknown): { ok: false; error: string } {
  const message: string = (error as any)?.message ?? JSON.stringify(error);
  if ((error as any)?.code === "USER_CANCELLED" || /cancel|dismiss|closed/i.test(message)) {
    return { ok: false, error: "USER_CANCELED" };
  }
  return { ok: false, error: message };
}

class SocialLoginService {
  private initialized = false;

  /** Initialises the plugin once; later calls are no-ops. */
  async initialize(options: {
    web_client_id: string;
    ios_client_id?: string;
    apple_client_id?: string;
  }): AsyncResult {
    if (this.initialized) return { ok: true };

    try {
      await SocialLogin.initialize({
        google: {
          webClientId: options.web_client_id,
          ...(options.ios_client_id ? { iOSClientId: options.ios_client_id } : {}),
        },
        ...(options.apple_client_id ? { apple: { clientId: options.apple_client_id } } : {}),
      });
      this.initialized = true;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
    }
  }

  async signInWithGoogle(): AsyncResult<AL.SocialUserProfile> {
    try {
      const { result } = await SocialLogin.login({
        provider: "google",
        options: { scopes: ["email", "profile"] },
      });

      if (result.responseType !== "online") {
        return { ok: false, error: "Unexpected offline response from Google sign-in" };
      }

      if (!result.profile) {
        return { ok: false, error: "Google sign-in did not return a user profile" };
      }

      // Null checks for optional fields
      if (!result.profile.id || !result.profile.name || !result.profile.email) {
        return { ok: false, error: "Google profile is missing required fields" };
      }

      return {
        ok: true,
        value: {
          id: result.profile.id,
          name: result.profile.name,
          email: result.profile.email,
          avatar: result.profile.imageUrl ?? undefined,
          id_token: result.idToken ?? undefined,
          access_token: result.accessToken?.token ?? undefined,
        },
      };
    } catch (error) {
      return toError(error);
    }
  }

  /**
   * Apple only returns the user's name on the very first sign-in, and returns a
   * `@privaterelay.appleid.com` address when the user hides their email - so neither field
   * is required here. The caller keeps whatever it already stored.
   *
   * The plugin passes `nonce` to Apple verbatim, while Firebase hashes the `rawNonce` it is
   * given and compares it against the token's claim. Apple therefore gets the hash and
   * Firebase gets the raw value; swapping them yields `auth/invalid-credential`.
   */
  async signInWithApple(): AsyncResult<AL.SocialUserProfile> {
    try {
      const raw_nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

      const { result } = await SocialLogin.login({
        provider: "apple",
        options: { scopes: ["email", "name"], nonce: await sha256Hex(raw_nonce) },
      });

      if (!result.idToken) return { ok: false, error: "Apple sign-in did not return an identity token" };

      const given = result.profile?.givenName ?? "";
      const family = result.profile?.familyName ?? "";
      const name = `${given} ${family}`.trim();

      return {
        ok: true,
        value: {
          id: result.profile?.user || "",
          name: name || undefined,
          email: result.profile?.email ?? undefined,
          id_token: result.idToken,
          raw_nonce,
        },
      };
    } catch (error) {
      return toError(error);
    }
  }

  async signOut(provider: SocialProvider = "google"): AsyncResult {
    try {
      await SocialLogin.logout({ provider });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
    }
  }

  async isSignedIn(provider: SocialProvider = "google"): AsyncResult<boolean> {
    try {
      const { isLoggedIn } = await SocialLogin.isLoggedIn({ provider });
      return { ok: true, value: isLoggedIn };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
    }
  }
}

const auth = new SocialLoginService();
export default auth;
