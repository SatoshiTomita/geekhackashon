<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <div class="rounded-lg bg-yellow-100 border border-yellow-400 p-8 text-center">
        <svg
          class="w-16 h-16 text-yellow-600 mx-auto mb-4"
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
        <h1 class="text-3xl font-bold text-yellow-800 mb-2">
          決済がキャンセルされました
        </h1>
        <p class="text-yellow-700 mb-6">
          サブスクリプションの登録は完了していません。
        </p>
        <div class="flex gap-4 justify-center">
          <button
            class="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            @click="router.push(`/users/${userId}/subscription`)"
          >
            再度お試しください
          </button>
          <button
            class="rounded-lg bg-gray-200 px-6 py-3 text-gray-700 hover:bg-gray-300 transition-colors"
            @click="router.push(`/users/${userId}`)"
          >
            ロードマップに戻る
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

