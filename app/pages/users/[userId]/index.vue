<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { TodoDoc } from "../../../../@types/todoDoc";
import GoalCard from "~/components/GoalCard.vue";
import NavigationButtons from "~/components/NavigationButtons.vue";
import { useFireStore } from "~/composables/useFireStore";
import { useGoalManagement } from "~/composables/useGoalManagement";
import { useStripe } from "~/composables/useStripe";
import { useDepositPayment } from "~/composables/useDepositPayment";

// ルートパラメータからuserIdを取得
const route = useRoute();
const router = useRouter();
const userId = route.params.userId as string;

// カテゴリの定義
const categories = [
  { id: "health", label: "健康" },
  { id: "life", label: "生活" },
  { id: "study", label: "学習" },
  { id: "work", label: "仕事" },
] as const;

// 選択中のカテゴリ
const selectedCategoryId = ref<string>("health");

// Firestore composable
const {
  getAllGoalsWithSteps,
  addStep,
  updateStep,
  deleteStep,
  addTodo,
  updateTodo,
  deleteTodo,
  calculateAndUpdateGoalRatio,
  getCategoryRatio,
} = useFireStore();

// Goal管理（課金チェック付き）
const {
  addGoal: addGoalWithSubscription,
  updateGoal: updateGoalWithSubscription,
  deleteGoal: deleteGoalWithSubscription,
} = useGoalManagement();

// Stripe composable
const { hasActiveSubscription, checkSubscription } = useStripe();

// 担保支払い composable
const { createDepositPayment, processRefund } = useDepositPayment();

// Todoの型定義
type TodoWithId = TodoDoc & {
  id: string;
};

// ステップの型定義
type StepWithChildren = {
  id: string;
  title: string;
  steps: StepWithChildren[];
  todos?: TodoWithId[];
};

type GoalWithSteps = {
  id: string;
  title: string;
  ratio: number;
  steps: StepWithChildren[];
  todos?: TodoWithId[];
};

// データ状態
const goals = ref<GoalWithSteps[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const categoryRatio = ref<number>(0);

// モーダル状態
const showStepModal = ref(false);
const showTodoModal = ref(false);
const showGoalModal = ref(false);
const editingStep = ref<{
  goalId: string;
  stepId?: string;
  stepPath: string[];
  title: string;
} | null>(null);
const editingTodo = ref<{
  goalId: string;
  todoId?: string;
  stepPath: string[];
  task: string;
  isFinished: boolean;
  weight?: number;
} | null>(null);
const editingGoal = ref<{
  goalId?: string;
  title: string;
} | null>(null);

// フォーム状態
const stepTitle = ref("");
const todoTask = ref("");
const todoIsFinished = ref(false);
const todoWeight = ref<number | undefined>(undefined);
const goalTitle = ref("");
const goalDepositAmount = ref<number | undefined>(undefined);
const saving = ref(false);

// Firestoreからデータを取得
const fetchRoadmapData = async () => {
  try {
    loading.value = true;
    error.value = null;
    const data = await getAllGoalsWithSteps(userId, selectedCategoryId.value);
    // 新しい配列を作成してリアクティビティを確実にトリガー
    goals.value = [...data];

    // カテゴリ達成率を取得
    const ratio = await getCategoryRatio(userId, selectedCategoryId.value);
    categoryRatio.value = ratio;
  } catch (err: any) {
    console.error("Error fetching roadmap data:", err);
    error.value = err?.message || "ロードマップデータの取得に失敗しました";
  } finally {
    loading.value = false;
  }
};

// カテゴリを変更
const changeCategory = (categoryId: string) => {
  selectedCategoryId.value = categoryId;
  fetchRoadmapData();
};

// コンポーネントマウント時にデータを取得
onMounted(async () => {
  // サブスクリプション状態を確認
  await checkSubscription(userId);
  fetchRoadmapData();
});

// ステップ追加・編集モーダルを開く
const openStepModal = (
  goalId: string,
  stepPath: string[] = [],
  stepId?: string,
  title?: string,
) => {
  editingStep.value = {
    goalId,
    stepId,
    stepPath,
    title: title || "",
  };
  stepTitle.value = title || "";
  showStepModal.value = true;
};

// ステップモーダルを閉じる
const closeStepModal = () => {
  showStepModal.value = false;
  editingStep.value = null;
  stepTitle.value = "";
};

// ステップを保存
const saveStep = async () => {
  if (!editingStep.value || !stepTitle.value.trim()) {
    return;
  }

  try {
    saving.value = true;
    if (editingStep.value.stepId) {
      // 更新
      await updateStep(
        userId,
        selectedCategoryId.value,
        editingStep.value.goalId,
        editingStep.value.stepId,
        { title: stepTitle.value },
        editingStep.value.stepPath,
      );
    } else {
      // 追加
      await addStep(
        userId,
        selectedCategoryId.value,
        editingStep.value.goalId,
        { title: stepTitle.value },
        editingStep.value.stepPath,
      );
    }
    closeStepModal();
    await fetchRoadmapData();
  } catch (err: any) {
    console.error("Error saving step:", err);
    error.value = err?.message || "ステップの保存に失敗しました";
  } finally {
    saving.value = false;
  }
};

// ステップを削除
const handleDeleteStep = async (
  goalId: string,
  stepId: string,
  stepPath: string[] = [],
) => {
  if (!confirm("このステップを削除しますか？")) {
    return;
  }

  try {
    await deleteStep(
      userId,
      selectedCategoryId.value,
      goalId,
      stepId,
      stepPath,
    );
    await fetchRoadmapData();
  } catch (err: any) {
    console.error("Error deleting step:", err);
    error.value = err?.message || "ステップの削除に失敗しました";
  }
};

// タスク追加・編集モーダルを開く
const openTodoModal = (
  goalId: string,
  stepPath: string[] = [],
  todoId?: string,
  task?: string,
  isFinished?: boolean,
  weight?: number,
) => {
  editingTodo.value = {
    goalId,
    todoId,
    stepPath,
    task: task || "",
    isFinished: isFinished || false,
    weight,
  };
  todoTask.value = task || "";
  todoIsFinished.value = isFinished || false;
  todoWeight.value = weight;
  showTodoModal.value = true;
};

// タスクモーダルを閉じる
const closeTodoModal = () => {
  showTodoModal.value = false;
  editingTodo.value = null;
  todoTask.value = "";
  todoIsFinished.value = false;
  todoWeight.value = undefined;
};

// タスクを保存
const saveTodo = async () => {
  if (!editingTodo.value || !todoTask.value.trim()) {
    return;
  }

  try {
    saving.value = true;
    const todoData: TodoDoc = {
      task: todoTask.value,
      isFinished: todoIsFinished.value,
      weight: todoWeight.value,
    };

    if (editingTodo.value.todoId) {
      // 更新
      await updateTodo(
        userId,
        selectedCategoryId.value,
        editingTodo.value.goalId,
        editingTodo.value.todoId,
        todoData,
        editingTodo.value.stepPath,
      );
    } else {
      // 追加
      await addTodo(
        userId,
        selectedCategoryId.value,
        editingTodo.value.goalId,
        todoData,
        editingTodo.value.stepPath,
      );
    }
    closeTodoModal();
    await fetchRoadmapData();
  } catch (err: any) {
    console.error("Error saving todo:", err);
    error.value = err?.message || "タスクの保存に失敗しました";
  } finally {
    saving.value = false;
  }
};

// 目標を追加・編集モーダルを開く
const openGoalModal = (goalId?: string, title?: string) => {
  editingGoal.value = {
    goalId: goalId || undefined,
    title: title || "",
  };
  goalTitle.value = title || "";
  goalDepositAmount.value = undefined; // 編集時は担保金額をリセット
  showGoalModal.value = true;
};

// 目標モーダルを閉じる
const closeGoalModal = () => {
  showGoalModal.value = false;
  editingGoal.value = null;
  goalTitle.value = "";
  goalDepositAmount.value = undefined;
};

// 目標を保存
const saveGoal = async () => {
  if (!goalTitle.value.trim()) {
    return;
  }

  // 課金状態を確認
  if (hasActiveSubscription.value !== true) {
    error.value = "目標を設定するには有効なサブスクリプションが必要です";
    closeGoalModal();
    router.push(`/users/${userId}/subscription`);
    return;
  }

  try {
    saving.value = true;
    
    if (editingGoal.value?.goalId) {
      // 更新
      await updateGoalWithSubscription(
        userId,
        selectedCategoryId.value,
        editingGoal.value.goalId,
        {
          title: goalTitle.value,
        },
      );
      closeGoalModal();
      await fetchRoadmapData();
    } else {
      // 追加
      // 追加
      const result = await addGoalWithSubscription(userId, selectedCategoryId.value, {
        title: goalTitle.value,
        ratio: 0,
      });
      
      // 担保金額が入力されている場合、支払いフローを開始
      if (goalDepositAmount.value && goalDepositAmount.value > 0 && result.goalId) {
        try {
          const depositResult = await createDepositPayment(
            userId,
            selectedCategoryId.value,
            result.goalId,
            goalDepositAmount.value,
          );
          
          // Stripe Checkoutにリダイレクト
          if (depositResult.url) {
            window.location.href = depositResult.url;
            return; // リダイレクトするので、ここで処理を終了
          }
        } catch (depositErr: any) {
          console.error("担保支払いエラー:", depositErr);
          error.value = `目標は作成されましたが、担保支払いに失敗しました: ${depositErr?.message || "不明なエラー"}`;
          // 目標は作成されているので、モーダルを閉じてデータを再取得
          closeGoalModal();
          await fetchRoadmapData();
          return;
        }
      }
      
      closeGoalModal();
      await fetchRoadmapData();
    }
  } catch (err: any) {
    console.error("Error saving goal:", err);
    error.value = err?.message || "目標の保存に失敗しました";
  } finally {
    saving.value = false;
  }
};

// 目標を削除
const handleDeleteGoal = async (goalId: string) => {
  if (
    !confirm(
      "この目標を削除しますか？目標配下のすべてのステップとタスクも削除されます。",
    )
  ) {
    return;
  }

  // 課金状態を確認
  if (hasActiveSubscription.value !== true) {
    error.value = "目標を削除するには有効なサブスクリプションが必要です";
    router.push(`/users/${userId}/subscription`);
    return;
  }

  try {
    saving.value = true;
    await deleteGoalWithSubscription(userId, selectedCategoryId.value, goalId);
    await fetchRoadmapData();
  } catch (err: any) {
    console.error("Error deleting goal:", err);
    error.value = err?.message || "目標の削除に失敗しました";
  } finally {
    saving.value = false;
  }
};

// todoの達成状態を切り替え
const toggleTodoCompletion = async (
  goalId: string,
  todoId: string,
  stepPath: string[],
  currentStatus: boolean,
) => {
  try {
    saving.value = true;
    await updateTodo(
      userId,
      selectedCategoryId.value,
      goalId,
      todoId,
      { isFinished: !currentStatus },
      stepPath,
    );

    // 達成率を再計算
    await calculateAndUpdateGoalRatio(userId, selectedCategoryId.value, goalId);
    
    // 返金処理を実行（バックグラウンドで実行、エラーは無視）
    processRefund(userId, selectedCategoryId.value, goalId).catch((err) => {
      console.error('返金処理エラー:', err);
    });

    // UIを更新
    const goal = goals.value.find((g) => g.id === goalId);
    if (goal) {
      if (stepPath.length === 0) {
        // Goal配下のtodo
        const todo = goal.todos?.find((t) => t.id === todoId);
        if (todo) {
          todo.isFinished = !currentStatus;
        }
      } else {
        // Step配下のtodo
        const findAndUpdateTodo = (
          steps: StepWithChildren[],
          path: string[],
        ): boolean => {
          if (path.length === 0) return false;
          const step = steps.find((s) => s.id === path[0]);
          if (!step) return false;
          if (path.length === 1) {
            const todo = step.todos?.find((t) => t.id === todoId);
            if (todo) {
              todo.isFinished = !currentStatus;
              return true;
            }
            return false;
          }
          return findAndUpdateTodo(step.steps, path.slice(1));
        };
        findAndUpdateTodo(goal.steps, stepPath);
      }
    }

    // バックグラウンドでデータを再取得
    setTimeout(async () => {
      try {
        await fetchRoadmapData();
      } catch (err) {
        console.error("Background refresh failed:", err);
      }
    }, 500);
  } catch (err: any) {
    console.error("Error toggling todo completion:", err);
    error.value = err?.message || "タスクの状態更新に失敗しました";
  } finally {
    saving.value = false;
  }
};

// タスクを削除
const handleDeleteTodo = async (
  goalId: string,
  todoId: string,
  stepPath: string[] = [],
) => {
  if (!confirm("このタスクを削除しますか？")) {
    return;
  }

  try {
    await deleteTodo(
      userId,
      selectedCategoryId.value,
      goalId,
      todoId,
      stepPath,
    );

    // UIから直接削除（即座に反映）
    const goal = goals.value.find((g) => g.id === goalId);
    if (goal) {
      if (stepPath.length === 0) {
        // Goal配下のtodo
        if (goal.todos) {
          const index = goal.todos.findIndex((t) => t.id === todoId);
          if (index !== -1) {
            goal.todos.splice(index, 1);
            if (goal.todos.length === 0) {
              goal.todos = undefined;
            }
          } else {
            console.warn("Todo not found in goal todos:", todoId);
          }
        }
      } else {
        // Step配下のtodoを再帰的に検索して削除
        const removeTodoFromSteps = (
          steps: StepWithChildren[],
          path: string[],
        ): boolean => {
          if (path.length === 0) {
            console.warn("Empty path when trying to remove todo from steps");
            return false;
          }
          const step = steps.find((s) => s.id === path[0]);
          if (!step) {
            console.warn("Step not found in path:", path[0]);
            return false;
          }
          if (path.length === 1) {
            // このステップのtodoを削除
            if (step.todos) {
              const index = step.todos.findIndex((t) => t.id === todoId);
              if (index !== -1) {
                step.todos.splice(index, 1);
                if (step.todos.length === 0) {
                  step.todos = undefined;
                }
                return true;
              } else {
                console.warn(
                  "Todo not found in step todos:",
                  todoId,
                  step.title,
                );
              }
            } else {
              console.warn("Step has no todos:", step.title);
            }
            return false;
          }
          // 子ステップを再帰的に検索
          return removeTodoFromSteps(step.steps, path.slice(1));
        };
        const removed = removeTodoFromSteps(goal.steps, stepPath);
        if (!removed) {
          console.warn("Failed to remove todo from steps, path:", stepPath);
        }
      }
    } else {
      console.warn("Goal not found:", goalId);
    }

    // バックグラウンドでデータを再取得（確実にFirestoreと同期）
    setTimeout(async () => {
      try {
        await fetchRoadmapData();
      } catch (e) {
        console.error(e);
      }
    }, 500);
  } catch (err: any) {
    console.error("Error deleting todo:", err);
    error.value = err?.message || "タスクの削除に失敗しました";
  }
};

// RoadmapStepコンポーネントはGoalCardコンポーネント内に移動しました
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold">ロードマップ</h1>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-4">
          <button
            v-if="hasActiveSubscription === false"
            class="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 transition-colors"
            @click="router.push(`/users/${userId}/subscription`)"
          >
            💳 サブスクリプション登録
          </button>
          <button
            class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            :disabled="hasActiveSubscription !== true"
            @click="() => openGoalModal()"
            :title="hasActiveSubscription !== true ? '目標を設定するには有効なサブスクリプションが必要です' : ''"
          >
            + 目標を追加
          </button>
          <NavigationButtons :user-id="userId" />
        </div>
      </div>
    </div>

    <!-- カテゴリタブ -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex space-x-8" aria-label="カテゴリタブ">
        <button
          v-for="category in categories"
          :key="category.id"
          :class="`py-4 px-1 border-b-2 font-medium text-sm ${
            selectedCategoryId === category.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`"
          @click="changeCategory(category.id)"
        >
          {{ category.label }}
        </button>
      </nav>
    </div>

    <!-- カテゴリ達成率表示 -->
    <div
      v-if="!loading && !error"
      class="mb-8 rounded-lg bg-blue-100 p-4 shadow-sm"
    >
      <h2 class="text-xl font-bold text-blue-800">
        カテゴリ達成率: {{ categoryRatio }}%
      </h2>
    </div>

    <!-- ローディング状態 -->
    <div v-if="loading" class="py-12 text-center">
      <div
        class="inline-block size-8 animate-spin rounded-full border-b-2 border-gray-900"
      ></div>
      <p class="mt-4 text-gray-600">読み込み中...</p>
    </div>

    <!-- エラー状態 -->
    <div
      v-else-if="error"
      class="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700"
    >
      <p class="font-semibold">エラーが発生しました</p>
      <p>{{ error }}</p>
    </div>

    <!-- ロードマップ表示 -->
    <div v-else-if="goals.length > 0" class="space-y-8">
      <GoalCard
        v-for="goal in goals"
        :key="goal.id"
        :goal="goal"
        :saving="saving"
        @edit-goal="(goalId: string, title: string) => openGoalModal(goalId, title)"
        @delete-goal="handleDeleteGoal"
        @add-step="(goalId: string) => openStepModal(goalId)"
        @add-todo="(goalId: string) => openTodoModal(goalId)"
        @edit-todo="
          (
            goalId: string,
            todoId: string,
            task: string,
            isFinished: boolean,
            weight?: number,
          ) => openTodoModal(goalId, [], todoId, task, isFinished, weight)
        "
        @delete-todo="
          (goalId: string, todoId: string) =>
            handleDeleteTodo(goalId, todoId, [])
        "
        @toggle-todo="
          (goalId: string, todoId: string, currentStatus: boolean) => {
            toggleTodoCompletion(goalId, todoId, [], currentStatus);
          }
        "
        @edit-step="
          (goalId: string, stepPath: string[], stepId: string, title: string) =>
            openStepModal(goalId, stepPath, stepId, title)
        "
        @delete-step="
          (goalId: string, stepPath: string[], stepId: string) =>
            handleDeleteStep(goalId, stepId, stepPath)
        "
        @add-sub-step="
          (goalId: string, stepPath: string[]) =>
            openStepModal(goalId, stepPath)
        "
        @add-todo-to-step="
          (goalId: string, stepPath: string[]) =>
            openTodoModal(goalId, stepPath)
        "
        @edit-todo-in-step="
          (
            goalId: string,
            stepPath: string[],
            todoId: string,
            task: string,
            isFinished: boolean,
            weight?: number,
          ) => openTodoModal(goalId, stepPath, todoId, task, isFinished, weight)
        "
        @delete-todo-in-step="
          (goalId: string, stepPath: string[], todoId: string) =>
            handleDeleteTodo(goalId, todoId, stepPath)
        "
        @toggle-todo-in-step="
          (
            goalId: string,
            stepPath: string[],
            todoId: string,
            currentStatus: boolean,
          ) => toggleTodoCompletion(goalId, todoId, stepPath, currentStatus)
        "
      />
    </div>

    <!-- データなし状態 -->
    <div v-else class="py-12 text-center">
      <p class="text-gray-600">ロードマップデータがありません</p>
    </div>

    <!-- ステップ追加・編集モーダル -->
    <div
      v-if="showStepModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="closeStepModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6">
        <h2 class="mb-4 text-xl font-bold">
          {{ editingStep?.stepId ? "ステップを編集" : "ステップを追加" }}
        </h2>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            タイトル
          </label>
          <input
            v-model="stepTitle"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ステップのタイトルを入力"
          />
        </div>
        <div class="flex justify-end gap-3">
          <button
            class="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            :disabled="saving"
            @click="closeStepModal"
          >
            キャンセル
          </button>
          <button
            class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            :disabled="saving || !stepTitle.trim()"
            @click="saveStep"
          >
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>

    <!-- 目標追加・編集モーダル -->
    <div
      v-if="showGoalModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="closeGoalModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6">
        <h2 class="mb-4 text-xl font-bold">
          {{ editingGoal?.goalId ? "目標を編集" : "目標を追加" }}
        </h2>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            タイトル
          </label>
          <input
            v-model="goalTitle"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="目標のタイトルを入力"
          />
        </div>
        <div v-if="!editingGoal?.goalId" class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            担保金額（円、任意）
          </label>
          <input
            v-model.number="goalDepositAmount"
            type="number"
            min="0"
            step="1"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="目標達成に応じて返金されます（25%ずつ）"
          />
          <p class="mt-1 text-xs text-gray-500">
            担保金額を設定すると、目標達成率に応じて25%ずつ返金されます
          </p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            class="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            :disabled="saving"
            @click="closeGoalModal"
          >
            キャンセル
          </button>
          <button
            class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            :disabled="saving || !goalTitle.trim()"
            @click="saveGoal"
          >
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>

    <!-- タスク追加・編集モーダル -->
    <div
      v-if="showTodoModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="closeTodoModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6">
        <h2 class="mb-4 text-xl font-bold">
          {{ editingTodo?.todoId ? "タスクを編集" : "タスクを追加" }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">
              タスク
            </label>
            <input
              v-model="todoTask"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="タスクを入力"
            />
          </div>
          <div>
            <label class="flex items-center">
              <input v-model="todoIsFinished" type="checkbox" class="mr-2" />
              <span class="text-sm font-medium text-gray-700">完了済み</span>
            </label>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">
              重み（オプション）
            </label>
            <input
              v-model.number="todoWeight"
              type="number"
              min="0"
              step="0.1"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="重みを入力"
            />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            :disabled="saving"
            @click="closeTodoModal"
          >
            キャンセル
          </button>
          <button
            class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            :disabled="saving || !todoTask.trim()"
            @click="saveTodo"
          >
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goal-card {
  transition: box-shadow 0.2s;
}

.goal-card:hover {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.step-item {
  position: relative;
}
</style>
