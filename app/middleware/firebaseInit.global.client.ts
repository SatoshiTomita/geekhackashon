// import { initializeApp, getApp } from "firebase/app";
// import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// export default defineNuxtRouteMiddleware(() => {
//   const config = useRuntimeConfig();
//   if (!config.public.apiKey) {
//     console.error("apiKey is not defined");
//   }
//   if (!config.public.authDomain) {
//     console.error("authDomain is not defined");
//   }
//   if (!config.public.databaseURL) {
//     console.error("databaseURL is not defined");
//   }
//   if (!config.public.projectId) {
//     console.error("projectId is not defined");
//   }
//   if (!config.public.storageBucket) {
//     console.error("storageBucket is not defined");
//   }
//   if (!config.public.appId) {
//     console.error("appId is not defined");
//   }
//   if (!config.public.measurementId) {
//     console.error("measurementId is not defined");
//   }
//   initializeApp({
//     apiKey: config.public.apiKey,
//     authDomain: config.public.authDomain,
//     databaseURL: config.public.databaseURL,
//     projectId: config.public.projectId,
//     storageBucket: config.public.storageBucket,
//     messagingSenderId: config.public.messagingSenderId,
//     appId: config.public.appId,
//     measurementId: config.public.measurementId,
//   });
//   const functions = getFunctions(getApp());
//   functions.region = "asia-northeast1";
//   if (process.env.NODE_ENV === "development") {
//     // 開発時はlocalhostを参照する
//     connectFunctionsEmulator(functions, "localhost", 5001);
//   }
// });
