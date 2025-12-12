import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * Checkoutセッションを取得して、サブスクリプション状態を更新する
 */
export const handleCheckoutSession = onCall(
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
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session.metadata?.firebaseUserId) {
        throw new Error('セッションにユーザーIDが含まれていません');
      }

      const userId = session.metadata.firebaseUserId;

      // 顧客IDを取得
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

      if (!customerId) {
        throw new Error('顧客IDが取得できませんでした');
      }

      const db = getDb();
      const userRef = db.collection('users').doc(userId);

      // Firestoreに顧客IDを保存（まだ保存されていない場合）
      await userRef.set(
        { stripeCustomerId: customerId },
        { merge: true },
      );

      return {
        success: true,
        paymentStatus: session.payment_status,
        customerId,
      };
    } catch (error: any) {
      console.error('Checkoutセッション処理エラー:', error);
      throw new Error(`Checkoutセッションの処理に失敗しました: ${error.message}`);
    }
  },
);

