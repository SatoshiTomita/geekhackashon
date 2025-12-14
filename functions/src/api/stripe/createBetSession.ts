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
    apiVersion: "2024-12-18.acacia",
  });
};

/**
 * Cloud Function: Bet決済セッションを作成
 */
export const createBetSession = onCall(
  {
    region: "asia-northeast1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { userId, categoryId, goalId, amount, origin } = request.data;

    if (!userId || !categoryId || !goalId || !amount) {
      throw new Error("userId, categoryId, goalId, amountは必須です");
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("金額は正の数である必要があります");
    }

    try {
      const db = getDb();
      const stripe = initStripe();

      // ゴール情報を取得
      const goalRef = db
        .collection("users")
        .doc(userId)
        .collection("category")
        .doc(categoryId)
        .collection("goals")
        .doc(goalId);

      const goalSnap = await goalRef.get();
      if (!goalSnap.exists) {
        throw new Error("ゴールが見つかりません");
      }

      const goalData = goalSnap.data();
      const goalTitle = goalData?.title || "目標";

      // Stripe Checkout Sessionを作成
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: `目標への賭け: ${goalTitle}`,
                description: `目標「${goalTitle}」の達成への賭け金`,
              },
              unit_amount: amount, // 金額（円）
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin || "http://localhost:3000"}/users/${userId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin || "http://localhost:3000"}/users/${userId}/payment/cancel`,
        metadata: {
          userId,
          categoryId,
          goalId,
          type: "bet",
        },
      });

      // 決済情報をFirestoreに保存（保留状態）
      await goalRef.set(
        {
          betAmount: amount,
          paymentIntentId: session.id,
          isLocked: false, // 決済完了後にtrueになる
        },
        { merge: true }
      );

      return {
        success: true,
        url: session.url,
        sessionId: session.id,
      };
    } catch (error: any) {
      console.error("Bet session creation error:", error);
      throw new Error(`決済セッションの作成に失敗しました: ${error.message}`);
    }
  }
);

