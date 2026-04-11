import { SocialLogin } from "@capgo/capacitor-social-login";

class SocialLoginService {
  async initialize(options: { web_client_id: string; ios_client_id?: string }): AsyncResult {
    try {
      await SocialLogin.initialize({
        google: {
          webClientId: options.web_client_id,
          ...(options.ios_client_id ? { iOSClientId: options.ios_client_id } : {}),
        },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
    }
  }

  async signInWithGoogle(): AsyncResult<AL.GoogleUserProfile> {
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
    } catch (error: any) {
      const message: string = error?.message ?? JSON.stringify(error);
      if (/cancel|dismiss|closed/i.test(message)) {
        return { ok: false, error: "USER_CANCELED" };
      }
      return { ok: false, error: message };
    }
  }

  async signOut(): AsyncResult {
    try {
      await SocialLogin.logout({ provider: "google" });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
    }
  }

  async isSignedIn(): AsyncResult<boolean> {
    try {
      const { isLoggedIn } = await SocialLogin.isLoggedIn({ provider: "google" });
      return { ok: true, value: isLoggedIn };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
    }
  }
}

const auth = new SocialLoginService();
export default auth;
