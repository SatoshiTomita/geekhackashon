import admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * 目標達成率に応じて返金を処理する
 * 25%、50%、75%、100%の達成率に達したら、それぞれ25%ずつ返金
 */
export const processRefund = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId, categoryId, goalId } = request.data;

    if (!userId || !categoryId || !goalId) {
      throw new Error('userId, categoryId, goalIdは必須です');
    }

    // Stripe APIキーを環境変数から取得
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEYが設定されていません');
    }

    try {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });

      const db = getDb();
      const goalRef = db
        .collection('users')
        .doc(userId)
        .collection('category')
        .doc(categoryId)
        .collection('goals')
        .doc(goalId);

      const goalSnap = await goalRef.get();
      if (!goalSnap.exists) {
        throw new Error('目標が見つかりません');
      }

      const goalData = goalSnap.data();
      const deposit = goalData?.deposit;

      // 担保が存在しない、または支払いが完了していない場合は処理しない
      if (!deposit || deposit.status !== 'paid' || !deposit.paymentIntentId) {
        return {
          success: false,
          message: '担保が支払われていません',
        };
      }

      // 目標の達成率を取得
      const currentRatio = goalData?.ratio || 0;
      const depositAmount = deposit.amount || 0;
      const refundedAmount = deposit.refundedAmount || 0;
      const refundHistory = deposit.refundHistory || [];

      // 達成率に応じた返金率を計算（25%刻み）
      let targetRefundRatio = 0;
      if (currentRatio >= 100) {
        targetRefundRatio = 100;
      } else if (currentRatio >= 75) {
        targetRefundRatio = 75;
      } else if (currentRatio >= 50) {
        targetRefundRatio = 50;
      } else if (currentRatio >= 25) {
        targetRefundRatio = 25;
      }

      // 既に返金済みの割合を計算
      const alreadyRefundedRatio = depositAmount > 0 
        ? (refundedAmount / depositAmount) * 100 
        : 0;

      // 返金が必要な場合のみ処理
      if (targetRefundRatio > alreadyRefundedRatio) {
        // 返金すべき金額を計算
        const refundAmount = Math.round((depositAmount * targetRefundRatio / 100) - refundedAmount);

        if (refundAmount > 0) {
          // Stripeで返金を実行
          const refund = await stripe.refunds.create({
            payment_intent: deposit.paymentIntentId,
            amount: refundAmount,
            metadata: {
              firebaseUserId: userId,
              categoryId,
              goalId,
              goalRatio: currentRatio.toString(),
              refundRatio: targetRefundRatio.toString(),
            },
          });

          // 返金履歴を更新
          // 注意: 配列内ではFieldValue.serverTimestamp()を使用できないため、
          // admin.firestore.Timestamp.now()を使用する
          const FieldValue = admin.firestore.FieldValue;
          const now = admin.firestore.Timestamp.now();
          const newRefundHistory = [
            ...refundHistory,
            {
              refundId: refund.id,
              amount: refundAmount,
              ratio: targetRefundRatio,
              goalRatio: currentRatio,
              refundedAt: now,
            },
          ];

          // Firestoreの担保情報を更新
          await goalRef.set(
            {
              deposit: {
                ...deposit,
                refundedAmount: refundedAmount + refundAmount,
                refundHistory: newRefundHistory,
                lastRefundedAt: FieldValue.serverTimestamp(),
              },
            },
            { merge: true },
          );

          return {
            success: true,
            refundId: refund.id,
            refundAmount,
            refundRatio: targetRefundRatio,
            totalRefundedAmount: refundedAmount + refundAmount,
          };
        }
      }

      return {
        success: false,
        message: '返金の必要がありません',
        currentRatio,
        alreadyRefundedRatio,
        targetRefundRatio,
      };
    } catch (error: any) {
      console.error('返金処理エラー:', error);
      throw new Error(`返金処理に失敗しました: ${error.message}`);
    }
  },
);

