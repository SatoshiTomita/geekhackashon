import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import type { Goal } from "../../@types/goal";
import type { StepDoc } from "../../@types/stepDoc";
import type { TodoDoc } from "../../@types/todoDoc";
import type { CategoryDoc } from "../../@types/categoryDoc";

export const useFireStore = () => {
  const { $db } = useNuxtApp();
  const db = $db as Firestore;

  /**
   * 目標とそのサブ目標、孫目標を取得する関数
   * @param uid - ユーザーID
   * @param goalId - 目標ID
   * @returns 親目標、サブ目標、孫目標を含むオブジェクト
   */
  const getGoalWithSteps = async (uid: string, goalId: string) => {
    try {
      // 親目標を取得
      const goalRef = doc(db, "users", uid, "goals", goalId);
      const goalSnap = await getDoc(goalRef);

      if (!goalSnap.exists()) {
        throw new Error(`Goal with id ${goalId} not found`);
      }

      const parentGoal = goalSnap.data() as Goal;

      // サブ目標（steps）を取得
      const stepsRef = collection(db, "users", uid, "goals", goalId, "steps");
      const stepsSnap = await getDocs(stepsRef);

      const steps = await Promise.all(
        stepsSnap.docs.map(async (stepDoc) => {
          const stepData = stepDoc.data() as Goal;
          const stepId = stepDoc.id;

          // 孫目標（steps/subStep）を取得
          const grandchildStepsRef = collection(
            db,
            "users",
            uid,
            "goals",
            goalId,
            "steps",
            stepId,
            "subStep",
          );
          const grandchildStepsSnap = await getDocs(grandchildStepsRef);

          const grandchildSteps = grandchildStepsSnap.docs.map(
            (grandchildDoc) => ({
              id: grandchildDoc.id,
              ...(grandchildDoc.data() as Goal),
            }),
          );

          return {
            id: stepId,
            ...stepData,
            steps: grandchildSteps,
          };
        }),
      );

      return {
        id: goalId,
        ...parentGoal,
        steps,
      };
    } catch (error) {
      console.error("Error fetching goal with steps:", error);
      throw error;
    }
  };

  type TodoWithId = TodoDoc & {
    id: string;
  };

  type StepWithChildren = {
    id: string;
    title: string;
    steps: StepWithChildren[];
    todos?: TodoWithId[];
  };

  /**
   * todoコレクションを取得する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param stepPath - ステップのパス（空の場合はgoalId配下のtodoを取得）
   * @returns todoの配列
   */
  const getTodos = async (
    uid: string,
    categoryId: string,
    goalId: string,
    stepPath: string[] = [],
  ): Promise<TodoWithId[]> => {
    try {
      let todosRef;
      if (stepPath.length === 0) {
        // goalId配下のtodoを取得
        todosRef = collection(
          db,
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
          "todo",
        );
      } else {
        // stepId配下のtodoを取得
        const allSegments: any[] = [
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
        ];
        for (const stepId of stepPath) {
          allSegments.push("steps", stepId);
        }
        allSegments.push("todo");
        todosRef = collection(db, ...(allSegments as [string, ...string[]]));
      }

      const todosSnap = await getDocs(todosRef);
      const todos: TodoWithId[] = todosSnap.docs.map((todoDoc) => ({
        id: todoDoc.id,
        ...(todoDoc.data() as TodoDoc),
      }));

      return todos;
    } catch (e) {
      // todoコレクションが存在しない場合は空配列を返す
      console.error(e);
      return [];
    }
  };

  /**
   * 再帰的にステップを取得する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param parentPath - 親ステップのパス（再帰的に使用）
   * @returns ステップの階層構造
   */
  const getStepsRecursively = async (
    uid: string,
    categoryId: string,
    goalId: string,
    parentPath: string[] = [],
  ): Promise<StepWithChildren[]> => {
    try {
      // ステップのパスを構築
      const pathSegments: string[] = [
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      ];

      // 親ステップのパスを追加
      for (const stepId of parentPath) {
        pathSegments.push("steps", stepId);
      }

      // 最後に"steps"を追加
      pathSegments.push("steps");

      // 現在のレベルのステップを取得
      // Firestoreのcollectionは可変長引数を受け取るため、パスを動的に構築
      let stepsRef;
      if (parentPath.length === 0) {
        // 直接的なパス
        stepsRef = collection(
          db,
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
          "steps",
        );
      } else {
        // 再帰的なパス - 型アサーションを使用
        const allSegments: any[] = [
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
        ];
        for (const stepId of parentPath) {
          allSegments.push("steps", stepId);
        }
        allSegments.push("steps");
        stepsRef = collection(db, ...(allSegments as [string, ...string[]]));
      }
      const stepsSnap = await getDocs(stepsRef);

      // 各ステップに対して再帰的に子ステップを取得
      const steps: StepWithChildren[] = await Promise.all(
        stepsSnap.docs.map(async (stepDoc) => {
          const stepData = stepDoc.data() as StepDoc;
          const stepId = stepDoc.id;

          // 子ステップを再帰的に取得
          const childSteps: StepWithChildren[] = await getStepsRecursively(
            uid,
            categoryId,
            goalId,
            [...parentPath, stepId],
          );

          // ステップ配下のtodoを取得
          const todos: TodoWithId[] = await getTodos(uid, categoryId, goalId, [
            ...parentPath,
            stepId,
          ]);

          return {
            id: stepId,
            title: stepData.title,
            steps: childSteps,
            todos: todos.length > 0 ? todos : undefined,
          };
        }),
      );

      return steps;
    } catch (error) {
      console.error("Error fetching steps recursively:", error);
      // ステップが存在しない場合は空配列を返す
      return [];
    }
  };

  type GoalWithSteps = {
    id: string;
    title: string;
    ratio: number;
    steps: StepWithChildren[];
    todos?: TodoWithId[];
  };

  /**
   * 目標とそのすべてのステップ階層を取得する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @returns 目標とステップ階層
   */
  const getGoalWithAllSteps = async (
    uid: string,
    categoryId: string,
    goalId: string,
  ): Promise<GoalWithSteps> => {
    try {
      // 目標を取得
      const goalRef = doc(
        db,
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      );
      const goalSnap = await getDoc(goalRef);

      if (!goalSnap.exists()) {
        throw new Error(
          `Goal with id ${goalId} not found in category ${categoryId}`,
        );
      }

      const goalData = goalSnap.data() as Goal;

      // すべてのステップ階層を再帰的に取得
      const steps: StepWithChildren[] = await getStepsRecursively(
        uid,
        categoryId,
        goalId,
      );

      // goalId配下のtodoを取得
      const todos: TodoWithId[] = await getTodos(uid, categoryId, goalId, []);

      return {
        id: goalId,
        ...goalData,
        steps,
        todos: todos.length > 0 ? todos : undefined,
      };
    } catch (error) {
      console.error("Error fetching goal with all steps:", error);
      throw error;
    }
  };

  /**
   * カテゴリ内のすべての目標とそのステップ階層を取得する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @returns 目標とステップ階層の配列
   */
  const getAllGoalsWithSteps = async (
    uid: string,
    categoryId: string,
  ): Promise<GoalWithSteps[]> => {
    try {
      // カテゴリ内のすべての目標を取得
      const goalsRef = collection(
        db,
        "users",
        uid,
        "category",
        categoryId,
        "goals",
      );
      const goalsSnap = await getDocs(goalsRef);

      // 各目標に対してステップ階層を取得
      const goals: GoalWithSteps[] = await Promise.all(
        goalsSnap.docs.map(async (goalDoc) => {
          const goalData = goalDoc.data() as Goal;
          const goalId = goalDoc.id;

          // すべてのステップ階層を再帰的に取得
          const steps: StepWithChildren[] = await getStepsRecursively(
            uid,
            categoryId,
            goalId,
          );

          // goalId配下のtodoを取得
          const todos: TodoWithId[] = await getTodos(
            uid,
            categoryId,
            goalId,
            [],
          );

          return {
            id: goalId,
            ...goalData,
            steps,
            todos: todos.length > 0 ? todos : undefined,
          };
        }),
      );

      return goals;
    } catch (error) {
      console.error("Error fetching all goals with steps:", error);
      throw error;
    }
  };

  /**
   * ステップを追加する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param stepData - ステップデータ
   * @param stepPath - 親ステップのパス（空の場合はgoalId配下に追加）
   * @returns 追加されたステップのID
   */
  const addStep = async (
    uid: string,
    categoryId: string,
    goalId: string,
    stepData: StepDoc,
    stepPath: string[] = [],
  ): Promise<string> => {
    try {
      let stepsRef;
      if (stepPath.length === 0) {
        // goalId配下にステップを追加
        stepsRef = collection(
          db,
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
          "steps",
        );
      } else {
        // stepId配下にステップを追加
        const allSegments: any[] = [
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
        ];
        for (const stepId of stepPath) {
          allSegments.push("steps", stepId);
        }
        allSegments.push("steps");
        stepsRef = collection(db, ...(allSegments as [string, ...string[]]));
      }

      const docRef = await addDoc(stepsRef, stepData);
      return docRef.id;
    } catch (error) {
      console.error("Error adding step:", error);
      throw error;
    }
  };

  /**
   * ステップを更新する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param stepId - ステップID
   * @param stepData - 更新するステップデータ
   * @param stepPath - 親ステップのパス（空の場合はgoalId配下のステップ）
   */
  const updateStep = async (
    uid: string,
    categoryId: string,
    goalId: string,
    stepId: string,
    stepData: Partial<StepDoc>,
    stepPath: string[] = [],
  ): Promise<void> => {
    try {
      const allSegments: any[] = [
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      ];

      for (const parentStepId of stepPath) {
        allSegments.push("steps", parentStepId);
      }
      allSegments.push("steps", stepId);

      const stepRef = doc(db, ...(allSegments as [string, ...string[]]));
      await setDoc(stepRef, stepData, { merge: true });
    } catch (error) {
      console.error("Error updating step:", error);
      throw error;
    }
  };

  /**
   * ステップを削除する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param stepId - ステップID
   * @param stepPath - 親ステップのパス（空の場合はgoalId配下のステップ）
   */
  const deleteStep = async (
    uid: string,
    categoryId: string,
    goalId: string,
    stepId: string,
    stepPath: string[] = [],
  ): Promise<void> => {
    try {
      const allSegments: any[] = [
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      ];

      for (const parentStepId of stepPath) {
        allSegments.push("steps", parentStepId);
      }
      allSegments.push("steps", stepId);

      const stepRef = doc(db, ...(allSegments as [string, ...string[]]));
      await deleteDoc(stepRef);
    } catch (error) {
      console.error("Error deleting step:", error);
      throw error;
    }
  };

  /**
   * タスク（todo）を追加する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param todoData - タスクデータ
   * @param stepPath - ステップのパス（空の場合はgoalId配下に追加）
   * @returns 追加されたタスクのID
   */
  const addTodo = async (
    uid: string,
    categoryId: string,
    goalId: string,
    todoData: TodoDoc,
    stepPath: string[] = [],
  ): Promise<string> => {
    try {
      let todosRef;
      if (stepPath.length === 0) {
        // goalId配下にタスクを追加
        todosRef = collection(
          db,
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
          "todo",
        );
      } else {
        // stepId配下にタスクを追加
        const allSegments: any[] = [
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
        ];
        for (const stepId of stepPath) {
          allSegments.push("steps", stepId);
        }
        allSegments.push("todo");
        todosRef = collection(db, ...(allSegments as [string, ...string[]]));
      }

      // undefinedのフィールドを除外
      const cleanTodoData: Record<string, any> = {
        task: todoData.task,
        isFinished: todoData.isFinished,
      };
      if (todoData.weight !== undefined) {
        cleanTodoData.weight = todoData.weight;
      }

      const docRef = await addDoc(todosRef, cleanTodoData);

      // カテゴリ達成率を再計算
      await updateCategoryRatio(uid, categoryId);

      return docRef.id;
    } catch (error) {
      console.error("Error adding todo:", error);
      throw error;
    }
  };

  /**
   * タスク（todo）を更新する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param todoId - タスクID
   * @param todoData - 更新するタスクデータ
   * @param stepPath - ステップのパス（空の場合はgoalId配下のタスク）
   */
  const updateTodo = async (
    uid: string,
    categoryId: string,
    goalId: string,
    todoId: string,
    todoData: Partial<TodoDoc>,
    stepPath: string[] = [],
  ): Promise<void> => {
    try {
      const allSegments: any[] = [
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      ];

      for (const stepId of stepPath) {
        allSegments.push("steps", stepId);
      }
      allSegments.push("todo", todoId);

      // undefinedのフィールドを除外
      const cleanTodoData: Record<string, any> = {};
      if (todoData.task !== undefined) {
        cleanTodoData.task = todoData.task;
      }
      if (todoData.isFinished !== undefined) {
        cleanTodoData.isFinished = todoData.isFinished;
      }
      if (todoData.weight !== undefined) {
        cleanTodoData.weight = todoData.weight;
      }

      const todoRef = doc(db, ...(allSegments as [string, ...string[]]));
      await setDoc(todoRef, cleanTodoData, { merge: true });
    } catch (error) {
      console.error("Error updating todo:", error);
      throw error;
    }
  };

  /**
   * タスク（todo）を削除する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param todoId - タスクID
   * @param stepPath - ステップのパス（空の場合はgoalId配下のタスク）
   */
  const deleteTodo = async (
    uid: string,
    categoryId: string,
    goalId: string,
    todoId: string,
    stepPath: string[] = [],
  ): Promise<void> => {
    try {
      const allSegments: any[] = [
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      ];

      for (const stepId of stepPath) {
        allSegments.push("steps", stepId);
      }
      allSegments.push("todo", todoId);

      const todoRef = doc(db, ...(allSegments as [string, ...string[]]));

      // 削除前に存在確認
      const todoSnap = await getDoc(todoRef);
      if (!todoSnap.exists()) {
        console.warn("Todo does not exist, may have already been deleted");
        return;
      }

      await deleteDoc(todoRef);

      // 削除後の確認
      const verifySnap = await getDoc(todoRef);
      if (verifySnap.exists()) {
        throw new Error("Failed to delete todo");
      }

      // カテゴリ達成率を再計算
      await updateCategoryRatio(uid, categoryId);
    } catch (error) {
      console.error("Error deleting todo:", error);
      throw error;
    }
  };

  /**
   * 目標（goal）を追加する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalData - 目標データ
   * @returns 追加された目標のID
   */
  const addGoal = async (
    uid: string,
    categoryId: string,
    goalData: Goal,
  ): Promise<string> => {
    try {
      const goalsRef = collection(
        db,
        "users",
        uid,
        "category",
        categoryId,
        "goals",
      );
      const docRef = await addDoc(goalsRef, goalData);
      return docRef.id;
    } catch (error) {
      console.error("Error adding goal:", error);
      throw error;
    }
  };

  /**
   * 目標（goal）を更新する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   * @param goalData - 更新する目標データ
   */
  const updateGoal = async (
    uid: string,
    categoryId: string,
    goalId: string,
    goalData: Partial<Goal>,
  ): Promise<void> => {
    try {
      const goalRef = doc(
        db,
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      );
      await setDoc(goalRef, goalData, { merge: true });
    } catch (error) {
      console.error("Error updating goal:", error);
      throw error;
    }
  };

  /**
   * 目標（goal）を削除する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   */
  const deleteGoal = async (
    uid: string,
    categoryId: string,
    goalId: string,
  ): Promise<void> => {
    try {
      const goalRef = doc(
        db,
        "users",
        uid,
        "category",
        categoryId,
        "goals",
        goalId,
      );
      await deleteDoc(goalRef);

      // カテゴリの達成率も更新
      await updateCategoryRatio(uid, categoryId);
    } catch (error) {
      console.error("Error deleting goal:", error);
      throw error;
    }
  };

  /**
   * カテゴリの達成率を更新する関数
   * カテゴリ内のすべてのtodoのうち、達成したtodoの割合を計算する
   * todoがないgoalは計算から除外する
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   */
  const updateCategoryRatio = async (
    uid: string,
    categoryId: string,
  ): Promise<void> => {
    try {
      // カテゴリ内のすべての目標を取得
      const goalsRef = collection(
        db,
        "users",
        uid,
        "category",
        categoryId,
        "goals",
      );
      const goalsSnap = await getDocs(goalsRef);

      if (goalsSnap.empty) {
        // 目標がない場合は達成率を0にする
        const categoryRef = doc(db, "users", uid, "category", categoryId);
        await setDoc(categoryRef, { achieveMentRatio: 0 }, { merge: true });
        return;
      }

      // カテゴリ内のすべてのtodoを集計
      const allTodos: TodoWithId[] = [];

      for (const goalDoc of goalsSnap.docs) {
        const goalId = goalDoc.id;

        // goal直下のtodoを取得
        const goalTodos = await getTodos(uid, categoryId, goalId, []);
        allTodos.push(...goalTodos);

        // すべてのstep階層を取得
        const steps = await getStepsRecursively(uid, categoryId, goalId);

        // step階層からすべてのtodoを集計
        const stepTodos = collectAllTodosFromSteps(steps);
        allTodos.push(...stepTodos);
      }

      // todoがない場合は達成率を0にする
      if (allTodos.length === 0) {
        const categoryRef = doc(db, "users", uid, "category", categoryId);
        await setDoc(categoryRef, { achieveMentRatio: 0 }, { merge: true });
        return;
      }

      // 達成したtodoの数をカウント
      const completedTodos = allTodos.filter((todo) => todo.isFinished).length;

      // 達成率を計算（todoのうち達成した割合）
      const categoryRatio = Math.round(
        (completedTodos / allTodos.length) * 100,
      );

      // カテゴリの達成率を更新
      const categoryRef = doc(db, "users", uid, "category", categoryId);
      await setDoc(
        categoryRef,
        { achieveMentRatio: categoryRatio },
        { merge: true },
      );
    } catch (error) {
      console.error("Error updating category ratio:", error);
      throw error;
    }
  };

  /**
   * カテゴリの達成率を取得する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @returns カテゴリの達成率
   */
  const getCategoryRatio = async (
    uid: string,
    categoryId: string,
  ): Promise<number> => {
    try {
      const categoryRef = doc(db, "users", uid, "category", categoryId);
      const categorySnap = await getDoc(categoryRef);

      if (categorySnap.exists()) {
        const categoryData = categorySnap.data() as CategoryDoc;
        return categoryData.achieveMentRatio || 0;
      }

      // カテゴリが存在しない場合は0を返す
      return 0;
    } catch (error) {
      console.error("Error getting category ratio:", error);
      throw error;
    }
  };

  /**
   * ステップ階層からすべてのtodoを集計する再帰関数
   */
  const collectAllTodosFromSteps = (
    steps: StepWithChildren[],
  ): TodoWithId[] => {
    const allTodos: TodoWithId[] = [];
    for (const step of steps) {
      if (step.todos) {
        allTodos.push(...step.todos);
      }
      if (step.steps.length > 0) {
        allTodos.push(...collectAllTodosFromSteps(step.steps));
      }
    }
    return allTodos;
  };

  /**
   * 目標（goal）の達成率を計算して更新する関数
   * @param uid - ユーザーID
   * @param categoryId - カテゴリID
   * @param goalId - 目標ID
   */
  const calculateAndUpdateGoalRatio = async (
    uid: string,
    categoryId: string,
    goalId: string,
  ): Promise<number> => {
    try {
      // 目標配下のすべてのtodoを取得（goal直下 + すべてのstep配下）
      const allTodos: TodoWithId[] = [];

      // goal直下のtodo
      const goalTodos = await getTodos(uid, categoryId, goalId, []);
      allTodos.push(...goalTodos);

      // すべてのstep階層を取得（既にtodoも含まれている）
      const steps = await getStepsRecursively(uid, categoryId, goalId);

      // step階層からすべてのtodoを集計
      const stepTodos = collectAllTodosFromSteps(steps);
      allTodos.push(...stepTodos);

      // 達成率を計算
      const totalTodos = allTodos.length;
      if (totalTodos === 0) {
        // todoがない場合は達成率を0にする
        await updateGoal(uid, categoryId, goalId, { ratio: 0 });
        return 0;
      }

      const completedTodos = allTodos.filter((todo) => todo.isFinished).length;
      const ratio = Math.round((completedTodos / totalTodos) * 100);

      // 目標の達成率を更新
      await updateGoal(uid, categoryId, goalId, { ratio });

      // カテゴリの達成率も更新
      await updateCategoryRatio(uid, categoryId);

      // 賭け金がある場合、返還処理をチェック
      try {
        const goalRef = doc(
          db,
          "users",
          uid,
          "category",
          categoryId,
          "goals",
          goalId,
        );
        const goalSnap = await getDoc(goalRef);
        if (goalSnap.exists()) {
          const goalData = goalSnap.data();
          const betAmount = goalData?.betAmount as number | undefined;
          const isLocked = goalData?.isLocked as boolean | undefined;

          // 賭け金があり、決済が完了している場合のみ返還処理を実行
          if (betAmount && betAmount > 0 && isLocked) {
            const { $functions } = useNuxtApp();
            const { httpsCallable } = await import("firebase/functions");

            const processRefund = httpsCallable(
              $functions as any,
              "api_stripe_processRefundForGoal",
            );

            // 返還処理を非同期で実行（エラーが発生しても達成率の更新は続行）
            processRefund({
              userId: uid,
              categoryId,
              goalId,
              currentRatio: ratio,
            })
              .then((result) => {
                console.log("Refund processing result:", result);
              })
              .catch((error) => {
                console.error("Refund processing error:", error);
              });
          }
        }
      } catch (error) {
        // 返還処理のエラーは達成率の更新を妨げない
        console.error("Error checking refund:", error);
      }

      return ratio;
    } catch (error) {
      console.error("Error calculating goal ratio:", error);
      throw error;
    }
  };

  return {
    getGoalWithSteps,
    getStepsRecursively,
    getGoalWithAllSteps,
    getAllGoalsWithSteps,
    addStep,
    updateStep,
    deleteStep,
    addTodo,
    updateTodo,
    deleteTodo,
    addGoal,
    updateGoal,
    deleteGoal,
    calculateAndUpdateGoalRatio,
    updateCategoryRatio,
    getCategoryRatio,
  };
};
