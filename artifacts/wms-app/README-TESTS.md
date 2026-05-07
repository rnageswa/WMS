# Warehouse Management System - How to Run Tests

## Test Commands

All test commands should be run from: `D:\MyProjects\WMS\WMS\artifacts\wms-app`

### Quick Commands

```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app

# Run tests (watch mode)
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires dev server to be running first)
npm run test:e2e
```

## Environment Setup

Ensure `.env` file exists in `/artifacts/wms-app/` with:
```
PORT=3000
BASE_PATH=/
```

## Test Structure

- **Unit tests** (90%): `src/**/*.test.{ts,tsx}` - Components, utilities, logic
  - Vitest config: `vitest.config.ts` (scans only `src/`)
  - Excludes: `__tests__/` directory (reserved for e2e)
- **E2E tests** (10%): `__tests__/e2e/**/*.spec.ts` - Critical user flows
  - Playwright config: `playwright.config.ts`

## Current Status

All core test infrastructure is working:
- ✅ `npm run test:run` - Works, 5 test files, 6 tests pass
- ✅ `npm run test:coverage` - Works, v8 coverage provider  
- ✅ `npm run test` - Works, watch mode
- ✅ `npm run test:e2e` - Works (requires `npm run dev` running first)

## E2E Testing

To run E2E tests:
1. Start dev server: `npm run dev` (keeps running)
2. In another terminal: `npm run test:e2e`

## Test Results Example

```
Test Files  5 passed (5)
     Tests  6 passed (6)
```

## Troubleshooting

### Port Conflicts
If port 3000 is in use, check if another instance of the app is running and stop it first.

### React Testing Library Compatibility
Current version (11.2.7) is incompatible with React 19. 
To render real components in tests, upgrade to `@testing-library/react@15+`.

## Next Steps

- Upgrade `@testing-library/react` to v15+ for React 19 compatibility
- Write more component tests for real WMS components