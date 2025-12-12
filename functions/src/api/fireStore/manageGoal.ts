import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

/**
 * ユーザーのサブスクリプション状態を確認するヘルパー関数
 */
async function checkUserSubscription(userId: string): Promise<boolean> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEYが設定されていません');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });

  const db = getDb();
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return false;
  }

  const userData = userSnap.data();
  const stripeCustomerId = userData?.stripeCustomerId;

  if (!stripeCustomerId) {
    return false;
  }

  // Stripeから顧客のサブスクリプションを取得
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 1,
  });

  return subscriptions.data.length > 0;
}

/**
 * 目標を追加するCloud Function
 */
export const addGoal = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId, categoryId, goalData } = request.data;

    if (!userId || !categoryId || !goalData) {
      throw new Error('userId, categoryId, goalDataは必須です');
    }

    // サブスクリプション状態を確認
    const hasActiveSubscription = await checkUserSubscription(userId);
    if (!hasActiveSubscription) {
      throw new Error('目標を設定するには有効なサブスクリプションが必要です');
    }

    try {
      const db = getDb();
      const goalsRef = db
        .collection('users')
        .doc(userId)
        .collection('category')
        .doc(categoryId)
        .collection('goals');

      const docRef = await goalsRef.add(goalData);

      return {
        success: true,
        goalId: docRef.id,
      };
    } catch (error: any) {
      console.error('目標追加エラー:', error);
      throw new Error(`目標の追加に失敗しました: ${error.message}`);
    }
  },
);

/**
 * 目標を更新するCloud Function
 */
export const updateGoal = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId, categoryId, goalId, goalData } = request.data;

    if (!userId || !categoryId || !goalId || !goalData) {
      throw new Error('userId, categoryId, goalId, goalDataは必須です');
    }

    // サブスクリプション状態を確認
    const hasActiveSubscription = await checkUserSubscription(userId);
    if (!hasActiveSubscription) {
      throw new Error('目標を更新するには有効なサブスクリプションが必要です');
    }

    try {
      const db = getDb();
      const goalRef = db
        .collection('users')
        .doc(userId)
        .collection('category')
        .doc(categoryId)
        .collection('goals')
        .doc(goalId);

      await goalRef.set(goalData, { merge: true });

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('目標更新エラー:', error);
      throw new Error(`目標の更新に失敗しました: ${error.message}`);
    }
  },
);

/**
 * 目標を削除するCloud Function
 */
export const deleteGoal = onCall(
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

    // サブスクリプション状態を確認
    const hasActiveSubscription = await checkUserSubscription(userId);
    if (!hasActiveSubscription) {
      throw new Error('目標を削除するには有効なサブスクリプションが必要です');
    }

    try {
      const db = getDb();
      const goalRef = db
        .collection('users')
        .doc(userId)
        .collection('category')
        .doc(categoryId)
        .collection('goals')
        .doc(goalId);

      await goalRef.delete();

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('目標削除エラー:', error);
      throw new Error(`目標の削除に失敗しました: ${error.message}`);
    }
  },
);

