# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native mobile application built with Expo, TypeScript, and NativeWind (Tailwind CSS for React Native). Uses file-based routing via Expo Router.

## Development Commands

### Running the App
- `npm run start` - Start Expo dev server with dev client
- `npm run dev:ios` - Run on iOS Simulator with live reload
- `npm run dev:android` - Run on Android Emulator with live reload
- `npm run web` - Run in web browser
- `npm run android` - Build and run native Android app
- `npm run ios` - Build and run native iOS app

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Fix linting and format JSON/YAML files with Prettier
- `npm run check-types` - Run TypeScript type checking without emitting files

### Testing
- `npm test` - Run Jest unit tests with coverage
- `npm run e2e:prepare` - Prebuild Expo project for E2E testing (run once)
- `npm run e2e:ios` - Build and run iOS E2E tests with Detox
- `npm run e2e:android` - Build and run Android E2E tests with Detox

### Utilities
- `npm run clean` - Remove .expo, android, ios, and coverage directories

## Architecture

### File-Based Routing
- Entry point: `Main.tsx` imports `expo-router/entry`
- Root layout: `app/_layout.tsx` configures NativeWind and Stack navigation
- Routes: Files in `app/` directory become routes automatically
  - `app/index.tsx` - Home screen route (/)
- Each route can configure its own Stack.Screen options

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json and jest.config.js)
- Import components like: `import { Welcome } from '@/templates/Welcome'`

### Component Organization
- `src/templates/` - Page-level UI templates/components
- Tests colocated with components (e.g., `Welcome.test.tsx` next to `Welcome.tsx`)

### Styling
- NativeWind provides Tailwind-style className prop for React Native components
- Configuration: `tailwind.config.js`
- NativeWind output mode set to 'native' in `app/_layout.tsx`
- Use className on React Native components: `<View className="flex-1 items-center justify-center">`

### TypeScript Configuration
- Very strict type checking enabled (strict, noUncheckedIndexedAccess, noImplicitAny, etc.)
- ESLint enforces `import type` for type-only imports (@typescript-eslint/consistent-type-imports)
- Named exports preferred over default exports

### Testing Strategy
- Unit tests: Jest + React Testing Library
  - Test files: `**/*.test.ts` or `**/*.test.tsx`
  - Coverage thresholds: 30% for branches, functions, lines, statements
- E2E tests: Detox
  - Test files: `e2e/**/*.e2e.ts`
  - Requires `npm run e2e:prepare` before first run

### Code Style Enforcement
- ESLint with Airbnb config + TypeScript
- Husky pre-commit hooks with lint-staged
- Simple import sort plugin enforces import ordering
- Unused imports automatically detected and must be removed
