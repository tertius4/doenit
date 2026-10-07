import type { CapacitorConfig } from "@capacitor/cli";
import dotenv from "dotenv";

// Load environment-specific configuration
const env = process.env.APP_VARIANT === "development" ? ".env.development" : ".env.production";
// quiet: dotenv logs to stderr, which Appflow folds into the JSON it parses from `cap config --json`.
dotenv.config({ path: env, quiet: true });

const config: CapacitorConfig = {
  appId: process.env.PUBLIC_APP_ID || "doenit.app",
  appName: process.env.PUBLIC_APP_NAME || "Doenit",
  webDir: "build",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
    allowNavigation: ["*.firebaseapp.com", "*.googleapis.com", "*.googleusercontent.com"],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_logo",
      iconColor: "#ffffff",
      sound: "notification.wav",
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: true,
        twitter: false,
      },
    },
  },
  android: {
    buildOptions: {
      keystorePath: "./app.keystore",
      keystorePassword: process.env.KEYSTORE_PASSWORD,
      keystoreAlias: process.env.KEYSTORE_ALIAS,
      keystoreAliasPassword: process.env.KEYSTORE_PASSWORD,
      releaseType: "AAB",
      signingType: "jarsigner",
    },
  },
  ios: {
    // On iOS 16.4+ a WKWebView is only inspectable when this is set, so without it a TestFlight or
    // App Store build cannot be debugged from Safari's Web Inspector at all.
    webContentsDebuggingEnabled: true,
    contentInset: "always",
    allowsLinkPreview: false,
  },
};

export default config;
