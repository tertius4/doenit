import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";
import { Message } from "firebase-admin/lib/messaging/messaging-api";
import { google } from "googleapis";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { type App } from "firebase-admin/app";
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
  id_token: string
): Promise<{ success: true; data: DecodedIdToken } | { success: false; error_message: string }> {
  try {
    const result = await admin.auth(app).verifyIdToken(id_token);
    return { success: true, data: result };
  } catch (error) {
    functions.logger.error("Token verification error:", error);
    return { success: false, error_message: "Unauthorized" };
  }
}

function getFirebaseStorage(): App {
  let app: App;

  try {
    app = admin.app("doenitdb");
  } catch (error) {
    functions.logger.info("Initializing secondary Firebase app", error);
    const init = {
      projectId: "doenit2",
      storageBucket: "doenit2.firebasestorage.app",
    };
    app = admin.initializeApp(init, "doenitdb");
  }

  return app;
}

// Helper function to verify Google Play purchase
async function verifyGooglePlayPurchase(packageName: string, productId: string, purchaseToken: string, userEmail: string) {
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
      subscriptionId: productId,
      token: purchaseToken,
    });

    const purchase = response.data;

    // Check if subscription is valid and active
    const now = Date.now();
    const expiryTime = purchase?.expiryTimeMillis ? parseInt(purchase.expiryTimeMillis) : 0;
    const isNotExpired = expiryTime > now;
    const isPaid = purchase.paymentState === 1; // 1 = Received
    
    const isValid =
      purchase &&
      purchase.startTimeMillis &&
      purchase.expiryTimeMillis &&
      isNotExpired &&
      isPaid;

    // Check if the obfuscatedAccountId matches the user's email
    const obfuscatedAccountId = purchase?.obfuscatedExternalAccountId;
    const emailMatches = !obfuscatedAccountId || obfuscatedAccountId === userEmail;

    // Check if subscription is cancelled but still active (not yet expired)
    const isCancelled = purchase?.cancelReason !== undefined && purchase?.cancelReason !== null;

    return {
      isValid: isValid && emailMatches,
      expiryTime: purchase?.expiryTimeMillis ? new Date(parseInt(purchase.expiryTimeMillis)) : null,
      autoRenewing: purchase?.autoRenewing || false,
      orderId: purchase?.orderId || null,
      emailMatches,
      obfuscatedAccountId,
      isCancelled,
      cancelReason: purchase?.cancelReason,
    };
  } catch (error) {
    functions.logger.error("Google Play verification error:", error);
    throw new Error("Failed to verify purchase with Google Play");
  }
}

// Backup functions
// Send Push Notification function
export const sendPushNotification = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const auth_header = req.headers.authorization;
      if (!auth_header || !auth_header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id_token = auth_header.split("Bearer ")[1];
      const token_result = await verifyToken(id_token);
      if (!token_result.success) {
        res.status(401).json({ error: token_result.error_message });
        return;
      }

      // Get notification details from body
      const { users, title, body, type, data } = req.body;
      if (!users?.length) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      // Send notification using firebase-admin
      if (title && body) {
        // Direct notification (simple case) - send to all users with same content
        await admin
          .app("doenitdb")
          .messaging()
          .sendEach(
            users.map((user: any) => ({
              token: user.fcm_token,
              notification: { title, body },
            }))
          );
      } else if (type && data) {
        // Structured notification - format per user's language preference
        const messages = users.map((user: any) => {
          const lang = (user.language_code || "af") as "af" | "en";
          const formattedTitle = getTemplateTitle(type, lang);
          const formattedBody = getTemplateBody(type, lang, data);

          const message: Message = {
            token: user.fcm_token,
            notification: {
              title: formattedTitle,
              body: formattedBody,
            },

            // Configure for both platforms
            android: {
              priority: "high" as const,
              notification: {
                channelId: "default",
                priority: "high" as const,
                defaultSound: true,
                defaultVibrateTimings: true,
              },
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
              payload: {
                aps: {
                  alert: {
                    title: formattedTitle,
                    body: formattedBody,
                  },
                  sound: "default",
                  badge: 1,
                },
              },
            },
          };

          return message;
        });

        await admin.app("doenitdb").messaging().sendEach(messages);
      } else {
        res.status(400).json({ error: "Invalid notification payload" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error("Fout met stuur van push notification:", error_message);
      res.status(500).json({ error: error_message });
    }
  });
});

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
            productId: product_id,
            purchaseToken: purchase_token,
            platform: "android",
            cancelledAt: FieldValue.serverTimestamp(),
            active: false,
          },
          is_plus_user: false,
        },
        { merge: true }
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
      functions.logger.info(`Subscription document retrieved. Created: ${subscription?.verifiedAt}`);
      if (subscription?.purchase_token === purchase_token && subscription?.active) {
        res.json({ success: true, valid: true, message: "Subscription already verified" });
        return;
      }

      try {
        // Actually verify the purchase with Google Play
        const verificationResult = await verifyGooglePlayPurchase(package_name, product_id, purchase_token, user.email_address || decoded_token.email || '');
        if (!verificationResult.isValid) {
          if (!verificationResult.emailMatches) {
            functions.logger.warn(`Email mismatch: Purchase made with ${verificationResult.obfuscatedAccountId}, user is ${user.email_address}`);
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
        subscription.order_id = verificationResult.orderId;
        subscription.is_cancelled = verificationResult.isCancelled;
        subscription.cancel_reason = verificationResult.cancelReason;
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
            cancelReason: verificationResult.cancelReason,
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
  db: FirebaseFirestore.Firestore
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
  db: FirebaseFirestore.Firestore
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
  const is_english = lang === "en";
  switch (type) {
    case "friend_request":
      if (is_english) {
        return "New Friend Request";
      } else {
        return "Nuwe Vriend Versoek";
      }
    case "new_task":
      if (is_english) {
        return "New Task Assigned";
      } else {
        return "Nuwe Taak Toegeken";
      }
    case "task_updated":
      if (is_english) {
        return "Task Updated";
      } else {
        return "Taak Opgedateer";
      }
    case "task_completed":
      if (is_english) {
        return "A task is done!";
      } else {
        return "'n Taak is Klaar!";
      }
    case "user_left_group":
      if (is_english) {
        return "User Left Group";
      } else {
        return "Gebruiker Het Groep Verlaat";
      }
    case "friend_request_accepted":
      if (is_english) {
        return "Friend Request Accepted";
      } else {
        return "Vriend Versoek Aanvaar";
      }
    default:
      if (is_english) {
        return "Notification";
      } else {
        return "Kennisgewing";
      }
  }
}

function getTemplateBody(type: string, lang: "af" | "en", data: Record<string, string>): string {
  const is_english = lang === "en";

  switch (type) {
    case "friend_request":
      if (is_english) {
        return "You have a new friend request";
      } else {
        return "Jy het 'n nuwe vriend versoek";
      }
    case "new_task":
      if (is_english) {
        return `New task "${data.task_name}" assigned in ${data.category_name}`;
      } else {
        return `Nuwe taak "${data.task_name}" toegeken in ${data.category_name}`;
      }
    case "task_updated":
      if (is_english) {
        return `Task "${data.task_name}" updated in ${data.category_name}`;
      } else {
        return `Taak "${data.task_name}" opgedateer in ${data.category_name}`;
      }
    case "task_completed":
      if (is_english) {
        return `"${data.task_name}" is completed in "${data.category_name}"!`;
      } else {
        return `"${data.task_name}" is gedoen in "${data.category_name}"!`;
      }
    case "user_left_group":
      if (is_english) {
        return `${data.user_name} left ${data.category_name}`;
      } else {
        return `${data.user_name} het ${data.category_name} verlaat`;
      }
    case "friend_request_accepted":
      if (is_english) {
        return `${data.sender_name} accepted your friend request`;
      } else {
        return `${data.sender_name} het jou vriend versoek aanvaar`;
      }
    default:
      if (is_english) {
        return "You have a new notification";
      } else {
        return "Jy het 'n nuwe kennisgewing";
      }
  }
}
