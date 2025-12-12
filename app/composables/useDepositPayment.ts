import { ref } from 'vue';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';

export const useDepositPayment = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const callFunction = async (functionName: string, data: any) => {
    const app = getApp();
    const functions = getFunctions(app, 'asia-northeast1');

    // 開発環境ではエミュレーターに接続
    if (process.env.NODE_ENV === 'development') {
      try {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      } catch (e: any) {
        // 既に接続されている場合は無視
        if (!e.message?.includes('already been called')) {
          console.warn('エミュレーター接続エラー:', e);
        }
      }
    }

    const func = httpsCallable(functions, functionName);
    return await func(data);
  };

  /**
   * 担保支払いのCheckoutセッションを作成する
   */
  const createDepositPayment = async (
    userId: string,
    categoryId: string,
    goalId: string,
    amount: number,
  ): Promise<{ sessionId: string; url: string }> => {
    try {
      loading.value = true;
      error.value = null;

      const result = await callFunction('api_stripe_createDepositPayment', {
        userId,
        categoryId,
        goalId,
        amount,
      });

      if (result.data && (result.data as any).success) {
        return {
          sessionId: (result.data as any).sessionId,
          url: (result.data as any).url,
        };
      } else {
        throw new Error('担保支払いセッションの作成に失敗しました');
      }
    } catch (err: any) {
      console.error('Error creating deposit payment:', err);
      error.value = err?.message || '担保支払いセッションの作成に失敗しました';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 担保支払いのCheckoutセッションを処理する
   */
  const handleDepositPayment = async (sessionId: string): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;

      const result = await callFunction('api_stripe_handleDepositPayment', {
        sessionId,
      });

      if (result.data && (result.data as any).success) {
        return;
      } else {
        throw new Error('担保支払いの処理に失敗しました');
      }
    } catch (err: any) {
      console.error('Error handling deposit payment:', err);
      error.value = err?.message || '担保支払いの処理に失敗しました';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 返金を処理する
   */
  const processRefund = async (
    userId: string,
    categoryId: string,
    goalId: string,
  ): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;

      const result = await callFunction('api_stripe_processRefund', {
        userId,
        categoryId,
        goalId,
      });

      // 返金の必要がない場合も成功として扱う
      return;
    } catch (err: any) {
      console.error('Error processing refund:', err);
      error.value = err?.message || '返金処理に失敗しました';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    createDepositPayment,
    handleDepositPayment,
    processRefund,
  };
};

