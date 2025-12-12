<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApp } from "firebase/app";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import { useStripe } from "~/composables/useStripe";

const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;
const sessionId = route.query.session_id as string;

const { checkSubscription } = useStripe();

const loading = ref(true);
const error = ref<string | null>(null);
const success = ref(false);

// セッションを処理してサブスクリプション状態を更新
onMounted(async () => {
  if (!sessionId) {
    error.value = "セッションIDが取得できませんでした";
    loading.value = false;
    return;
  }

  try {
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

    const handleCheckoutSessionFunction = httpsCallable(
      functions,
      "api_stripe_handleCheckoutSession",
    );

    const result = await handleCheckoutSessionFunction({
      sessionId,
    });

    if (result.data && (result.data as any).success) {
      success.value = true;
      // サブスクリプション状態を再確認
      await checkSubscription(userId);
    } else {
      throw new Error("セッションの処理に失敗しました");
    }
  } catch (err: any) {
    console.error("Error handling checkout session:", err);
    error.value = err?.message || "決済の処理に失敗しました";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <!-- ローディング -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="inline-block size-12 animate-spin rounded-full border-b-2 border-blue-600 mb-4"
        ></div>
        <p class="text-gray-600">決済を処理しています...</p>
      </div>

      <!-- 成功 -->
      <div
        v-else-if="success"
        class="rounded-lg bg-green-100 border border-green-400 p-8 text-center"
      >
        <svg
          class="w-16 h-16 text-green-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 class="text-3xl font-bold text-green-800 mb-2">
          サブスクリプションが開始されました！
        </h1>
        <p class="text-green-700 mb-6">
          ありがとうございます。目標の設定・管理が可能になりました。
        </p>
        <button
          class="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          @click="router.push(`/users/${userId}`)"
        >
          ロードマップに戻る
        </button>
      </div>

      <!-- エラー -->
      <div
        v-else-if="error"
        class="rounded-lg bg-red-100 border border-red-400 p-8 text-center"
      >
        <svg
          class="w-16 h-16 text-red-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 class="text-3xl font-bold text-red-800 mb-2">
          エラーが発生しました
        </h1>
        <p class="text-red-700 mb-6">{{ error }}</p>
        <button
          class="rounded-lg bg-gray-200 px-6 py-3 text-gray-700 hover:bg-gray-300 transition-colors"
          @click="router.push(`/users/${userId}/subscription`)"
        >
          サブスクリプションページに戻る
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
</style>

