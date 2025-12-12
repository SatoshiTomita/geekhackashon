import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * ユーザーのStripeサブスクリプション状態を確認する
 */
export const checkSubscription = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId } = request.data;

    if (!userId) {
      throw new Error('userIdは必須です');
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
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return {
          success: true,
          hasActiveSubscription: false,
          message: 'ユーザーが見つかりません',
        };
      }

      const userData = userSnap.data();
      const stripeCustomerId = userData?.stripeCustomerId;

      if (!stripeCustomerId) {
        return {
          success: true,
          hasActiveSubscription: false,
          message: 'Stripe顧客IDが設定されていません',
        };
      }

      // Stripeから顧客のサブスクリプションを取得
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 1,
      });

      const hasActiveSubscription = subscriptions.data.length > 0;

      return {
        success: true,
        hasActiveSubscription,
        message: hasActiveSubscription
          ? 'アクティブなサブスクリプションがあります'
          : 'アクティブなサブスクリプションがありません',
      };
    } catch (error: any) {
      console.error('サブスクリプション確認エラー:', error);
      throw new Error(`サブスクリプション確認に失敗しました: ${error.message}`);
    }
  },
);

