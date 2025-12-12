<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div class="text-center">
        <div class="text-yellow-500 text-6xl mb-4">⚠</div>
        <h1 class="text-2xl font-bold mb-2">支払いがキャンセルされました</h1>
        <p class="text-gray-600 mb-6">
          担保金の支払いがキャンセルされました。
        </p>
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
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;

const goToRoadmap = () => {
  router.push(`/users/${userId}`);
};
</script>

