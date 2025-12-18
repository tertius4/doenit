import type { CapacitorConfig } from "@capacitor/cli";
import dotenv from "dotenv";

// Load environment-specific configuration
const env = process.env.NODE_ENV === "development" ? ".env.development" : ".env.production";
dotenv.config({ path: env });

const config: CapacitorConfig = {
  appId: process.env.PUBLIC_APP_ID || "doenit.app",
  appName: process.env.PUBLIC_APP_NAME || "Doenit",
  webDir: "build",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
    allowNavigation: ["*.firebaseapp.com"],
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
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    GoogleAuth: {
      clientId: process.env.PUBLIC_GOOGLE_AUTH || "",
      scopes: ["profile", "email"],
    },
    EdgeToEdge: {
      backgroundColor: "#2b2f31",
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
};

export default config;
