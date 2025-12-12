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
  api_stripe_createDepositPayment: './api/stripe/createDepositPayment',
  api_stripe_handleDepositPayment: './api/stripe/handleDepositPayment',
  api_stripe_processRefund: './api/stripe/processRefund',
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
      
      // 関数名に応じて適切な関数をエクスポート
      if (functionName === 'api_fireStore_exportJson' && importedModule.exportJson) {
        module.exports[functionName] = importedModule.exportJson;
      } else if (functionName === 'api_stripe_checkSubscription' && importedModule.checkSubscription) {
        module.exports[functionName] = importedModule.checkSubscription;
      } else if (functionName === 'api_stripe_createCheckoutSession' && importedModule.createCheckoutSession) {
        module.exports[functionName] = importedModule.createCheckoutSession;
      } else if (functionName === 'api_stripe_handleCheckoutSession' && importedModule.handleCheckoutSession) {
        module.exports[functionName] = importedModule.handleCheckoutSession;
      } else if (functionName === 'api_stripe_createDepositPayment' && importedModule.createDepositPayment) {
        module.exports[functionName] = importedModule.createDepositPayment;
      } else if (functionName === 'api_stripe_handleDepositPayment' && importedModule.handleDepositPayment) {
        module.exports[functionName] = importedModule.handleDepositPayment;
      } else if (functionName === 'api_stripe_processRefund' && importedModule.processRefund) {
        module.exports[functionName] = importedModule.processRefund;
      } else if (functionName === 'api_fireStore_addGoal' && importedModule.addGoal) {
        module.exports[functionName] = importedModule.addGoal;
      } else if (functionName === 'api_fireStore_updateGoal' && importedModule.updateGoal) {
        module.exports[functionName] = importedModule.updateGoal;
      } else if (functionName === 'api_fireStore_deleteGoal' && importedModule.deleteGoal) {
        module.exports[functionName] = importedModule.deleteGoal;
      } else {
        // CommonJS形式の場合（default exportなど）
        module.exports[functionName] = importedModule;
      }
    }
  }
};

loadFunctions(funcs);
