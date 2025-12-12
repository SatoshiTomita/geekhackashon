import admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * 担保支払いのCheckoutセッションを処理して、支払い状態を更新する
 */
export const handleDepositPayment = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new Error('sessionIdは必須です');
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

      // セッションを取得
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      if (!session.metadata?.firebaseUserId || !session.metadata?.categoryId || !session.metadata?.goalId) {
        throw new Error('セッションに必要な情報が含まれていません');
      }

      const userId = session.metadata.firebaseUserId;
      const categoryId = session.metadata.categoryId;
      const goalId = session.metadata.goalId;

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

      // 支払いが成功した場合
      if (session.payment_status === 'paid') {
        const paymentIntent = session.payment_intent;
        const paymentIntentId = typeof paymentIntent === 'string' 
          ? paymentIntent 
          : paymentIntent?.id;

        if (!paymentIntentId) {
          throw new Error('PaymentIntent IDが取得できませんでした');
        }

        // 担保情報を更新
        const FieldValue = admin.firestore.FieldValue;
        const depositData = {
          checkoutSessionId: session.id,
          paymentIntentId: paymentIntentId,
          amount: session.amount_total ? session.amount_total : 0,
          status: 'paid',
          paidAt: FieldValue.serverTimestamp(),
          refundedAmount: 0,
          refundHistory: [],
        };

        await goalRef.set(
          {
            deposit: depositData,
          },
          { merge: true },
        );

        return {
          success: true,
          paymentStatus: 'paid',
          paymentIntentId,
        };
      } else {
        // 支払いが未完了の場合
        const FieldValue = admin.firestore.FieldValue;
        await goalRef.set(
          {
            deposit: {
              checkoutSessionId: session.id,
              status: 'failed',
              failedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        );

        return {
          success: false,
          paymentStatus: session.payment_status,
        };
      }
    } catch (error: any) {
      console.error('担保支払い処理エラー:', error);
      throw new Error(`担保支払いの処理に失敗しました: ${error.message}`);
    }
  },
);

