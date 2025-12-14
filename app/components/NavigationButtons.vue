<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signOut } from "firebase/auth";

const props = defineProps<{
  userId: string;
}>();

const route = useRoute();
const router = useRouter();
const { $auth } = useNuxtApp();

// 現在のページパスを取得
const currentPath = computed(() => route.path);

// ロードマップページかどうか
const isRoadmapPage = computed(() => {
  return currentPath.value === `/users/${props.userId}`;
});

// 分析ページかどうか
const isAnalyzePage = computed(() => {
  return currentPath.value === `/users/${props.userId}/analyze`;
});

// ナビゲーション
const navigateToRoadmap = () => {
  router.push(`/users/${props.userId}`);
};

const navigateToAnalyze = () => {
  router.push(`/users/${props.userId}/analyze`);
};

// ログアウト処理
const handleLogout = async () => {
  try {
    await signOut($auth);
    router.push("/login");
  } catch (err: any) {
    console.error("ログアウトエラー:", err);
    alert("ログアウトに失敗しました: " + (err.message || "不明なエラー"));
  }
};
</script>

<template>
  <div class="flex gap-2">
    <button
      :class="`w-8 h-8 rounded flex items-center justify-center transition-colors ${
        isRoadmapPage
          ? 'bg-purple-500 hover:bg-purple-600'
          : 'bg-gray-200 hover:bg-gray-300'
      }`"
      :title="'ロードマップ'"
      @click="navigateToRoadmap"
    >
      <svg
        :class="`w-5 h-5 ${isRoadmapPage ? 'text-white' : 'text-gray-600'}`"
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
    </button>
    <button
      :class="`w-8 h-8 rounded flex items-center justify-center transition-colors ${
        isAnalyzePage
          ? 'bg-purple-500 hover:bg-purple-600'
          : 'bg-gray-200 hover:bg-gray-300'
      }`"
      :title="'分析'"
      @click="navigateToAnalyze"
    >
      <svg
        :class="`w-5 h-5 ${isAnalyzePage ? 'text-white' : 'text-gray-600'}`"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </button>
    <button
      class="w-8 h-8 rounded flex items-center justify-center transition-colors bg-gray-200 hover:bg-red-500 group"
      :title="'ログアウト'"
      @click="handleLogout"
    >
      <svg
        class="w-5 h-5 text-gray-600 group-hover:text-white transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </button>
  </div>
</template>
