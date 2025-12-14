<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;
const sessionId = route.query.session_id as string;

const loading = ref(true);
const error = ref("");

// 決済成功処理
onMounted(async () => {
  if (!sessionId) {
    error.value = "セッションIDが取得できませんでした";
    loading.value = false;
    return;
  }

  try {
    // Stripeセッションを確認してFirestoreを更新するCloud Functionを呼び出す
    const { $functions } = useNuxtApp();
    const { httpsCallable } = await import("firebase/functions");

    const handleCheckoutSession = httpsCallable(
      $functions as any,
      "api_stripe_handleCheckoutSession",
    );

    const result = await handleCheckoutSession({
      sessionId,
    });

    const resultData = result.data as any;
    if (!resultData.success) {
      throw new Error(resultData.error || "決済処理に失敗しました");
    }

    // 3秒後にロードマップページにリダイレクト
    setTimeout(() => {
      router.push(`/users/${userId}`);
    }, 3000);
  } catch (err: any) {
    console.error("Payment success error:", err);
    error.value = err?.message || "決済処理に失敗しました";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800"
  >
    <div
      class="animate-fade-in w-full max-w-md space-y-5 rounded-2xl bg-white p-10 text-center shadow-xl"
    >
      <div v-if="loading" class="space-y-4">
        <div
          class="mx-auto size-16 animate-spin rounded-full border-b-4 border-purple-500"
        ></div>
        <p class="text-gray-600">決済を処理しています...</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <div class="mx-auto size-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            class="size-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">エラーが発生しました</h1>
        <p class="text-red-600">{{ error }}</p>
        <button
          class="w-full rounded-xl bg-gray-600 px-4 py-3 font-semibold text-white transition hover:bg-gray-700"
          @click="router.push(`/users/${userId}`)"
        >
          ロードマップに戻る
        </button>
      </div>

      <div v-else class="space-y-4">
        <div class="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            class="size-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">決済が完了しました！</h1>
        <p class="text-gray-600">
          目標への賭け金の支払いが正常に完了しました。
        </p>
        <p class="text-sm text-gray-500">
          3秒後にロードマップページにリダイレクトします...
        </p>
        <button
          class="w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700"
          @click="router.push(`/users/${userId}`)"
        >
          今すぐロードマップに戻る
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.8s ease-out;
}
</style>

