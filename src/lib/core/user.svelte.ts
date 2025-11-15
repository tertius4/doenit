import { PUBLIC_ADMIN_EMAILS, PUBLIC_GOOGLE_AUTH } from "$env/static/public";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { getApp, initializeApp } from "$lib/chunk/firebase-app";
import { APP_NAME, FIREBASE_CONFIG, normalize } from "$lib";
import { billing } from "$lib/services/billing.svelte";
import { t } from "$lib/services/language.svelte";
import { Capacitor } from "@capacitor/core";
import { Value } from "$lib/utils.svelte";
import {
  getAuth,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";

class User {
  private _user = $state() as FirebaseUser;
  private _message_token: string | null = $state(null);

  readonly is_logged_in = $derived(!!this._user);
  readonly is_vip = $derived(this.is_logged_in && PUBLIC_ADMIN_EMAILS.includes(this._user?.email || ""));
  readonly is_plus_user = $derived(this.is_logged_in && billing.is_plus_user);

  readonly is_friends_enabled: boolean = $derived(this.is_vip || this.is_plus_user);
  readonly is_backup_enabled: boolean = $derived(this.is_vip || this.is_plus_user);

  constructor(user: FirebaseUser) {
    this._user = user;
  }

  get name(): string {
    return this._user.displayName || this._user.email || "";
  }

  get email(): string {
    return normalize(this._user.email ?? "");
  }

  get id_token() {
    return this._user.getIdToken();
  }

  get avatar(): string {
    return this._user.photoURL ?? "";
  }

  get uid(): string {
    return this._user.uid ?? "";
  }

  get message_token(): string | null {
    return this._message_token;
  }

  set message_token(token: string | null) {
    if (token === this._message_token) return;

    this._message_token = token;
  }
}

const UserValue = new Value<User>();
UserValue.is_loading = true;

export default UserValue;

initializeUser();
function initializeUser() {
  try {
    const app = initializeApp(FIREBASE_CONFIG, APP_NAME);
    if (Capacitor.isNativePlatform()) {
      const auth = getAuth(app);
      auth.onAuthStateChanged((user) => {
        if (!user) {
          UserValue.value = null;
        } else {
          UserValue.value = new User(user);
        }

        UserValue.is_loading = false;
      });
    }
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    console.error(`Fout met gebruikersinitialisering: ${error_message}`);
  }
}

export async function signIn(): Promise<SimpleResult> {
  try {
    if (!Capacitor.isNativePlatform()) {
      // @ts-ignore
      this.user = {
        displayName: "John Doe",
        email: "john.doe@example.com",
        photoURL: "https://i.pravatar.cc/300",
      };
      return { success: true };
    }

    await GoogleAuth.initialize({ clientId: PUBLIC_GOOGLE_AUTH });
    const gu = await GoogleAuth.signIn();
    if (!gu) throw new Error(t("sign_in_error_no_user"));

    if (!gu.authentication) {
      throw new Error(t("sign_in_error_no_auth"));
    }

    const id_token = gu.authentication.idToken;
    if (!id_token) throw new Error(t("sign_in_error_no_idtoken"));

    const credential = GoogleAuthProvider.credential(id_token);
    const auth = getAuth(getApp(APP_NAME));
    await signInWithCredential(auth, credential);

    return { success: true };
  } catch (error) {
    const error_message = error instanceof Error ? error.message : JSON.stringify(error);
    if (error_message === "The user canceled the sign-in flow.") {
      return { success: false, error_message: "USER_CANCELED" };
    }

    return { success: false, error_message: `${t("google_verification_failed")}: ${error_message}` };
  }
}

export async function signOut(): Promise<SimpleResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      await firebaseSignOut(getAuth(getApp(APP_NAME)));
      await GoogleAuth.initialize({ clientId: PUBLIC_GOOGLE_AUTH });
      await GoogleAuth.signOut();
    }
    UserValue.value = null;
    return { success: true };
  } catch (error) {
    return { success: false, error_message: `Sign-out error: ${error || JSON.stringify(error)}` };
  }
}
