import admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * 担保支払い用のStripe Checkoutセッションを作成する
 */
export const createDepositPayment = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId, categoryId, goalId, amount } = request.data;

    if (!userId || !categoryId || !goalId || !amount) {
      throw new Error('userId, categoryId, goalId, amountは必須です');
    }

    if (amount <= 0) {
      throw new Error('金額は0より大きい値である必要があります');
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

      // Checkoutセッションを作成（一回限りの支払い）
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: '目標達成担保金',
                description: '目標達成に応じて返金されます',
              },
              unit_amount: Math.round(amount), // 金額を整数（円）に変換
            },
            quantity: 1,
          },
        ],
        mode: 'payment', // 一回限りの支払い
        success_url: `${origin}/users/${userId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/users/${userId}/payment/cancel`,
        metadata: {
          firebaseUserId: userId,
          categoryId,
          goalId,
          type: 'deposit',
        },
      });

      // 目標に担保情報を保存（pending状態）
      const goalRef = db
        .collection('users')
        .doc(userId)
        .collection('category')
        .doc(categoryId)
        .collection('goals')
        .doc(goalId);

      // FieldValueを取得（getDb()を呼び出した後でないと取得できない場合があるため）
      const FieldValue = admin.firestore.FieldValue;
      
      await goalRef.set(
        {
          deposit: {
            checkoutSessionId: session.id,
            amount: amount,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            refundedAmount: 0,
            refundHistory: [],
          },
        },
        { merge: true },
      );

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      console.error('担保支払いセッション作成エラー:', error);
      throw new Error(`担保支払いセッションの作成に失敗しました: ${error.message}`);
    }
  },
);

