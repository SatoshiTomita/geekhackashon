import OpenAI from "openai";
import { onCall } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";

// 型定義
interface TodoDoc {
  task: string;
  isFinished: boolean;
  weight?: number;
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

// OpenAI APIクライアントの初期化
const initOpenAI = () => {
  // ローカルの.env.localを優先、見つからなければFirebase Configから取得
  const apiKey =
    process.env.OPENAI_API_KEY || functions.config().openai_api_key?.key;
  console.log(
    "OPENAI_API_KEY loaded:",
    apiKey ? "Yes (length: " + apiKey.length + ")" : "No"
  );
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY環境変数が設定されていません");
  }
  return new OpenAI({ apiKey });
};

/**
 * ランダムなIDを生成する関数
 */
function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * OpenAI APIを使用してタスクリストを生成する関数
 */
async function generateTaskList(prompt: string): Promise<GoalWithSteps> {
  const openai = initOpenAI();

  const systemPrompt = `あなたはタスク管理のエキスパートです。
ユーザーの入力から、階層的なゴール・ステップ・タスク構造を生成してください。

出力フォーマットはJSON形式で、以下の構造に従ってください:
{
  "id": "一意のID",
  "title": "ゴールのタイトル",
  "ratio": 0,
  "steps": [
    {
      "id": "一意のID",
      "title": "ステップのタイトル",
      "steps": [
        {
          "id": "一意のID",
          "title": "サブステップのタイトル",
          "steps": [],
          "todos": [
            {
              "id": "一意のID",
              "task": "具体的なタスク内容",
              "isFinished": false,
              "weight": 1
            }
          ]
        }
      ],
      "todos": []
    }
  ],
  "todos": []
}

重要なルール:
1. ゴールは大きな目標を表します
2. ステップは中規模の実行項目です（複数階層可能）
3. todosは具体的な作業タスクです
4. ratioは常に0から始めます
5. isFinishedは常にfalseから始めます
6. weightはタスクの重要度・難易度・所要時間を表します。以下の基準で適切に割り当ててください：
   - weight: 1 = 簡単なタスク、短時間で完了（例：メール送信、簡単な確認作業）
   - weight: 2 = 標準的なタスク、通常の作業量（例：ドキュメント作成、通常のコーディング）
   - weight: 3 = やや複雑なタスク、時間がかかる（例：複雑な機能実装、詳細な調査）
   - weight: 5 = 重要または困難なタスク、かなりの時間を要する（例：大規模なリファクタリング、重要な意思決定）
   - weight: 8 = 非常に複雑で重要なタスク、長期間を要する（例：アーキテクチャ設計、大規模な機能開発）
   - タスクの内容を分析し、その複雑さ、重要度、所要時間を考慮して適切なweightを設定してください
   - 同じステップ内のタスクでも、内容に応じてweightは異なることがあります
7. 階層は論理的に構造化してください
8. IDは重複しないようにしてください
9. JSON以外の説明文は含めないでください
10. 必ずJSON形式のみを返してください

ユーザーの入力: ${prompt}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI APIからの応答が空です");
    }

    // JSONをパース
    const parsedData = JSON.parse(text) as GoalWithSteps;

    // IDが設定されていない場合は生成
    if (!parsedData.id) {
      parsedData.id = generateId();
    }

    // 再帰的にIDを設定
    const ensureIds = (steps: StepWithChildren[]) => {
      for (const step of steps) {
        if (!step.id) {
          step.id = generateId();
        }
        if (step.todos) {
          for (const todo of step.todos) {
            if (!todo.id) {
              todo.id = generateId();
            }
          }
        }
        if (step.steps && step.steps.length > 0) {
          ensureIds(step.steps);
        }
      }
    };

    if (parsedData.steps) {
      ensureIds(parsedData.steps);
    }

    if (parsedData.todos) {
      for (const todo of parsedData.todos) {
        if (!todo.id) {
          todo.id = generateId();
        }
      }
    }

    return parsedData;
  } catch (error: any) {
    console.error("OpenAI API呼び出しエラー:", error);
    throw new Error(`タスクリストの生成に失敗しました: ${error.message}`);
  }
}

/**
 * Cloud Function: ユーザーの入力からタスクリストを生成
 */
export const generateTaskListFromPrompt = onCall(
  {
    cors: ["http://localhost:3000", "http://127.0.0.1:3000"],
    region: "asia-northeast1",
  },
  async (request) => {
    console.log(
      "generateTaskListFromPrompt called with prompt:",
      request.data.prompt
    );

    const { prompt } = request.data;

    if (!prompt) {
      console.error("Error: promptが提供されていません");
      throw new Error("promptは必須です");
    }

    try {
      const taskList = await generateTaskList(prompt);
      console.log("タスクリスト生成成功");
      return {
        success: true,
        data: taskList,
      };
    } catch (error: any) {
      console.error("タスクリスト生成エラー:", error);
      console.error("Error stack:", error.stack);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }
);
