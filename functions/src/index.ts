import admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';
import serviceAccount from '../config/serviceAccountKey.json';

// firebase-adminを初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

setGlobalOptions({ region: 'asia-northeast1' });

process.env.TZ = 'Asia/Tokyo';

interface FunctionsObj {
  [key: string]: string;
}

// ここに定義を追加していく
const funcs = {
  // API
  api_fireStore_exportJson: './api/fireStore/exportJson',
  api_stripe_checkSubscription: './api/stripe/checkSubscription',
  api_stripe_createCheckoutSession: './api/stripe/createCheckoutSession',
  api_stripe_handleCheckoutSession: './api/stripe/handleCheckoutSession',
  api_fireStore_addGoal: './api/fireStore/manageGoal',
  api_fireStore_updateGoal: './api/fireStore/manageGoal',
  api_fireStore_deleteGoal: './api/fireStore/manageGoal',
};

const loadFunctions = (functionsObj: FunctionsObj) => {
  for (const functionName in functionsObj) {
    if (
      !process.env.FUNCTION_NAME ||
      process.env.FUNCTION_NAME.startsWith(functionName)
    ) {
      const importedModule = require(functionsObj[functionName]);
      // ES modulesのexport形式に対応（exportJsonなど名前付きエクスポート）
      if (importedModule.exportJson) {
        module.exports[functionName] = importedModule.exportJson;
      } else if (importedModule.checkSubscription) {
        module.exports[functionName] = importedModule.checkSubscription;
      } else if (importedModule.createCheckoutSession) {
        module.exports[functionName] = importedModule.createCheckoutSession;
      } else if (importedModule.handleCheckoutSession) {
        module.exports[functionName] = importedModule.handleCheckoutSession;
      } else if (importedModule.addGoal) {
        module.exports[functionName] = importedModule.addGoal;
      } else if (importedModule.updateGoal) {
        module.exports[functionName] = importedModule.updateGoal;
      } else if (importedModule.deleteGoal) {
        module.exports[functionName] = importedModule.deleteGoal;
      } else {
        // CommonJS形式の場合（default exportなど）
        module.exports[functionName] = importedModule;
      }
    }
  }
};

loadFunctions(funcs);
