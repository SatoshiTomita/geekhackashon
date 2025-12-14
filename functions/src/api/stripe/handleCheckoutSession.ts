import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

// Stripe秘密鍵を取得（defineSecretまたは.envから）
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * Stripeクライアントを初期化
 */
const initStripe = (): Stripe => {
  // defineSecretから取得を試みる（本番環境）
  let secretKey: string | undefined;
  try {
    secretKey = stripeSecretKey.value();
  } catch (error) {
    // defineSecretが設定されていない場合は.envから取得（開発環境）
    secretKey = process.env.STRIPE_SECRET_KEY;
  }

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY環境変数が設定されていません");
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-11-17.clover",
  });
};

/**
 * Cloud Function: Checkout Sessionを確認してFirestoreを更新
 */
export const handleCheckoutSession = onCall(
  {
    region: "asia-northeast1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new Error("sessionIdは必須です");
    }

    try {
      const db = getDb();
      const stripe = initStripe();

      // Stripe Checkout Sessionを取得
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session.metadata) {
        throw new Error("セッションのメタデータが取得できませんでした");
      }

      const { userId, categoryId, goalId, type } = session.metadata;

      if (!userId || !categoryId || !goalId) {
        throw new Error("必要なメタデータが不足しています");
      }

      // 決済が完了しているか確認
      if (session.payment_status !== "paid") {
        return {
          success: false,
          error: "決済が完了していません",
        };
      }

      // ゴール情報を更新
      const goalRef = db
        .collection("users")
        .doc(userId)
        .collection("category")
        .doc(categoryId)
        .collection("goals")
        .doc(goalId);

      if (type === "bet") {
        // Bet決済の場合
        // Payment Intent IDを保存（返金処理で使用）
        const updateData: any = {
          isLocked: true,
        };
        
        if (session.payment_intent) {
          updateData.paymentIntentId = session.payment_intent as string;
        }
        
        await goalRef.set(updateData, { merge: true });
      }

      return {
        success: true,
        message: "決済処理が完了しました",
      };
    } catch (error: any) {
      console.error("Checkout session handling error:", error);
      throw new Error(`決済処理に失敗しました: ${error.message}`);
    }
  }
);

