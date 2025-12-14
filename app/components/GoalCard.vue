<script setup lang="ts">
import { defineComponent, h, type PropType } from "vue";
import type { TodoDoc } from "../../@types/todoDoc";
import editIcon from "../icons/edit.svg";
import deleteIcon from "../icons/delete.svg";

const categoryMeta = {
  health: {
    color: "#E7000B",
    bg: "#FEF2F2",
    progressBg: "linear-gradient(90deg, #FF7549 0%, #FF2F5A 100%)",
    label: "健康達成率:",
  },
  life: {
    color: "#00A63E",
    bg: "#F0FDF4",
    progressBg:
      "var(--gradientGreen, linear-gradient(90deg, #00DF73 0%, #0DB87E 100%))",
    label: "生活達成率:",
  },
  study: {
    color: "#155DFC",
    bg: "#EFF6FF",
    progressBg:
      "var(--gradient-blue, linear-gradient(90deg, #4FA3FF 0%, #00B7DC 100%))",
    label: "学習達成率:",
  },
  work: {
    color: "#4F39F6",
    bg: "#EEF2FF",
    progressBg:
      "var(--gradient-purple, linear-gradient(90deg, #8083FF 0%, #AC48FF 100%))",
    label: "仕事達成率:",
  },
};

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
  selectedCategoryId?: string;
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
    weight?: number
  ): void;
  (e: "delete-todo", goalId: string, todoId: string): void;
  (
    e: "toggle-todo",
    goalId: string,
    todoId: string,
    currentStatus: boolean
  ): void;
  (
    e: "edit-step",
    goalId: string,
    stepPath: string[],
    stepId: string,
    title: string
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
    weight?: number
  ): void;
  (
    e: "delete-todo-in-step",
    goalId: string,
    stepPath: string[],
    todoId: string
  ): void;
  (
    e: "toggle-todo-in-step",
    goalId: string,
    stepPath: string[],
    todoId: string,
    currentStatus: boolean
  ): void;
}>();

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
          title: string
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
          weight?: number
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
          currentStatus: boolean
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
            margin: level === 0 ? "12px 0" : "0",
            padding: "8px 12px",
            borderLeft: level > 0 ? "3px solid #d1d5db" : "none",
            backgroundColor: level === 0 ? "#f9fafb" : "transparent",
            borderRadius: "4px",
            transition: "background-color 0.2s",
            borderTop: level > 0 ? "none" : "2px solid #d1d5db",
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
                h("span",{ class: "text-gray-800 text-lg font-medium" },step.title),
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
                      class: "p-2 hover:bg-gray-100 rounded",
                      onClick: () =>
                        onEditStep(goalId, stepPath, step.id, step.title),
                    },
                    [
                      h("img", {
                        src: editIcon,
                        alt: "編集",
                        class: "h-5 w-5",
                      }),
                    ]
                  ),
                  h(
                    "button",
                    {
                      class: "p-2 hover:bg-gray-100 rounded",
                      onClick: () => onDeleteStep(goalId, step.id, stepPath),
                    },
                    [
                      h("img", {
                        src: deleteIcon,
                        alt: "削除",                        // ...existing code...
                              return h(
                                "div",
                                {
                                  class: "step-item",
                                  style: {
                                    marginLeft: `${indent}px`,
                                    marginTop: level > 0 ? "8px" : "0",
                                    margin: level === 0 ? "12px 0" : "0",
                                    padding: "8px 12px",
                                    borderLeft: level > 0 ? "3px solid #d1d5db" : "none",
                                    backgroundColor: level === 0 ? "#f9fafb" : "transparent",
                                    borderRadius: "4px",
                                    transition: "background-color 0.2s",
                                    borderTop: level > 0 ? "none" : "2px solid #d1d5db",
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
                                        h("span", { class: "text-gray-800 text-lg font-medium" }, step.title),
                                      ]),
                                      // 修正: items-center と whitespace-nowrap を追加し、閉じ括弧の数を正しく合わせる
                                      h(
                                        "div",
                                        {
                                          class:
                                            "flex items-center gap-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
                                        },
                                        [
                                          h(
                                            "button",
                                            {
                                              class: "p-2 hover:bg-gray-100 rounded",
                                              onClick: () =>
                                                onEditStep(goalId, stepPath, step.id, step.title),
                                            },
                                            [
                                              h("img", {
                                                src: editIcon,
                                                alt: "編集",
                                                class: "h-5 w-5",
                                              }),
                                            ]
                                          ),
                                          h(
                                            "button",
                                            {
                                              class: "p-2 hover:bg-gray-100 rounded",
                                              onClick: () => onDeleteStep(goalId, step.id, stepPath),
                                            },
                                            [
                                              h("img", {
                                                src: deleteIcon,
                                                alt: "削除",
                                                class: "h-5 w-5",
                                              }),
                                            ]
                                          ),
                                          h(
                                            "button",
                                            {
                                              class:
                                                "text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600",
                                              onClick: () => onAddSubStep(goalId, currentStepPath),
                                            },
                                            "+ ステップ"
                                          ),
                                          h(
                                            "button",
                                            {
                                              class:
                                                "text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600",
                                              onClick: () => onAddTodo(goalId, currentStepPath),
                                            },
                                            "+ TODO"
                                          ),
                                        ]
                                      ),
                                    ]
                                  ),
                        // ...existing code...
                        class: "h-5 w-5",
                      }),
                    ]
                  ),
                h(
                  "button",
                  {
                    class:
                      "text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600",
                    onClick: () => onAddSubStep(goalId, currentStepPath),
                  },
                  "+ ステップ"
                ),
                h(
                  "button",
                  {
                    class:
                      "text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600",
                    onClick: () => onAddTodo(goalId, currentStepPath),
                  },
                  "+ TODO"
                ),
                ]
              ),

              ]),
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
                                  todo.isFinished
                                ),
                            },
                            todo.isFinished ? "✓ 完了" : "未完了"
                          ),
                          h(
                            "span",
                            { class: "font-semibold text-blue-700 mr-2" },
                            todo.isFinished ? "✓ DONE: " : "TODO: "
                          ),
                          h("span", {}, todo.task),
                          todo.weight !== undefined &&
                            h(
                              "span",
                              { class: "ml-2 text-xs text-gray-500" },
                              `(重み: ${todo.weight})`
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
                                    todo.weight
                                  ),
                              },
                              "編集"
                            ),
                            h(
                              "button",
                              {
                                class:
                                  "text-xs px-1 py-0.5 bg-red-500 text-white rounded hover:bg-red-600",
                                onClick: () =>
                                  onDeleteTodo(
                                    goalId,
                                    todo.id,
                                    currentStepPath
                                  ),
                              },
                              "削除"
                            ),
                          ]
                        ),
                      ]
                    )
                  )
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
                          title: string
                        ) => emit("edit-step", gId, sPath, sId, title),
                        onDeleteStep: (
                          gId: string,
                          sId: string,
                          sPath: string[]
                        ) => emit("delete-step", gId, sPath, sId),
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
                          weight?: number
                        ) =>
                          emit(
                            "edit-todo-in-step",
                            gId,
                            sPath,
                            tId,
                            task,
                            finished,
                            weight
                          ),
                        onDeleteTodo: (
                          gId: string,
                          tId: string,
                          sPath: string[]
                        ) => emit("delete-todo-in-step", gId, sPath, tId),
                        onToggleTodo: (
                          gId: string,
                          sPath: string[],
                          tId: string,
                          currentStatus: boolean
                        ) => {
                          emit(
                            "toggle-todo-in-step",
                            gId,
                            sPath,
                            tId,
                            currentStatus
                          );
                        },
                      })
                  )
                ),
            ]
          ),
        ]
      );
    };
  },
});
</script>

<template>
  <div
    class="goal-card rounded-lg bg-white p-6 shadow-md border-t-8 border-gray-200"
  >
    <div class="goal-header mb-4 border-b pb-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">
            {{ goal.title }}
          </h2>

          <div class="mt-2">
            <div class="flex items-center gap-3">
              <!-- 進捗バー -->
              <div class="flex-1">
                <div class="w-full bg-gray-200 rounded h-3">
                  <div
                    class="progress-fill"
                    :style="{
                      width: goal.ratio + '%',
                      background:
                        categoryMeta[selectedCategoryId]?.progressBg ||
                        '#e5e7eb',
                    }"
                  ></div>
                </div>
              </div>

              <!-- 進捗率 -->
              <span class="text-sm font-semibold whitespace-nowrap">
                {{ goal.ratio }}%
              </span>
            </div>
          </div>
        </div>

        <div
          class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            class="p-2 hover:bg-gray-100 rounded"
            :disabled="saving"
            @click="$emit('edit-goal', goal.id, goal.title)"
          >
            <img :src="editIcon" alt="編集" class="h-5 w-5" />
          </button>
          <button
            class="p-2 hover:bg-gray-100 rounded"
            :disabled="saving"
            @click="$emit('delete-goal', goal.id, goal.title)"
          >
            <img :src="deleteIcon" alt="削除" class="h-5 w-5" />
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
    <div
      v-if="goal.todos && goal.todos.length > 0"
      class="ml-2 space-y-1 border-l-4 pl-2"
    >
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
          />
          <span>{{ todo.task }}</span>
          <span
            v-if="todo.weight !== undefined"
            class="ml-2 text-xs text-gray-500"
          >
            (重み: {{ todo.weight }})
          </span>
        </div>
        <div
          class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
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
                todo.weight
              )
            "
          >
            <img :src="editIcon" alt="編集" class="h-4 w-4" />
          </button>
          <button
            class="p-2 hover:bg-gray-100"
            :disabled="saving"
            @click="$emit('delete-todo', goal.id, todo.id)"
          >
            <img :src="deleteIcon" alt="削除" class="h-4 w-4" />
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
        :on-edit-todo="
          (g, p, id, task, f, w) =>
            $emit('edit-todo-in-step', g, p, id, task, f, w)
        "
        :on-delete-todo="(g, id, p) => $emit('delete-todo-in-step', g, p, id)"
        :on-toggle-todo="
          (g, p, id, s) => $emit('toggle-todo-in-step', g, p, id, s)
        "
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
</template>

<style scoped>
.goal-card {
  transition: box-shadow 0.2s;
}

.goal-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.progress-wrapper {
  width: 240px;
  /* 固定幅（必要に応じて調整） */
  min-width: 240px;
  max-width: 100%;
  /* カード幅を超えないように保険 */
}

.step-item {
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 0.5rem;
  transition: width 0.3s ease;
}
</style>