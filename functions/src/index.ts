import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";

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
      const { tokens, title, body, type, data } = req.body;
      if (!tokens) {
        res.status(400).json({ error: "Missing token" });
        return;
      }

      // Send notification using firebase-admin
      if (title && body) {
        // Direct notification (simple case)
        await admin.messaging().sendEach(
          tokens.map((token: string) => ({
            token,
            notification: { title, body },
          }))
        );
      } else if (type && data) {
        // Structured notification - send data in payload for proper background handling
        const fcmData = {
          type: type,
          // Flatten the data object into string values (FCM requirement)
          ...Object.keys(data).reduce(
            (acc, key) => {
              acc[key] = String(data[key]);
              return acc;
            },
            {} as Record<string, string>
          ),
        };

        console.log("Sending FCM message with data:", fcmData);

        await admin.messaging().sendEach(
          tokens.map((token: string) => ({
            token,
            data: fcmData,
            notification: {
              title: "Doenit",
              body: "u het 'n nuwe kennisgewing", // Simple fallback for system display
            },
            // Configure for both platforms
            android: {
              priority: "high",
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
              payload: {
                aps: {
                  "content-available": 1,
                },
              },
            },
          }))
        );
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
