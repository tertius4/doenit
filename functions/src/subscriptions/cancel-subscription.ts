import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type { Request, Response } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { corsHandler, verifyToken } from "../shared/firebase";

export async function handleCancelSubscription(req: Request, res: Response): Promise<void> {
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
}
