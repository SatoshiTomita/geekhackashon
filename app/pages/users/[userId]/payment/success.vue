<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div class="text-center">
        <div class="text-green-500 text-6xl mb-4">✓</div>
        <h1 class="text-2xl font-bold mb-2">支払いが完了しました</h1>
        <p class="text-gray-600 mb-6">
          担保金の支払いが正常に完了しました。
        </p>
        <div v-if="loading" class="text-gray-500">
          処理中...
        </div>
        <div v-else-if="error" class="text-red-500 mb-4">
          {{ error }}
        </div>
        <div v-else class="text-green-600 mb-6">
          支払い情報を保存しました。
        </div>
        <button
          @click="goToRoadmap"
          class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          ロードマップに戻る
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDepositPayment } from '~/composables/useDepositPayment';

const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;
const sessionId = route.query.session_id as string;

const { handleDepositPayment, loading, error } = useDepositPayment();

onMounted(async () => {
  if (!sessionId) {
    error.value = 'セッションIDが取得できませんでした';
    return;
  }

  try {
    await handleDepositPayment(sessionId);
  } catch (err: any) {
    console.error('支払い処理エラー:', err);
    error.value = err?.message || '支払い処理に失敗しました';
  }
});

const goToRoadmap = () => {
  router.push(`/users/${userId}`);
};
</script>

