import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";
import { Message } from "firebase-admin/lib/messaging/messaging-api";

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
});

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

// Helper function to verify Firebase ID token
async function verifyToken(id_token: string) {
  try {
    functions.logger.log("Attempting to verify token...");
    const result = await admin.auth().verifyIdToken(id_token);
    functions.logger.log("Token verified successfully:", result);
    return result;
  } catch (error) {
    functions.logger.error("Token verification error details:", error);
    throw new functions.https.HttpsError("unauthenticated", "Invalid token");
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

      // Auth header (optional, but recommended)
      const auth_header = req.headers.authorization;
      if (!auth_header || !auth_header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id_token = auth_header.split("Bearer ")[1];
      await verifyToken(id_token); // Throws if invalid

      // Get notification details from body
      const { users, title, body, type, data } = req.body;

      if (!users?.length) {
        res.status(400).json({ error: "Missing or invalid users array" });
        return;
      }

      // Send notification using firebase-admin
      if (title && body) {
        // Direct notification (simple case) - send to all users with same content
        await admin.messaging().sendEach(
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

        await admin.messaging().sendEach(messages);
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
      const decoded_token = await verifyToken(id_token);

      functions.logger.log("Decoded token:", decoded_token);

      if (!decoded_token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { purchase_token, product_id } = req.body;

      if (!purchase_token || !product_id) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      const usersCollection = admin.firestore().collection("users");
      await usersCollection.doc(decoded_token.uid).set(
        {
          subscription: {
            productId: product_id,
            purchaseToken: purchase_token,
            platform: "android",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
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
      console.error("Subscription cancellation error:", error_message);
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

      // Verify user authentication
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await verifyToken(idToken);

      const { purchaseToken, productId } = req.body;

      if (!purchaseToken || !productId) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      // In production, you would verify the purchase with Google Play API
      // For now, we'll store the subscription info
      // TODO: Add Google Play Developer API verification
      // const { google } = require("googleapis");
      // const androidPublisher = google.androidpublisher("v3");

      // Store subscription status in Firestore
      const usersCollection = admin.firestore().collection("users");
      await usersCollection.doc(decodedToken.uid).set(
        {
          subscription: {
            productId,
            purchaseToken,
            platform: "android",
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true,
          },
          is_plus_user: true,
        },
        { merge: true }
      );

      res.json({
        success: true,
        message: "Subscription verified and stored",
      });
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error("Subscription verification error:", error_message);
      res.status(500).json({ error: error_message });
    }
  });
});

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
