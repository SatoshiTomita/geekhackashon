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
 * Cloud Function: 目標の達成率に応じて返金処理を実行
 */
export const processRefundForGoal = onCall(
  {
    region: "asia-northeast1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { userId, categoryId, goalId, currentRatio } = request.data;

    if (!userId || !categoryId || !goalId || currentRatio === undefined) {
      throw new Error("userId, categoryId, goalId, currentRatioは必須です");
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
      const betAmount = goalData?.betAmount as number | undefined;
      const paymentIntentId = goalData?.paymentIntentId as string | undefined;
      const refundedPercentages =
        (goalData?.refundedPercentages as number[]) || [];

      // 賭け金がない、または決済が完了していない場合は処理しない
      if (!betAmount || !paymentIntentId || betAmount <= 0) {
        return {
          success: true,
          message: "返金対象ではありません",
        };
      }

      // 返還すべき割合を計算（25%, 50%, 75%, 100%）
      const milestones = [25, 50, 75, 100];
      const refundMilestones: number[] = [];

      for (const milestone of milestones) {
        // 現在の達成率がマイルストーン以上で、まだ返還されていない場合
        if (currentRatio >= milestone && !refundedPercentages.includes(milestone)) {
          refundMilestones.push(milestone);
        }
      }

      // 返還すべきマイルストーンがない場合は処理しない
      if (refundMilestones.length === 0) {
        return {
          success: true,
          message: "返金対象のマイルストーンがありません",
        };
      }

      // Payment Intentから既存の返金情報を取得
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const existingRefunds = await stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: 100,
      });
      
      // 既に返金された合計金額を計算
      const totalRefundedAmount = existingRefunds.data.reduce(
        (sum, refund) => sum + (refund.amount || 0),
        0
      );
      
      // 残りの返金可能金額
      const remainingRefundableAmount = paymentIntent.amount - totalRefundedAmount;

      // 各マイルストーンに対して返金処理を実行
      const refundResults: Array<{ milestone: number; success: boolean; refundId?: string; error?: string; refundAmount?: number }> = [];
      let currentRemainingAmount = remainingRefundableAmount;

      for (const milestone of refundMilestones) {
        try {
          let refundAmount: number;
          
          // 最後のマイルストーン（100%）の場合は、残りの金額を全て返金
          if (milestone === 100) {
            refundAmount = currentRemainingAmount;
          } else {
            // それ以外は賭け金の25%を返金
            refundAmount = Math.floor(betAmount * 0.25);
            // 残りの返金可能金額を超えないようにする
            refundAmount = Math.min(refundAmount, currentRemainingAmount);
          }

          // 返金額が0以下の場合はスキップ
          if (refundAmount <= 0) {
            refundResults.push({
              milestone,
              success: false,
              error: "返金可能金額がありません",
            });
            continue;
          }

          // 返金を実行
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: refundAmount,
            metadata: {
              userId,
              categoryId,
              goalId,
              milestone: milestone.toString(),
              type: "bet_refund",
            },
          });

          // 返還済みの割合を記録
          const updatedRefundedPercentages = [...refundedPercentages, milestone];
          await goalRef.set(
            {
              refundedPercentages: updatedRefundedPercentages,
            },
            { merge: true }
          );

          // 残りの返金可能金額を更新
          currentRemainingAmount -= refundAmount;
          // 次のイテレーションのためにrefundedPercentagesを更新
          refundedPercentages.push(milestone);

          refundResults.push({
            milestone,
            success: true,
            refundId: refund.id,
            refundAmount,
          });
        } catch (error: any) {
          console.error(`Refund error for milestone ${milestone}:`, error);
          refundResults.push({
            milestone,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        message: "返金処理が完了しました",
        refundResults,
      };
    } catch (error: any) {
      console.error("Process refund error:", error);
      throw new Error(`返金処理に失敗しました: ${error.message}`);
    }
  }
);

