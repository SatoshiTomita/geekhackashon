import { ref } from "vue";
import { getApp } from "firebase/app";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import type { Goal } from "../../@types/goal";

export const useGoalManagement = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Cloud Functionsを呼び出すヘルパー関数
   */
  const callFunction = async (functionName: string, data: any) => {
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

    const functionCall = httpsCallable(functions, functionName);
    return await functionCall(data);
  };

  /**
   * 目標を追加する
   */
  const addGoal = async (
    userId: string,
    categoryId: string,
    goalData: Goal,
  ): Promise<string> => {
    try {
      loading.value = true;
      error.value = null;

      const result = await callFunction("api_fireStore_addGoal", {
        userId,
        categoryId,
        goalData,
      });

      if (result.data && (result.data as any).success) {
        return (result.data as any).goalId;
      } else {
        throw new Error("目標の追加に失敗しました");
      }
    } catch (err: any) {
      console.error("Error adding goal:", err);
      error.value = err?.message || "目標の追加に失敗しました";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 目標を更新する
   */
  const updateGoal = async (
    userId: string,
    categoryId: string,
    goalId: string,
    goalData: Partial<Goal>,
  ): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;

      const result = await callFunction("api_fireStore_updateGoal", {
        userId,
        categoryId,
        goalId,
        goalData,
      });

      if (result.data && (result.data as any).success) {
        return;
      } else {
        throw new Error("目標の更新に失敗しました");
      }
    } catch (err: any) {
      console.error("Error updating goal:", err);
      error.value = err?.message || "目標の更新に失敗しました";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 目標を削除する
   */
  const deleteGoal = async (
    userId: string,
    categoryId: string,
    goalId: string,
  ): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;

      const result = await callFunction("api_fireStore_deleteGoal", {
        userId,
        categoryId,
        goalId,
      });

      if (result.data && (result.data as any).success) {
        return;
      } else {
        throw new Error("目標の削除に失敗しました");
      }
    } catch (err: any) {
      console.error("Error deleting goal:", err);
      error.value = err?.message || "目標の削除に失敗しました";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    addGoal,
    updateGoal,
    deleteGoal,
  };
};

