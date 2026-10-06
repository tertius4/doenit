import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import { getFirestore } from "firebase-admin/firestore";
import { type App } from "firebase-admin/app";
import { type DecodedIdToken } from "firebase-admin/auth";

// CORS configuration - Allow localhost and Capacitor app origins
export const corsHandler = cors({
  origin: [
    "http://localhost:5173", // Vite dev server
    "http://localhost:4173", // Vite preview
    "http://localhost:3000", // Alternative dev port
    "http://localhost:8080", // Common dev port
    "http://localhost:8100", // Ionic/Capacitor dev port
    "capacitor://localhost", // Capacitor iOS
    "http://localhost", // Capacitor Android
    "https://localhost", // HTTPS localhost
    /^capacitor:\/\/.*$/, // Any capacitor protocol
    /^https:\/\/.*\.firebaseapp\.com$/, // Firebase hosting
    /^https:\/\/.*\.web\.app$/, // Firebase web app
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  optionsSuccessStatus: 200,
});

/**
 * Helper function to verify Firebase ID token
 * @returns {{ success: true, data: DecodedIdToken } | { success: false, error_message: string }}
 */
export async function verifyToken(
  id_token: string,
): Promise<{ success: true; data: DecodedIdToken } | { success: false; error_message: string }> {
  try {
    const result = await admin.auth(app).verifyIdToken(id_token);
    return { success: true, data: result };
  } catch (error) {
    functions.logger.error("Token verification error:", error);
    return { success: false, error_message: "Unauthorized" };
  }
}

/** The project this function is deployed in (dev and production differ). */
function getProjectId(): string {
  try {
    const config = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    if (config.projectId) return config.projectId;
  } catch {
    // Fall through to the other variables.
  }

  return process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "doenit2";
}

function getFirebaseStorage(): App {
  let app: App;

  try {
    app = admin.app("doenitdb");
  } catch {
    // Not created yet (every cold start). Use the project the function runs in: dev and production differ.
    functions.logger.info("Initializing Firebase app");
    const project_id = getProjectId();
    functions.logger.info(`Firebase project: ${project_id}`);
    app = admin.initializeApp(
      { projectId: project_id, storageBucket: `${project_id}.firebasestorage.app` },
      "doenitdb",
    );
  }

  return app;
}


export const app = getFirebaseStorage();

/** The named Firestore database every function uses. */
export function getDb(): FirebaseFirestore.Firestore {
  return getFirestore(app, "doenitdb");
}
