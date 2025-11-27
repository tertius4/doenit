import { getAuth, signOut as firebaseSignOut, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { PUBLIC_ADMIN_EMAILS, PUBLIC_GOOGLE_AUTH } from "$env/static/public";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { getApp, initializeApp } from "$lib/chunk/firebase-app";
import { APP_NAME, FIREBASE_CONFIG, normalize } from "$lib";
import { t } from "$lib/services/language.svelte";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Widget } from "../core/widget";
import { billing } from "$lib/core/billing.svelte";
import { Alert } from "$lib/core/alert";

class UserState {
  // User Info
  #uid: string | null = $state(null); // Firebase User ID
  #id: string | null = $state(null);
  #name: string | null = $state(null);
  #email_address: string | null = $state(null);
  #avatar: string | null = $state(null);

  // App Settings
  #language_code: Language | null = $state(null);
  #text_size: TextSize = $state(16);
  #theme: Theme = $state("dark");
  #notifications: { enabled: boolean; time: string | null } = $state({ enabled: false, time: null });

  #is_loading = $state(true);
  readonly is_logged_in = $derived(!!this.#uid);
  readonly is_vip = $derived(this.is_logged_in && PUBLIC_ADMIN_EMAILS.includes(this.#email_address || ""));
  readonly is_plus_user = $derived(this.is_logged_in && (billing.is_plus_user || this.is_vip));

  readonly is_friends_enabled: boolean = $derived(this.is_plus_user);
  readonly is_backup_enabled: boolean = $derived(this.is_plus_user);
  getToken: (() => Promise<string>) | null = null;

  get is_loading() {
    return this.#is_loading;
  }

  get id() {
    return this.#id;
  }

  get uid() {
    return this.#uid;
  }

  get name() {
    return this.#name;
  }

  get email_address() {
    return this.#email_address;
  }

  get avatar() {
    return this.#avatar;
  }

  get language_code() {
    return this.#language_code;
  }

  set language_code(lang: Language | null) {
    if (!lang) return;
    if (this.#language_code === lang) return;

    this.#language_code = lang;
    Alert.language = lang;
    this.saveUserData();
  }

  get text_size() {
    return this.#text_size;
  }

  get theme() {
    return this.#theme;
  }

  set theme(theme: any) {
    if (theme === "auto" || theme === "system") theme = "dark";
    if (this.#theme === theme) return;
    if (!this.isValidTheme(theme)) {
      console.warn(`Invalid theme value: ${theme}. Valid values are 'dark' or 'light'.`);
      return;
    }

    this.#theme = theme;
    this.saveUserData();
    this.updateAppTheme(theme);
  }

  get notifications() {
    return this.#notifications;
  }

  async init() {
    await this.loadUser();
    this.#is_loading = false;
    this.initializeUser();
  }

  async signIn(): Promise<SimpleResult> {
    try {
      if (!Capacitor.isNativePlatform()) {
        // TODO: Figure out web sign-in.
        return { success: false, error_message: "Disabled for web" };
      }

      this.#is_loading = true;
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
      const user_credential = await signInWithCredential(auth, credential);

      // Sync user data after successful sign-in
      const firebase_user = user_credential.user;
      if (firebase_user) {
        this.getToken = firebase_user.getIdToken.bind(firebase_user);
        billing.getToken = firebase_user.getIdToken.bind(firebase_user);

        const user_data: Partial<User> = {
          uid: firebase_user.uid,
          name: firebase_user.displayName || undefined,
          email_address: normalize(firebase_user.email || ""),
          avatar: firebase_user.photoURL || undefined,
        };

        await this.sync(user_data);
      }

      this.#is_loading = false;
      return { success: true };
    } catch (error) {
      this.#is_loading = false;
      const error_message = error instanceof Error ? error.message : JSON.stringify(error);
      if (error_message === "The user canceled the sign-in flow.") {
        return { success: false, error_message: "USER_CANCELED" };
      }

      return { success: false, error_message: `${t("google_verification_failed")}: ${error_message}` };
    }
  }

  async signOut(): Promise<SimpleResult> {
    try {
      if (Capacitor.isNativePlatform()) {
        await firebaseSignOut(getAuth(getApp(APP_NAME)));
        await GoogleAuth.initialize({ clientId: PUBLIC_GOOGLE_AUTH });
        await GoogleAuth.signOut();
      }

      // TODO: Figure out what do to with the user data.
      
      this.#uid = null;
      this.#id = null;
      this.#name = null;
      this.#email_address = null;
      this.#avatar = null;

      return { success: true };
    } catch (error) {
      return { success: false, error_message: `Sign-out error: ${error || JSON.stringify(error)}` };
    }
  }

  private async loadUser() {
    try {
      const { value } = await Preferences.get({ key: "user" });
      if (value) {
        const user = JSON.parse(value);
        this.#language_code = user.language_code || null;
        this.#text_size = user.text_size || "16";
        this.#theme = user.theme || "dark";
        this.#notifications = user.notifications || { enabled: true, time: "08:00" };

        this.#id = user.id || null;
        this.#uid = user.uid || null;
        this.#name = user.name || null;
        this.#email_address = user.email_address || null;
        this.#avatar = user.avatar || null;
      }

      this.updateAppTheme(this.#theme);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie gebruikerdata laai nie: ${error_message}`);
    }
  }

  initializeUser() {
    const app = initializeApp(FIREBASE_CONFIG, APP_NAME);
    if (!Capacitor.isNativePlatform()) return;

    const auth = getAuth(app);
    auth.onAuthStateChanged(async (firebase_user) => {
      if (!firebase_user) return;

      billing.init();
      billing.getToken = firebase_user.getIdToken.bind(firebase_user);
      this.getToken = firebase_user.getIdToken.bind(firebase_user);
      const user_data: Partial<User> = {
        uid: firebase_user.uid,
        name: firebase_user.displayName || undefined,
        email_address: normalize(firebase_user.email || ""),
        avatar: firebase_user.photoURL || undefined,
      };

      await user.sync(user_data);
    });
  }

  /**
   * This should be called after DB has been initialized.
   */
  async sync(user: Partial<User> | null) {
    if (!user) return;

    if (user.id !== undefined) this.#id = user.id;
    if (user.uid !== undefined) this.#uid = user.uid;
    if (user.name !== undefined) this.#name = user.name;
    if (user.email_address !== undefined) this.#email_address = user.email_address;
    if (user.avatar !== undefined) this.#avatar = user.avatar || null;

    await this.saveUserData();
  }

  private async saveUserData() {
    const user_data = {
      id: this.#id,
      uid: this.#uid,
      name: this.#name,
      email_address: this.#email_address,
      avatar: this.#avatar,
      language_code: this.#language_code,
      text_size: this.#text_size,
      theme: this.#theme,
      notifications: this.#notifications,
    };

    await Preferences.set({
      key: "user",
      value: JSON.stringify(user_data),
    });
  }

  private async updateEdgeToEdgeColour() {
    if (!Capacitor.isNativePlatform()) return;

    const { EdgeToEdge } = await import("@capawesome/capacitor-android-edge-to-edge-support");
    const info = await Device.getInfo();
    if (+info.osVersion < 15) {
      await EdgeToEdge.disable();
      return;
    }

    const theme_bg_colours = {
      dark: "#2b2f31",
      light: "#F5F5F5",
    };

    const bg_colour = theme_bg_colours[this.#theme];
    await EdgeToEdge.setBackgroundColor({ color: bg_colour });
  }

  private updateAppTheme(theme: Theme) {
    // Stel tema in die HTML-class
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(`theme-${theme}`);
    document.documentElement.setAttribute("data-theme", theme);

    Widget.updateTheme(theme);
    this.updateEdgeToEdgeColour();
  }

  private isValidTheme(theme_value: string): theme_value is Theme {
    return ["dark", "light"].includes(theme_value);
  }
}

export const user = new UserState();
