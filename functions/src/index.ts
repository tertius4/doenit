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
async function verifyToken(idToken: string) {
  try {
    return admin.auth().verifyIdToken(idToken);
  } catch (error) {
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
      const { token, title, body, type, data } = req.body;
      if (!token) {
        res.status(400).json({ error: "Missing token" });
        return;
      }

      // Send notification using firebase-admin
      if (title && body) {
        // Direct notification (simple case)
        await admin.messaging().send({
          token,
          notification: { title, body },
        });
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
        
        await admin.messaging().send({
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
        });
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
