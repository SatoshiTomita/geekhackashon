<script setup lang="ts">
import { defineComponent, h, type PropType } from "vue";
import type { TodoDoc } from "../../@types/todoDoc";

// RoadmapStepコンポーネント（簡略版、後で別ファイルに分けることも可能）

// 型定義
type TodoWithId = TodoDoc & {
  id: string;
};

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

// Props
const props = defineProps<{
  goal: GoalWithSteps;
  saving: boolean;
  userId?: string;
  categoryId?: string;
}>();

// Emits
const emit = defineEmits<{
  (e: "edit-goal", goalId: string, title: string): void;
  (e: "delete-goal", goalId: string): void;
  (e: "add-step", goalId: string): void;
  (e: "add-todo", goalId: string): void;
  (
    e: "edit-todo",
    goalId: string,
    todoId: string,
    task: string,
    isFinished: boolean,
    weight?: number,
  ): void;
  (e: "delete-todo", goalId: string, todoId: string): void;
  (
    e: "toggle-todo",
    goalId: string,
    todoId: string,
    currentStatus: boolean,
  ): void;
  (
    e: "edit-step",
    goalId: string,
    stepPath: string[],
    stepId: string,
    title: string,
  ): void;
  (e: "delete-step", goalId: string, stepPath: string[], stepId: string): void;
  (e: "add-sub-step", goalId: string, stepPath: string[]): void;
  (e: "add-todo-to-step", goalId: string, stepPath: string[]): void;
  (
    e: "edit-todo-in-step",
    goalId: string,
    stepPath: string[],
    todoId: string,
    task: string,
    isFinished: boolean,
    weight?: number,
  ): void;
  (
    e: "delete-todo-in-step",
    goalId: string,
    stepPath: string[],
    todoId: string,
  ): void;
  (
    e: "toggle-todo-in-step",
    goalId: string,
    stepPath: string[],
    todoId: string,
    currentStatus: boolean,
  ): void;
}>();

// Bet機能の状態
const showBetModal = ref(false);
const betAmount = ref<number | null>(null);
const betLoading = ref(false);
const betError = ref("");

// Betモーダルを開く
const openBetModal = () => {
  showBetModal.value = true;
  betAmount.value = null;
  betError.value = "";
};

// Betモーダルを閉じる
const closeBetModal = () => {
  showBetModal.value = false;
  betAmount.value = null;
  betError.value = "";
};

// Stripe決済セッションを作成して遷移
const handleBet = async () => {
  if (!betAmount.value || betAmount.value <= 0) {
    betError.value = "金額を入力してください";
    return;
  }

  if (!props.userId || !props.categoryId) {
    betError.value = "ユーザー情報が不足しています";
    return;
  }

  try {
    betLoading.value = true;
    betError.value = "";

    const { $functions } = useNuxtApp();
    const { httpsCallable } = await import("firebase/functions");

    const createBetSession = httpsCallable(
      $functions as any,
      "api_stripe_createBetSession",
    );

    const result = await createBetSession({
      userId: props.userId,
      categoryId: props.categoryId,
      goalId: props.goal.id,
      amount: betAmount.value,
      origin: window.location.origin,
    });

    const resultData = result.data as any;
    if (!resultData.success || !resultData.url) {
      throw new Error("決済セッションの作成に失敗しました");
    }

    // Stripe決済画面に遷移
    window.location.href = resultData.url;
  } catch (err: any) {
    console.error("Bet error:", err);
    betError.value = err?.message || "決済処理に失敗しました";
  } finally {
    betLoading.value = false;
  }
};

const RoadmapStep: ReturnType<typeof defineComponent> = defineComponent({
  name: "RoadmapStep",
  props: {
    step: {
      type: Object as PropType<StepWithChildren>,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    goalId: {
      type: String,
      required: true,
    },
    stepPath: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    onEditStep: {
      type: Function as PropType<
        (
          goalId: string,
          stepPath: string[],
          stepId: string,
          title: string,
        ) => void
      >,
      required: true,
    },
    onDeleteStep: {
      type: Function as PropType<
        (goalId: string, stepId: string, stepPath: string[]) => void
      >,
      required: true,
    },
    onAddSubStep: {
      type: Function as PropType<(goalId: string, stepPath: string[]) => void>,
      required: true,
    },
    onAddTodo: {
      type: Function as PropType<(goalId: string, stepPath: string[]) => void>,
      required: true,
    },
    onEditTodo: {
      type: Function as PropType<
        (
          goalId: string,
          stepPath: string[],
          todoId: string,
          task: string,
          isFinished: boolean,
          weight?: number,
        ) => void
      >,
      required: true,
    },
    onDeleteTodo: {
      type: Function as PropType<
        (goalId: string, todoId: string, stepPath: string[]) => void
      >,
      required: true,
    },
    onToggleTodo: {
      type: Function as PropType<
        (
          goalId: string,
          stepPath: string[],
          todoId: string,
          currentStatus: boolean,
        ) => void
      >,
      required: true,
    },
  },
  setup(props): () => ReturnType<typeof h> {
    return () => {
      const {
        step,
        level,
        goalId,
        stepPath,
        onEditStep,
        onDeleteStep,
        onAddSubStep,
        onAddTodo,
        onEditTodo,
        onDeleteTodo,
        onToggleTodo,
      } = props;
      const indent = level * 12;
      const currentStepPath = [...stepPath, step.id];

      return h(
        "div",
        {
          class: "step-item",
          style: {
            marginLeft: `${indent}px`,
            marginTop: level > 0 ? "8px" : "0",
            padding: "8px 12px",
            borderLeft: level > 0 ? "3px solid #d1d5db" : "none",
            backgroundColor: level === 0 ? "#f9fafb" : "transparent",
            borderRadius: "4px",
            transition: "background-color 0.2s",
          },
        },
        [
          h(
            "div",
            {
              class: "flex items-center justify-between group",
            },
            [
              h("div", { class: "flex items-center flex-1" }, [
                level > 0 &&
                  h("div", {
                    class: "w-2 h-2 rounded-full bg-gray-400 mr-2",
                  }),
                h("span", { class: "text-gray-800 font-medium" }, step.title),
              ]),
              h(
                "div",
                {
                  class:
                    "flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity",
                },
                [
                  h(
                    "button",
                    {
                      class:
                        "text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600",
                      onClick: () => onAddSubStep(goalId, currentStepPath),
                    },
                    "+ ステップ",
                  ),
                  h(
                    "button",
                    {
                      class:
                        "text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600",
                      onClick: () => onAddTodo(goalId, currentStepPath),
                    },
                    "+ TODO",
                  ),
                  h(
                    "button",
                    {
                      class:
                        "text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600",
                      onClick: () =>
                        onEditStep(goalId, stepPath, step.id, step.title),
                    },
                    "編集",
                  ),
                  h(
                    "button",
                    {
                      class:
                        "text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600",
                      onClick: () => onDeleteStep(goalId, step.id, stepPath),
                    },
                    "削除",
                  ),
                ],
              ),
            ],
          ),
          // todoを表示
          step.todos &&
            step.todos.length > 0 &&
            h(
              "div",
              {
                class: "mt-2 ml-4 space-y-1",
              },
              step.todos.map((todo: TodoWithId) =>
                h(
                  "div",
                  {
                    key: todo.id,
                    class: `text-sm px-2 py-1 rounded border-l-2 flex items-center justify-between group ${
                      todo.isFinished
                        ? "text-gray-500 bg-gray-50 border-gray-300 line-through"
                        : "text-gray-600 bg-blue-50 border-blue-300"
                    }`,
                  },
                  [
                    h("div", { class: "flex items-center flex-1" }, [
                      h(
                        "button",
                        {
                          class: `mr-2 px-2 py-1 text-xs rounded ${
                            todo.isFinished
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                          }`,
                          onClick: () =>
                            onToggleTodo(
                              goalId,
                              currentStepPath,
                              todo.id,
                              todo.isFinished,
                            ),
                        },
                        todo.isFinished ? "✓ 完了" : "未完了",
                      ),
                      h(
                        "span",
                        { class: "font-semibold text-blue-700 mr-2" },
                        todo.isFinished ? "✓ DONE: " : "TODO: ",
                      ),
                      h("span", {}, todo.task),
                      todo.weight !== undefined &&
                        h(
                          "span",
                          { class: "ml-2 text-xs text-gray-500" },
                          `(重み: ${todo.weight})`,
                        ),
                    ]),
                    h(
                      "div",
                      {
                        class:
                          "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      },
                      [
                        h(
                          "button",
                          {
                            class:
                              "text-xs px-1 py-0.5 bg-yellow-500 text-white rounded hover:bg-yellow-600",
                            onClick: () =>
                              onEditTodo(
                                goalId,
                                currentStepPath,
                                todo.id,
                                todo.task,
                                todo.isFinished,
                                todo.weight,
                              ),
                          },
                          "編集",
                        ),
                        h(
                          "button",
                          {
                            class:
                              "text-xs px-1 py-0.5 bg-red-500 text-white rounded hover:bg-red-600",
                            onClick: () =>
                              onDeleteTodo(goalId, todo.id, currentStepPath),
                          },
                          "削除",
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          step.steps &&
            step.steps.length > 0 &&
            h(
              "div",
              {
                class: "mt-2",
              },
              step.steps.map(
                (childStep: StepWithChildren): ReturnType<typeof h> =>
                  h(RoadmapStep, {
                    key: childStep.id,
                    step: childStep,
                    level: level + 1,
                    goalId,
                    stepPath: currentStepPath,
                    onEditStep: (
                      gId: string,
                      sPath: string[],
                      sId: string,
                      title: string,
                    ) => emit("edit-step", gId, sPath, sId, title),
                    onDeleteStep: (gId: string, sId: string, sPath: string[]) =>
                      emit("delete-step", gId, sPath, sId),
                    onAddSubStep: (gId: string, sPath: string[]) =>
                      emit("add-sub-step", gId, sPath),
                    onAddTodo: (gId: string, sPath: string[]) =>
                      emit("add-todo-to-step", gId, sPath),
                    onEditTodo: (
                      gId: string,
                      sPath: string[],
                      tId: string,
                      task: string,
                      finished: boolean,
                      weight?: number,
                    ) =>
                      emit(
                        "edit-todo-in-step",
                        gId,
                        sPath,
                        tId,
                        task,
                        finished,
                        weight,
                      ),
                    onDeleteTodo: (gId: string, tId: string, sPath: string[]) =>
                      emit("delete-todo-in-step", gId, sPath, tId),
                    onToggleTodo: (
                      gId: string,
                      sPath: string[],
                      tId: string,
                      currentStatus: boolean,
                    ) => {
                      emit(
                        "toggle-todo-in-step",
                        gId,
                        sPath,
                        tId,
                        currentStatus,
                      );
                    },
                  }),
              ),
            ),
        ],
      );
    };
  },
});
</script>

<template>
  <div class="goal-card rounded-lg bg-white p-6 shadow-md">
    <div class="goal-header mb-4 border-b pb-4">
      <div class="flex items-center justify-between">
        <div>
  <h2 class="text-2xl font-bold text-gray-900">
    {{ props.goal.title }}
  </h2>

  <div class="mt-2">
    <div class="flex items-center gap-3">
      <!-- 進捗バー -->
      <div class="flex-1">
        <div class="w-full bg-gray-200 rounded h-3">
          <div
            class="h-3 bg-blue-500 rounded transition-all duration-300"
            :style="{ width: props.goal.ratio + '%' }"
          />
        </div>
      </div>

      <!-- 進捗率 -->
      <span class="text-sm font-semibold whitespace-nowrap">
        {{ props.goal.ratio }}%
      </span>
    </div>
  </div>
</div>

        <div class="flex gap-2">
          <button
            class="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-semibold"
            :disabled="saving"
            @click="openBetModal">
            💰 Bet
          </button>
          <button
            class="p-2 hover:bg-gray-100 rounded"
            :disabled="saving"
            @click="$emit('edit-goal', props.goal.id, props.goal.title)">
          <img
            src="../icons/edit.svg"
            alt="編集"
            class="h-5 w-5"
          /> 
          </button> 
          <button
            class="p-2 hover:bg-gray-100 rounded"
            :disabled="saving"
            @click="$emit('delete-goal', props.goal.id, props.goal.title)">
          <img
            src="../icons/delete.svg"
            alt="削除"
            class="h-5 w-5"
          />  
          </button>
        </div>
      </div>
    </div>

    <!-- タスク + 目標 操作ボタン（上部） -->
<div class="mb-4 flex items-center gap-2">
  <button
    class="rounded bg-green-100 px-3 py-1 text-sm text-green-600 hover:bg-green-300"
    @click="$emit('add-todo', goal.id)"
  >
    ✓ タスク追加
  </button>
  <button
    class="rounded bg-blue-100 px-3 py-1 text-sm text-blue-600 hover:bg-blue-300"
    @click="$emit('add-step', goal.id)"
  >
    + 目標追加
  </button>
</div>

<!-- TODO一覧 -->
<div v-if="goal.todos && goal.todos.length > 0" class="ml-2 space-y-1 border-l-4 pl-2">
  <div
    v-for="todo in goal.todos"
    :key="todo.id"
    :class="`text-sm px-3 py-2 rounded-full flex items-center justify-between group ${
      todo.isFinished
        ? 'text-gray-500 bg-gray-50 border-gray-300 line-through'
        : 'text-gray-600 bg-green-50 border-green-300'
    }`"
  >
    <div class="flex items-center">
      <input
        type="checkbox"
        class="mr-3 h-4 w-4 cursor-pointer rounded-full accent-gray-300"
        :checked="todo.isFinished"
        :disabled="saving"
        @click="$emit('toggle-todo', goal.id, todo.id, todo.isFinished)"
      >
    </input>
      <span>{{ todo.task }}</span>
      <span v-if="todo.weight !== undefined" class="ml-2 text-xs text-gray-500">
        (重み: {{ todo.weight }})</span>
    </div>
    <div class="flex gap">
          <button
            class="p-2 hover:bg-gray-100"
            :disabled="saving"
            @click="
                $emit(
                  'edit-todo',
                  goal.id,
                  todo.id,
                  todo.task,
                  todo.isFinished,
                  todo.weight,
                )
              ">
          <img
            src="../icons/edit.svg"
            alt="編集"
            class="h-4 w-4"
          /> 
          </button> 
          <button
            class="p-2 hover:bg-gray-100"
            :disabled="saving"
            @click="$emit('delete-todo', goal.id, todo.id)">
          <img
            src="../icons/delete.svg"
            alt="削除"
            class="h-4 w-4"
          />  
          </button>
          </div>
  </div>
</div>

<!-- ステップ一覧 -->
<div v-if="goal.steps && goal.steps.length > 0" class="mt-4 space-y-2">
  <component
    :is="RoadmapStep"
    v-for="step in goal.steps"
    :key="step.id"
    :step="step"
    :level="0"
    :goal-id="goal.id"
    :step-path="[]"
    :on-edit-step="(g, p, id, t) => $emit('edit-step', g, p, id, t)"
    :on-delete-step="(g, id, p) => $emit('delete-step', g, p, id)"
    :on-add-sub-step="(g, p) => $emit('add-sub-step', g, p)"
    :on-add-todo="(g, p) => $emit('add-todo-to-step', g, p)"
    :on-edit-todo="(g, p, id, task, f, w) =>
      $emit('edit-todo-in-step', g, p, id, task, f, w)"
    :on-delete-todo="(g, id, p) =>
      $emit('delete-todo-in-step', g, p, id)"
    :on-toggle-todo="(g, p, id, s) =>
      $emit('toggle-todo-in-step', g, p, id, s)"
  />
  <!-- ステップ追加後の下部ボタン -->
  <div class="mt-2 flex items-center gap-2">
    <button
      class="rounded bg-green-100 px-3 py-1 text-sm text-green-600 hover:bg-green-300"
      @click="$emit('add-todo', goal.id)"
    >
      ✓ タスク追加
    </button>
    <button
      class="rounded bg-blue-100 px-3 py-1 text-sm text-blue-600 hover:bg-blue-300"
      @click="$emit('add-step', goal.id)"
    >
      + 目標追加
    </button>
  </div>
    </div>
  </div>

  <!-- Betモーダル -->
  <div
    v-if="showBetModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="closeBetModal"
  >
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-xl font-bold mb-4 text-gray-800">目標に賭ける</h3>
      <p class="text-sm text-gray-600 mb-4">
        目標「{{ props.goal.title }}」に賭ける金額を入力してください
      </p>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          金額（円）
        </label>
        <input
          v-model.number="betAmount"
          type="number"
          min="1"
          step="1"
          placeholder="1000"
          class="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          :disabled="betLoading"
        />
      </div>

      <p v-if="betError" class="mb-4 text-sm text-red-600">{{ betError }}</p>

      <div class="flex gap-3 justify-end">
        <button
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          :disabled="betLoading"
          @click="closeBetModal"
        >
          キャンセル
        </button>
        <button
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          :disabled="betLoading"
          @click="handleBet"
        >
          <span v-if="betLoading">処理中...</span>
          <span v-else>決済に進む</span>
        </button>
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
