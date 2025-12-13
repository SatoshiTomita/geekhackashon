<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// ユーザー名入力
const username = ref("");

// UI
const error = ref("");

// ログイン処理
const login = () => {
  error.value = "";

  // ユーザー名のバリデーション
  if (!username.value.trim()) {
    error.value = "ユーザー名を入力してください";
    return;
  }

  // ユーザーページに遷移
  router.push(`/users/${username.value.trim()}`);
};

// Enterキーでログイン
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    login();
  }
};
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800"
  >
    <div
      class="animate-fade-in w-full max-w-sm space-y-5 rounded-2xl bg-white p-10 text-center shadow-xl"
    >
      <h1 class="text-2xl font-bold text-gray-800">ようこそ</h1>
      <p class="text-gray-600">ユーザー名を入力してください</p>

      <div class="space-y-4">
        <input
          v-model="username"
          type="text"
          placeholder="ユーザー名"
          class="w-full rounded-lg border border-gray-300 p-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          @keydown="handleKeydown"
        />

        <button
          class="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          @click="login"
        >
          ログイン
        </button>
      </div>

      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
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
