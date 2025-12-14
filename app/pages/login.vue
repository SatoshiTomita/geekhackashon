<script setup lang="ts">
  import { ref, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { signInWithPopup, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
  import type { User } from "firebase/auth";
  
  const router = useRouter();
  const { $auth, $ensureUserDoc } = useNuxtApp();
  
  // ユーザー名入力（従来の方法用）
  const username = ref("");
  
  // UI
  const error = ref("");
  const loading = ref(false);
  const currentUser = ref<User | null>(null);
  
  // 認証状態の監視
  onMounted(() => {
    onAuthStateChanged($auth, async (user) => {
      currentUser.value = user;
      if (user) {
        // ユーザードキュメントの作成/更新
        await $ensureUserDoc(user.uid, {
          email: user.email,
          displayName: user.displayName,
        });
        // ユーザーページに遷移
        router.push(`/users/${user.uid}`);
      }
    });
  });
  
  // Googleログイン処理
  const loginWithGoogle = async () => {
    try {
      error.value = "";
      loading.value = true;
  
      const provider = new GoogleAuthProvider();
      await signInWithPopup($auth, provider);
      
      // onAuthStateChangedで自動的にリダイレクトされる
    } catch (err: any) {
      console.error("Googleログインエラー:", err);
      error.value = "ログインに失敗しました: " + (err.message || "不明なエラー");
      loading.value = false;
    }
  };
  
  // 従来のログイン処理（ユーザー名入力）
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

  // ログアウト処理
  const logout = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      await signOut($auth);
      // ログアウト後、ログインページにリダイレクト
      router.push("/login");
    } catch (err: any) {
      console.error("ログアウトエラー:", err);
      error.value = "ログアウトに失敗しました: " + (err.message || "不明なエラー");
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
        <p class="text-gray-600">ログイン方法を選択してください</p>
        
        <!-- 既にログインしている場合の表示 -->
        <div v-if="currentUser" class="rounded-lg bg-blue-50 p-4">
          <p class="mb-2 text-sm text-gray-700">
            <span class="font-semibold">{{ currentUser.displayName || currentUser.email }}</span> としてログイン中
          </p>
          <button
            class="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            @click="logout"
          >
            ログアウト
          </button>
        </div>
  
        <div class="space-y-4">
          <!-- Googleログインボタン -->
          <button
            :disabled="loading"
            class="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-gray-700 shadow-md transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            @click="loginWithGoogle"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span v-if="!loading">Googleでログイン</span>
            <span v-else>ログイン中...</span>
          </button>
  
          <!-- 区切り線 -->
          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-2 text-gray-500">または</span>
            </div>
          </div>
  
          <!-- 従来のユーザー名入力 -->
          <div class="space-y-4">
            <input
              v-model="username"
              type="text"
              placeholder="ユーザー名（テスト用）"
              class="w-full rounded-lg border border-gray-300 p-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              @keydown="handleKeydown"
            />
  
            <button
              class="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              @click="login"
            >
              ユーザー名でログイン
            </button>
          </div>
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
  