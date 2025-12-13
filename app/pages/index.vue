<script setup lang="ts">
import { navigateTo } from "#app";



// ページ読み込み時に自動でログインページに遷移
await navigateTo("/login", { replace: true });
</script>

<template>
  <main class="grid min-h-screen place-items-center">
    <p class="text-gray-600">リダイレクト中...</p>
  </main>
</template>
