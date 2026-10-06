import * as functions from "firebase-functions";
import type { Request, Response } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { corsHandler, getDb, verifyToken } from "../shared/firebase";

export async function handleVerifySubscription(req: Request, res: Response): Promise<void> {
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
      const db = getDb();
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
}

// Helper function to verify Google Play purchase
async function verifyGooglePlayPurchase(
  packageName: string,
  product_id: string,
  purchaseToken: string,
  user_id: string,
) {
  try {
    // Loaded on demand: googleapis is large, and every function instance loads this whole codebase at startup.
    const { google } = await import("googleapis");

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
  const db = getDb();

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
