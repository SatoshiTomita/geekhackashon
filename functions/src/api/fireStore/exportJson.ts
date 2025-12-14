import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';

// admin.initializeApp()が呼ばれた後にfirestore()を取得する
const getDb = () => admin.firestore();

// 型定義
interface StepDoc {
  title: string;
}

interface TodoDoc {
  task: string;
  isFinished: boolean;
  weight?: number;
}

interface Goal {
  title: string;
  ratio: number;
}

interface StepWithChildren {
  id: string;
  title: string;
  steps: StepWithChildren[];
  todos?: TodoWithId[];
}

interface TodoWithId extends TodoDoc {
  id: string;
}

interface GoalWithSteps {
  id: string;
  title: string;
  ratio: number;
  steps: StepWithChildren[];
  todos?: TodoWithId[];
}

/**
 * 再帰的にステップを取得する関数
 */
async function getStepsRecursively(
  userId: string,
  categoryId: string,
  goalId: string,
  parentPath: string[] = [],
): Promise<StepWithChildren[]> {
  try {
    const db = getDb();
    let docRef: admin.firestore.DocumentReference = db
      .collection('users')
      .doc(userId)
      .collection('category')
      .doc(categoryId)
      .collection('goals')
      .doc(goalId);

    // 親ステップのパスを追加
    for (const stepId of parentPath) {
      docRef = docRef.collection('steps').doc(stepId);
    }

    // 最後に"steps"コレクションを参照
    const stepsRef = docRef.collection('steps');
    const stepsSnap = await stepsRef.get();

    // 各ステップに対して再帰的に子ステップを取得
    const steps: StepWithChildren[] = await Promise.all(
      stepsSnap.docs.map(async (stepDoc) => {
        const stepData = stepDoc.data() as StepDoc;
        const stepId = stepDoc.id;

        // 子ステップを再帰的に取得
        const childSteps: StepWithChildren[] = await getStepsRecursively(
          userId,
          categoryId,
          goalId,
          [...parentPath, stepId],
        );

        // ステップ配下のtodoを取得
        const todos: TodoWithId[] = await getTodos(userId, categoryId, goalId, [
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
    console.error('Error fetching steps recursively:', error);
    return [];
  }
}

/**
 * todoコレクションを取得する関数
 */
async function getTodos(
  userId: string,
  categoryId: string,
  goalId: string,
  stepPath: string[] = [],
): Promise<TodoWithId[]> {
  try {
    const db = getDb();
    let todosRef: admin.firestore.DocumentReference = db
      .collection('users')
      .doc(userId)
      .collection('category')
      .doc(categoryId)
      .collection('goals')
      .doc(goalId);

    // ステップのパスを追加
    for (const stepId of stepPath) {
      todosRef = todosRef.collection('steps').doc(stepId);
    }

    // 最後に"todo"コレクションを参照
    const todosRefCollection = todosRef.collection('todo');
    const todosSnap = await todosRefCollection.get();
    const todos: TodoWithId[] = todosSnap.docs.map((todoDoc) => {
      const data = todoDoc.data() as TodoDoc;
      return {
        id: todoDoc.id,
        task: data.task,
        isFinished: data.isFinished,
        ...(data.weight !== undefined && { weight: data.weight }),
      };
    });

    return todos;
  } catch (e) {
    console.error(e);
    return [];
  }
}

/**
 * 目標とそのすべてのステップ階層を取得する関数
 */
async function getGoalWithAllSteps(
  userId: string,
  categoryId: string,
  goalId: string,
): Promise<GoalWithSteps> {
  try {
    const db = getDb();
    // 目標を取得
    const goalRef = db
      .collection('users')
      .doc(userId)
      .collection('category')
      .doc(categoryId)
      .collection('goals')
      .doc(goalId);
    const goalSnap = await goalRef.get();

    if (!goalSnap.exists) {
      throw new Error(
        `Goal with id ${goalId} not found in category ${categoryId}`,
      );
    }

    const goalData = goalSnap.data() as Goal;

    // すべてのステップ階層を再帰的に取得
    const steps: StepWithChildren[] = await getStepsRecursively(
      userId,
      categoryId,
      goalId,
    );

    // goalId配下のtodoを取得
    const todos: TodoWithId[] = await getTodos(userId, categoryId, goalId, []);

    return {
      id: goalId,
      ...goalData,
      steps,
      todos: todos.length > 0 ? todos : undefined,
    };
  } catch (error) {
    console.error('Error fetching goal with all steps:', error);
    throw error;
  }
}

/**
 * Cloud Function: userId, categoryId, goalIdを受け取ってgoalId以下のデータをJSONで出力
 */
export const exportJson = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    region: 'asia-northeast1',
  },
  async (request) => {
    const { userId, categoryId, goalId } = request.data;

    if (!userId || !categoryId || !goalId) {
      throw new Error('userId, categoryId, goalIdは必須です');
    }

    try {
      const goalData = await getGoalWithAllSteps(userId, categoryId, goalId);
      return {
        success: true,
        data: goalData,
      };
    } catch (error: any) {
      console.error('JSON出力エラー:', error);
      throw new Error(`JSON出力に失敗しました: ${error.message}`);
    }
  },
);

