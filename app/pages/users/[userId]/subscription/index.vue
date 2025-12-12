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

const { hasActiveSubscription, checkSubscription } = useStripe();

const loading = ref(false);
const error = ref<string | null>(null);
const redirecting = ref(false);

const plans = [
  {
    id: "basic",
    name: "ベーシックプラン",
    price: 980,
    priceId: "price_1SdVEBLiqGpfDnvyD0i020Dx",
    features: [
      "目標の設定・管理",
      "ステップの追加",
      "TODOの管理",
      "AIロードマップ生成",
    ],
  },
  {
    id: "premium",
    name: "プレミアムプラン",
    price: 1980,
    priceId: "price_1SdVEBLiqGpfDnvy1GCgUKTt", 
    features: [
      "ベーシックプランのすべて",
      "優先サポート",
      "高度な分析機能",
      "カスタムテンプレート",
    ],
  },
];

onMounted(async () => {
  await checkSubscription(userId);
});

const startCheckout = async (priceId: string) => {
  try {
    loading.value = true;
    error.value = null;

    const app = getApp();
    const functions = getFunctions(app, "asia-northeast1");

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

    const createCheckoutSessionFunction = httpsCallable(
      functions,
      "api_stripe_createCheckoutSession",
    );

    const result = await createCheckoutSessionFunction({
      userId,
      priceId,
    });

    if (result.data && (result.data as any).success) {
      const url = (result.data as any).url;
      if (url) {
        redirecting.value = true;
        // Stripe Checkoutにリダイレクト
        window.location.href = url;
      } else {
        throw new Error("Checkout URLが取得できませんでした");
      }
    } else {
      throw new Error("Checkoutセッションの作成に失敗しました");
    }
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    error.value = err?.message || "決済の開始に失敗しました";
    loading.value = false;
    redirecting.value = false;
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">サブスクリプション</h1>
      <p class="text-gray-600">
        目標を設定するには、有効なサブスクリプションが必要です
      </p>
    </div>

    <!-- 既にサブスクリプションがある場合 -->
    <div
      v-if="hasActiveSubscription === true"
      class="mb-8 rounded-lg bg-green-100 border border-green-400 p-6"
    >
      <div class="flex items-center">
        <svg
          class="w-6 h-6 text-green-600 mr-2"
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
        <div>
          <h2 class="text-xl font-bold text-green-800">
            アクティブなサブスクリプションがあります
          </h2>
          <p class="text-green-700 mt-1">
            目標の設定・管理が可能です
          </p>
        </div>
      </div>
    </div>

    <!-- エラー表示 -->
    <div
      v-if="error"
      class="mb-6 rounded-lg bg-red-100 border border-red-400 p-4 text-red-700"
    >
      <p class="font-semibold mb-2">エラー</p>
      <p>{{ error }}</p>
      <div v-if="error.includes('No such price') || error.includes('prod_')" class="mt-3 p-3 bg-red-200 rounded text-sm">
        <p class="font-semibold mb-1">⚠️ よくある間違い:</p>
        <p>Product ID（<code class="bg-red-300 px-1 rounded">prod_xxxxx</code>）ではなく、<strong>Price ID（<code class="bg-red-300 px-1 rounded">price_xxxxx</code>）</strong>を設定してください。</p>
        <p class="mt-2">Stripeダッシュボードで：</p>
        <ol class="list-decimal list-inside ml-2 mt-1 space-y-1">
          <li>作成したProductを開く</li>
          <li>「Pricing」セクションでPriceを確認</li>
          <li>Price ID（<code class="bg-red-300 px-1 rounded">price_</code>で始まる）をコピー</li>
          <li>このファイルの<code class="bg-red-300 px-1 rounded">priceId</code>に貼り付け</li>
        </ol>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div
      v-if="redirecting"
      class="mb-6 rounded-lg bg-blue-100 border border-blue-400 p-6 text-center"
    >
      <div class="inline-block size-8 animate-spin rounded-full border-b-2 border-blue-600 mb-2"></div>
      <p class="text-blue-800 font-semibold">
        Stripe Checkoutにリダイレクトしています...
      </p>
    </div>

    <!-- プラン一覧 -->
    <div class="grid md:grid-cols-2 gap-6 mb-8">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 transition-colors"
      >
        <h2 class="text-2xl font-bold mb-2">{{ plan.name }}</h2>
        <div class="mb-4">
          <span class="text-4xl font-bold">¥{{ plan.price.toLocaleString() }}</span>
          <span class="text-gray-600">/月</span>
        </div>
        <ul class="mb-6 space-y-2">
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-center text-gray-700"
          >
            <svg
              class="w-5 h-5 text-green-500 mr-2"
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
            {{ feature }}
          </li>
        </ul>
        <button
          class="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          :disabled="loading || redirecting || (hasActiveSubscription ?? false)"
          @click="startCheckout(plan.priceId)"
        >
          {{ loading || redirecting ? "処理中..." : (hasActiveSubscription ?? false) ? "現在のプラン" : "プランを選択" }}
        </button>
      </div>
    </div>

    <!-- 戻るボタン -->
    <div class="text-center">
      <button
        class="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 hover:bg-gray-300 transition-colors"
        @click="router.push(`/users/${userId}`)"
      >
        ロードマップに戻る
      </button>
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

