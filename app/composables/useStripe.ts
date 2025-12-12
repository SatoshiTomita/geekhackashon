import { ref } from "vue";
import { getApp } from "firebase/app";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";

export const useStripe = () => {
  const hasActiveSubscription = ref<boolean | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * ユーザーのサブスクリプション状態を確認する
   */
  const checkSubscription = async (userId: string): Promise<boolean> => {
    try {
      loading.value = true;
      error.value = null;

      const app = getApp();
      const functions = getFunctions(app, "asia-northeast1");

      // 開発環境ではエミュレーターに接続
      if (process.env.NODE_ENV === "development") {
        try {
          connectFunctionsEmulator(functions, "localhost", 5001);
        } catch (e: any) {
          // 既に接続されている場合は無視
          if (!e.message?.includes("already been called")) {
            console.warn("エミュレーター接続エラー:", e);
          }
        }
      }

      const checkSubscriptionFunction = httpsCallable(
        functions,
        "api_stripe_checkSubscription",
      );

      const result = await checkSubscriptionFunction({ userId });

      if (result.data && (result.data as any).success) {
        const hasSubscription = (result.data as any).hasActiveSubscription;
        hasActiveSubscription.value = hasSubscription;
        return hasSubscription;
      } else {
        throw new Error("サブスクリプション確認に失敗しました");
      }
    } catch (err: any) {
      console.error("Error checking subscription:", err);
      error.value = err?.message || "サブスクリプション確認に失敗しました";
      hasActiveSubscription.value = false;
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    hasActiveSubscription,
    loading,
    error,
    checkSubscription,
  };
};

