import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * Stripe Checkoutセッションを作成する
 */
export const createCheckoutSession = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId, priceId } = request.data;

    if (!userId) {
      throw new Error('userIdは必須です');
    }

    if (!priceId) {
      throw new Error('priceIdは必須です');
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
        throw new Error('ユーザーが見つかりません');
      }

      const userData = userSnap.data();
      let stripeCustomerId = userData?.stripeCustomerId;

      // Stripe顧客が存在しない場合は作成
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: userData?.email || undefined,
          metadata: {
            firebaseUserId: userId,
          },
        });
        stripeCustomerId = customer.id;

        // Firestoreに顧客IDを保存
        await userRef.set(
          { stripeCustomerId },
          { merge: true },
        );
      }

      // オリジンを取得（リクエストヘッダーから、またはデフォルト値を使用）
      const origin = request.rawRequest?.headers?.origin || 
                     request.rawRequest?.headers?.referer?.replace(/\/.*$/, '') ||
                     'http://localhost:3000';

      // Checkoutセッションを作成
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${origin}/users/${userId}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/users/${userId}/subscription/cancel`,
        metadata: {
          firebaseUserId: userId,
        },
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      console.error('Checkoutセッション作成エラー:', error);
      throw new Error(`Checkoutセッションの作成に失敗しました: ${error.message}`);
    }
  },
);

