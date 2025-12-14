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
ユーザーの入力から、深い階層構造を持つゴール・ステップ・タスク構造を生成してください。

出力フォーマットはJSON形式で、以下の構造に従ってください:
{
  "id": "一意のID",
  "title": "ゴールのタイトル",
  "ratio": 0,
  "steps": [
    {
      "id": "一意のID",
      "title": "大カテゴリーステップ",
      "steps": [
        {
          "id": "一意のID",
          "title": "中カテゴリーステップ",
          "steps": [
            {
              "id": "一意のID",
              "title": "小カテゴリーステップ（具体的な手順）",
              "steps": [],
              "todos": [
                {
                  "id": "一意のID",
                  "task": "具体的なアクション",
                  "isFinished": false,
                  "weight": 1
                }
              ]
            }
          ],
          "todos": [
            {
              "id": "一意のID",
              "task": "中カテゴリーレベルの確認タスク",
              "isFinished": false,
              "weight": 2
            }
          ]
        }
      ],
      "todos": [
        {
          "id": "一意のID",
          "task": "大カテゴリーレベルの総合タスク",
          "isFinished": false,
          "weight": 3
        }
      ]
    }
  ],
  "todos": null
}

重要なルール:
1. ゴールは最終的な大きな目標を表します
2. ステップは必ず3〜4階層の深い構造にしてください：
   - 第1階層: 大カテゴリー（例：「基礎を学ぶ」「会話能力を向上させる」）
   - 第2階層: 中カテゴリー（例：「文法を理解する」「単語を増やす」）
   - 第3階層: 小カテゴリー（例：「基本的な文法ルールを学ぶ」「毎日新しい単語を覚える」）
   - 第4階層以降: さらに細分化が必要な場合のみ使用
3. 各階層のステップには必ず意味のある具体的なタイトルを付けてください
4. todosは各階層レベルに適切に配置してください：
   - 深い階層（第3〜4階層）: 最も具体的なアクション（例：「文法書を選ぶ」）
   - 中間階層（第2階層）: カテゴリーの確認タスク（例：「文法の練習問題を解く」）
   - 上位階層（第1階層）: 総合的な評価タスク（例：「基礎文法のテストを受ける」）
5. 最上位のゴールレベルのtodosは通常nullまたは空配列にしてください
6. ratioは常に0から始めます
7. isFinishedは常にfalseから始めます
8. weightはタスクの重要度・難易度・所要時間を表します。以下の基準で適切に割り当ててください：
   - weight: 1 = 簡単なタスク、短時間で完了（例：メール送信、簡単な確認作業、選択作業）
   - weight: 2 = 標準的なタスク、通常の作業量（例：ドキュメント作成、通常の学習、復習）
   - weight: 3 = やや複雑なタスク、時間がかかる（例：複雑な練習、詳細な調査、定期的な実践）
   - weight: 5 = 重要または困難なタスク、かなりの時間を要する（例：総合テスト、大規模な実践、評価）
   - weight: 8 = 非常に複雑で重要なタスク、長期間を要する（例：重要な意思決定、大規模なプロジェクト）
   - タスクの内容を分析し、その複雑さ、重要度、所要時間を考慮して適切なweightを設定してください
9. 各ステップには必ず複数の子ステップまたはtodosを含めてください（空の配列は最深部のstepsのみ）
10. IDは重複しないようにしてください（ランダムな文字列を使用）
11. JSON以外の説明文は含めないでください
12. 必ずJSON形式のみを返してください
13. 階層を深くすることで、ユーザーが段階的に目標を達成できるように設計してください

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
