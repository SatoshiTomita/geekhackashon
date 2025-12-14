<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800"
  >
    <div
      class="animate-fade-in w-full max-w-md space-y-5 rounded-2xl bg-white p-10 text-center shadow-xl"
    >
      <div class="mx-auto size-16 rounded-full bg-yellow-100 flex items-center justify-center">
        <svg
          class="size-8 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-800">決済がキャンセルされました</h1>
      <p class="text-gray-600">
        決済がキャンセルされました。目標への賭け金は支払われていません。
      </p>
      <button
        class="w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700"
        @click="router.push(`/users/${userId}`)"
      >
        ロードマップに戻る
      </button>
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

