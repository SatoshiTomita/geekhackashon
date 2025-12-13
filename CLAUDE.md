# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 3 application with Firebase backend (Firestore, Functions) for goal tracking and task management. The app uses a hierarchical goal structure: parent goals → steps (sub-goals) → subSteps (grandchild goals) → todos. Users can manage goals across multiple categories (健康/health, 生活/life, 学習/study, 仕事/work).

## Development Commands

### Frontend (Nuxt)
```bash
npm install              # Install dependencies (root directory)
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run fix              # Format and fix linting issues
```

### Backend (Firebase Functions)
```bash
cd functions
npm install              # Install function dependencies
npm run serve            # Run local emulator (functions on localhost:5001)
npm run build            # Compile TypeScript functions
npm run build:watch      # Watch mode for function compilation
npm run deploy           # Deploy functions to Firebase
npm run logs             # View function logs
```

## Environment Configuration

The project uses environment-specific configuration prefixed by NODE_ENV:
- Copy `@.env` to `.env` and populate with Firebase credentials
- Environment variables follow pattern: `{NODE_ENV}_{VARIABLE_NAME}`
- Example: `development_apiKey`, `production_projectId`
- Variables are accessed in `nuxt.config.ts` via `process.env[process.env.NODE_ENV + "_" + "apiKey"]`

Update `.firebaserc` with your Firebase project name (default: "geekhackathon").

## Architecture

### Directory Structure

```
app/
  ├── components/       # Vue components (GoalCard, NavigationButtons, etc.)
  ├── composables/      # Reusable composition functions
  │   └── useFireStore.ts  # Main Firestore data operations
  ├── pages/           # File-based routing
  │   ├── index.vue    # Root page (redirects to login page)
  │   ├── login.vue    # Authentication page
  │   ├── sample.vue   # Sample/demo page
  │   └── users/[userId]/
  │       ├── index.vue    # User dashboard with category tabs
  │       ├── analyze.vue  # Analysis page
  │       └── sample.vue   # User-specific sample
  ├── plugins/         # Nuxt plugins
  │   ├── firebaseInit.global.ts  # Firebase initialization (main)
  │   └── useFirestore.ts         # Firestore plugin
  ├── middleware/      # Route middleware
  │   └── firebaseInit.global.client.ts  # (Currently commented out)
  └── assets/css/      # Global styles
      └── common.scss

functions/
  └── src/
      └── index.ts     # Firebase Cloud Functions (region: asia-northeast1)

@types/                # TypeScript type definitions
  ├── goal.d.ts        # Goal type (title, ratio)
  ├── stepDoc.d.ts     # Step document type
  ├── todoDoc.d.ts     # Todo document type
  └── categoryDoc.d.ts # Category document type
```

### Key Technical Patterns

**Firebase Initialization:**
- Primary initialization happens in `app/plugins/firebaseInit.global.ts` as a route middleware
- Configures Firebase Functions region as `asia-northeast1`
- Development mode connects to local emulator at `localhost:5001`
- Runtime config pulls environment variables from `nuxt.config.ts`

**Firestore Data Access:**
- All Firestore operations centralized in `app/composables/useFireStore.ts`
- Uses Vue 3 Composition API with `useNuxtApp()` to access `$db`
- Key functions include: `getGoalWithSteps()`, `getAllGoalsWithSteps()`, `addStep()`, `updateStep()`, `deleteStep()`, `addTodo()`, `updateTodo()`, `deleteTodo()`

**Data Hierarchy:**
```
users/{userId}/
  └── goals/{goalId}
      ├── steps/{stepId}
      │   └── subSteps/{subStepId}
      │       └── todos/{todoId}
```

**Routing:**
- Dynamic user routes: `/users/[userId]` for user-specific pages
- Category-based filtering handled in client-side with reactive `selectedCategoryId`

**UI Framework:**
- Tailwind CSS for styling (configured via `@nuxtjs/tailwindcss` module)
- Global SCSS in `app/assets/css/common.scss`
- Custom Tailwind class whitelist in ESLint config for dynamic class generation

### Code Quality Tools

**ESLint Configuration:**
- Extends Nuxt TypeScript config, Tailwind recommended rules, and Prettier
- Console statements allowed (`no-console: off`)
- Multi-word component names not enforced for simpler Vue components
- Custom Tailwind class whitelist for dynamic classes (e.g., `.+-primary`, `.+-error`)

**Prettier:**
- Integrated with Tailwind plugin for class sorting
- Format command available as `npm run format`

## Deployment

- **Frontend:** Configured for Vercel deployment (`nitro.preset: "vercel"`)
- **Functions:** Deploy to Firebase with `npm run deploy` from functions directory
- Set environment variables in Vercel dashboard for production

## Important Notes

- Firebase Functions emulator port: 5001
- Functions region locked to `asia-northeast1`
- Development environment uses local Firebase emulators
- User IDs are passed via route params (`[userId]`) for data isolation
