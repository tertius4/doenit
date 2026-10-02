import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";
import { Message } from "firebase-admin/lib/messaging/messaging-api";
import { google } from "googleapis";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { type App } from "firebase-admin/app";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { type DecodedIdToken } from "firebase-admin/auth";

const app = getFirebaseStorage();

// CORS configuration - Allow localhost and Capacitor app origins
const corsHandler = cors({
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
async function verifyToken(
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

// Helper function to verify Google Play purchase
async function verifyGooglePlayPurchase(
  packageName: string,
  product_id: string,
  purchaseToken: string,
  user_id: string,
) {
  try {
    // Initialize Google Auth with service account
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      // You'll need to set up service account credentials
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || "./service-account-key.json",
    });

    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth: auth,
    });

    // Verify the subscription purchase
    const response = await androidpublisher.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: product_id,
      token: purchaseToken,
    });

    const purchase = response.data;

    // Check if subscription is valid and active
    const now = Date.now();
    const expiryTime = purchase?.expiryTimeMillis ? parseInt(purchase.expiryTimeMillis) : 0;
    const isNotExpired = expiryTime > now;
    const isPaid = purchase.paymentState === 1; // 1 = Received

    const isValid = purchase && purchase.startTimeMillis && purchase.expiryTimeMillis && isNotExpired && isPaid;

    // Check if the obfuscatedAccountId matches the user's email
    const obfuscatedAccountId = purchase?.obfuscatedExternalAccountId;
    const emailMatches = !obfuscatedAccountId || obfuscatedAccountId === user_id;

    // Check if subscription is cancelled but still active (not yet expired)
    const isCancelled = !!purchase?.cancelReason;

    return {
      isValid: isValid && emailMatches,
      expiryTime: purchase?.expiryTimeMillis ? new Date(parseInt(purchase.expiryTimeMillis)) : null,
      autoRenewing: purchase?.autoRenewing || false,
      orderId: purchase?.orderId || null,
      emailMatches,
      obfuscatedAccountId,
      isCancelled,
      cancelReason: purchase?.cancelReason || null,
    };
  } catch (error) {
    functions.logger.error("Google Play verification error:", error);
    throw new Error("Failed to verify purchase with Google Play");
  }
}

// Matches the in-app inbox types (src/app.d.ts DB.NotificationType).
const PUSH_TYPES = [
  "invite_received",
  "invite_accepted",
  "group_added",
  "group_removed",
  "group_deleted",
  "user_left_group",
  "task_assigned",
  "task_completed",
  "mentioned",
] as const;

/**
 * Delivers a push for every new inbox notification (users/{uid}/notifications/{id}).
 * Recipients and text come from Firestore, never from the caller, so nobody can push arbitrary text to a token.
 * Tokens live in users/{uid}/push_tokens/{device_id}; dead ones are pruned here.
 */
export const sendPushOnNotification = onDocumentCreated(
  { document: "users/{uid}/notifications/{notification_id}", database: "doenitdb", region: "africa-south1" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { uid, notification_id } = event.params;
    const notification = snapshot.data();
    const type = String(notification.type ?? "");
    functions.logger.info(`Push requested for ${uid}: ${type}`);
    if (!(PUSH_TYPES as readonly string[]).includes(type)) return;
    if (notification.user_id !== uid) return;

    const db = getFirestore(app, "doenitdb");
    const tokens_snapshot = await db.collection("users").doc(uid).collection("push_tokens").get();
    if (tokens_snapshot.empty) {
      functions.logger.info(`No push tokens for ${uid}`);
      return;
    }

    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries((notification.data ?? {}) as Record<string, unknown>)) {
      if (typeof value === "string") data[key] = value;
    }

    const devices = tokens_snapshot.docs
      .map((doc) => ({ ref: doc.ref, token: doc.get("token"), language: doc.get("language_code") }))
      .filter((device): device is { ref: typeof device.ref; token: string; language: string } => {
        return typeof device.token === "string" && !!device.token;
      });

    const messages: Message[] = devices.map((device) => {
      const lang = device.language === "en" ? "en" : "af";
      const title = getTemplateTitle(type, lang);
      const body = getTemplateBody(type, lang, data);

      return {
        token: device.token,
        notification: { title, body },
        // Everything in `data` must be a string. The app uses it to open the right screen on tap.
        data: { ...data, type, notification_id },
        android: {
          priority: "high",
          notification: { channelId: "default", priority: "high", defaultSound: true, defaultVibrateTimings: true },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } },
        },
      };
    });
    if (!messages.length) return;

    const response = await admin.app("doenitdb").messaging().sendEach(messages);
    functions.logger.info(`Push to ${uid}: ${response.successCount} sent, ${response.failureCount} failed`);

    // Remove tokens FCM says are gone (app uninstalled, token rotated, signed out elsewhere).
    const dead_codes = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];
    await Promise.all(
      response.responses.map(async (result, index) => {
        const code = result.error?.code;
        if (code && dead_codes.includes(code)) await devices[index].ref.delete();
        else if (code) functions.logger.warn(`Push to ${uid} failed: ${code}`);
      }),
    );
  },
);

export const cancelSubscription = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      // Verify user authentication
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id_token = authHeader.split("Bearer ")[1];
      const token_result = await verifyToken(id_token);
      if (!token_result.success) {
        res.status(401).json({ error: token_result.error_message });
        return;
      }

      const { purchase_token, product_id } = req.body;
      if (!purchase_token || !product_id) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      const db = admin.firestore();
      const decoded_token = token_result.data;
      const user_collection = db.collection("users");
      const snapshot = await user_collection.where("id", "==", decoded_token.uid).limit(1).get();

      if (snapshot.empty) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userDocRef = snapshot.docs[0].ref;
      await userDocRef.set(
        {
          subscription: {
            product_id: product_id,
            purchase_token: purchase_token,
            platform: "android",
            cancelled_at: FieldValue.serverTimestamp(),
            active: false,
          },
          is_plus_user: false,
        },
        { merge: true },
      );

      res.json({
        success: true,
        message: "Subscription cancelled",
      });
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      functions.logger.error("Subscription cancellation error:", error_message);
      res.status(500).json({ error: error_message });
    }
  });
});

// Verify Android Subscription function
export const verifySubscription = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id_token = authHeader.split("Bearer ")[1];
      const token_result = await verifyToken(id_token);
      if (!token_result.success) {
        res.status(401).json({ error: token_result.error_message });
        return;
      }

      const { purchase_token, product_id, package_name } = req.body;
      if (!purchase_token || !product_id || !package_name) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      const decoded_token = token_result.data;
      const db = getFirestore(app, "doenitdb");
      const user_result = await getUser(decoded_token.uid, db);
      if (!user_result.success) {
        res.status(404).json({ error: user_result.error_message });
        return;
      }

      const user = user_result.data.user;
      functions.logger.info(`User document found: ${user.name}`);

      const subscription_result = await getSubscription(decoded_token.uid, db);
      if (!subscription_result.success) {
        res.status(404).json({ error: subscription_result.error_message });
        return;
      }

      let subscription = subscription_result.data;
      functions.logger.info(`Subscription document retrieved. Created: ${subscription?.verified_at}`);
      if (subscription?.purchase_token === purchase_token && subscription?.active) {
        res.json({
          success: true,
          valid: true,
          message: "Subscription already verified",
          subscription: {
            expiryTime: subscription.expiry_time,
            autoRenewing: subscription.auto_renewing || false,
            isCancelled: subscription.is_cancelled || false,
            cancelReason: subscription.cancel_reason || null,
          },
        });
        return;
      }

      functions.logger.info("Verifying subscription with Google Play...");

      try {
        // Actually verify the purchase with Google Play
        const verificationResult = await verifyGooglePlayPurchase(package_name, product_id, purchase_token, user.uid);
        functions.logger.info("Google Play verification result:", verificationResult);
        if (!verificationResult.isValid) {
          if (!verificationResult.emailMatches) {
            functions.logger.warn(
              `Email mismatch: Purchase made with ${verificationResult.obfuscatedAccountId}, user is ${user.email_address}`,
            );
            res.json({
              valid: false,
              error: "Purchase belongs to a different account",
            });
            return;
          }
          res.status(400).json({
            error: "Invalid or expired subscription",
            details: "Purchase verification failed with Google Play",
          });
          return;
        }

        subscription ??= {
          product_id: product_id,
          user_uid: decoded_token.uid,
          purchase_token: purchase_token,
          package_name: package_name,
          platform: "android",
          verified_at: FieldValue.serverTimestamp(),
          active: true,
        };

        subscription.expiry_time = verificationResult.expiryTime;
        subscription.auto_renewing = verificationResult.autoRenewing;
        subscription.is_cancelled = verificationResult.isCancelled;
        subscription.cancel_reason = verificationResult.cancelReason || null;
        await saveSubscription(subscription);

        user_result.data.user_ref.set({ is_plus_user: true }, { merge: true });
        functions.logger.info(`Subscription verified successfully for user: ${decoded_token.uid}`);

        res.json({
          success: true,
          valid: true,
          message: "Subscription verified and activated",
          subscription: {
            expiryTime: verificationResult.expiryTime,
            autoRenewing: verificationResult.autoRenewing,
            isCancelled: verificationResult.isCancelled,
            cancelReason: verificationResult.cancelReason || null,
          },
        });
      } catch (error) {
        functions.logger.error("Google Play verification failed:", error);

        // Don't give users premium access if verification fails
        res.status(400).json({
          error: "Intekening verifikasie het misluk",
          details: "Kon nie aankoop met Google Play Store verifieer nie",
        });
        return;
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      functions.logger.error("Intekening verifikasie fout:", error_message);

      // Categorize errors for better debugging
      if (error_message.includes("unauthenticated")) {
        res.status(401).json({ error: "Verifikasie het misluk" });
      } else if (error_message.includes("not found")) {
        res.status(404).json({ error: "Gebruiker nie gevind nie" });
      } else {
        res.status(500).json({ error: "Interne bediener fout" });
      }
    }
  });
});

async function getUser(
  uid: string,
  db: FirebaseFirestore.Firestore,
): Promise<
  | {
      success: true;
      data: { user: FirebaseFirestore.DocumentData; user_ref: FirebaseFirestore.DocumentReference };
    }
  | { success: false; error_message: string }
> {
  const users_collection = db.collection("users");
  const users_snapshot = await users_collection.where("uid", "==", uid).get();

  if (users_snapshot.empty) {
    functions.logger.warn(`User not found with UID: ${uid}`);
    return { success: false, error_message: "User not found" };
  }

  const user_doc = users_snapshot.docs[0];
  if (!user_doc.exists) {
    functions.logger.warn(`User document is empty for UID: ${uid}`);
    return { success: false, error_message: "User not found" };
  }

  return { success: true, data: { user: user_doc.data(), user_ref: user_doc.ref } };
}

async function getSubscription(
  uid: string,
  db: FirebaseFirestore.Firestore,
): Promise<{ success: true; data: FirebaseFirestore.DocumentData | null } | { success: false; error_message: string }> {
  try {
    const subscription_collection = db.collection("subscriptions");
    const subscriptions_snapshot = await subscription_collection.where("user_uid", "==", uid).get();

    if (subscriptions_snapshot.empty) {
      functions.logger.warn(`subscription not found with UID: ${uid}`);
      return { success: true, data: null };
    }

    const subscription = subscriptions_snapshot.docs[0].data();
    if (!subscription) {
      functions.logger.warn(`Subscription not found for UID: ${uid}`);
      return { success: true, data: null };
    }

    return { success: true, data: subscription };
  } catch (error) {
    functions.logger.error(`Error retrieving subscription for UID: ${uid}`, error);
    return { success: false, error_message: "Error retrieving subscription" };
  }
}

async function saveSubscription(subscription: any | null): Promise<void> {
  const db = getFirestore(app, "doenitdb");

  const subscription_collection = db.collection("subscriptions");
  // Update if already exsists
  const subscriptions_snapshot = await subscription_collection.where("user_uid", "==", subscription.user_uid).get();

  if (!subscriptions_snapshot.empty) {
    const subscription_ref = subscriptions_snapshot.docs[0].ref;
    await subscription_ref.set(subscription, { merge: true });
    functions.logger.info(`Subscription updated for user UID: ${subscription.user_uid}`);
  } else {
    // Create new
    await subscription_collection.add(subscription);
    functions.logger.info(`New subscription created for user UID: ${subscription.user_uid}`);
  }
}

function getTemplateTitle(type: string, lang: "af" | "en"): string {
  const en = lang === "en";
  switch (type) {
    case "invite_received":
      return en ? "New contact invite" : "Nuwe kontak-uitnodiging";
    case "invite_accepted":
      return en ? "Contact invite accepted" : "Kontak-uitnodiging aanvaar";
    case "group_added":
      return en ? "Added to group" : "By groep gevoeg";
    case "group_removed":
      return en ? "Removed from group" : "Uit groep verwyder";
    case "group_deleted":
      return en ? "Group deleted" : "Groep uitgevee";
    case "user_left_group":
      return en ? "Member left group" : "Lid het groep verlaat";
    case "task_assigned":
      return en ? "New task assigned" : "Nuwe taak toegeken";
    case "task_completed":
      return en ? "A task is done!" : "'n Taak is klaar!";
    default:
      return en ? "Notification" : "Kennisgewing";
  }
}

function getTemplateBody(type: string, lang: "af" | "en", data: Record<string, string>): string {
  const en = lang === "en";
  switch (type) {
    case "invite_received":
      return en ? `${data.email} wants to connect with you.` : `${data.email} wil met jou skakel.`;
    case "invite_accepted":
      return en ? `${data.email} accepted your invite.` : `${data.email} het jou uitnodiging aanvaar.`;
    case "group_added":
      return en ? `You were added to ${data.group_name}.` : `Jy is by ${data.group_name} gevoeg.`;
    case "group_removed":
      return en ? `You were removed from ${data.group_name}.` : `Jy is uit ${data.group_name} verwyder.`;
    case "group_deleted":
      return en ? `${data.group_name} was deleted.` : `${data.group_name} is uitgevee.`;
    case "user_left_group":
      return en ? `${data.user_name} left ${data.group_name}.` : `${data.user_name} het ${data.group_name} verlaat.`;
    case "task_assigned":
      return en ? `Task "${data.task_name}" was assigned to you.` : `Taak "${data.task_name}" is aan jou toegeken.`;
    case "task_completed":
      return en
        ? `${data.user_name} completed "${data.task_name}" in ${data.group_name}.`
        : `${data.user_name} het "${data.task_name}" in ${data.group_name} voltooi.`;
    default:
      return en ? "You have a new notification" : "Jy het 'n nuwe kennisgewing";
  }
}
