# Warehouse Management System - How to Run Tests

## Test Commands

All test commands should be run from: `D:\MyProjects\WMS\WMS\artifacts\wms-app`

```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app

# Run unit tests (watch mode)
npm run test

# Run unit tests once
npm run test:run

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (requires dev server running first)
npm run test:e2e
```

## Environment Setup

Ensure `.env` file exists in `/artifacts/wms-app/` with:
```
PORT=3000
BASE_PATH=/
```

## Test Structure

- **Unit tests**: `src/**/*.test.{ts,tsx}` - Components, utilities, logic
  - Vitest config: `vitest.config.ts` (scans only `src/`)
  - Excludes: `__tests__/` directory (reserved for e2e)
  - jsdom environment with polyfills for browser APIs
- **E2E tests**: `__tests__/e2e/**/*.spec.ts` - Critical user flows
  - Playwright config: `playwright.config.ts`

## Current Test Status

### Unit Tests: 21 passing ✅

| File | Tests | Description |
|------|-------|-------------|
| `src/lib/export-excel.test.ts` | 6 | Excel export utility |
| `src/lib/utils.test.ts` | 1 | Utility functions |
| `src/lib/offline/query-cache.test.ts` | 8 | TTL mapping for query cache |
| `src/components/command-palette.test.tsx` | 1 | Command Palette |
| `src/components/help-tooltip.test.tsx` | 1 | Help Tooltip |
| `src/components/product-form.test.tsx` | 1 | Product Form |
| `src/wms-test-verification.test.ts` | 2 | Test framework verification |
| `src/sample.test.ts` | 1 | Sample test |

### E2E Tests

E2E tests are in `__tests__/e2e/critical-flows/` and require:
1. Dev server running (`npm run dev`)
2. Clerk authentication credentials configured
3. API endpoints accessible

Note: Some E2E tests may fail if the dev server is not running or API is unavailable.

## Test Infrastructure

### Mock Utilities

`src/__mocks__/test-utils.tsx` provides:
- Mock Clerk auth context (`useUser`, `useClerk`)
- Mock IndexedDB (for offline tests)
- Mock TanStack Query hooks

### Global Setup

`__tests__/setup.ts` provides:
- `@testing-library/jest-dom` matchers
- Global fetch mock
- NODE_ENV = 'test'

## Troubleshooting

### React 19 Compatibility
The project uses React 19. The `@testing-library/react` was upgraded to v15+ for compatibility:
```json
"@testing-library/react": "^15.0.0"
```

If you see errors like `ReactDOMTestUtils.act is deprecated`, ensure you're on v15+.

### Browser APIs in Unit Tests
Some browser APIs are not available in jsdom:
- `scrollIntoView`, `ResizeObserver` - Radix UI components use these
- `IndexedDB` - offline storage
- `BroadcastChannel` - cross-tab communication
- `navigator.onLine` - network detection

Complex components using these APIs require E2E testing or extensive mocking.

### Offline Infrastructure
The offline module (`src/lib/offline/*.ts`) uses browser APIs extensively:
- `network.ts`: Uses `navigator.onLine`, `BroadcastChannel`, `setInterval`
- `db.ts`: Uses `IndexedDB`
- `sync-engine.ts`: Imports from db and network
- `offline-fetch.ts`: Imports from network and db

Only `query-cache.test.ts` (TTL mapping logic) can be unit tested without heavy mocking.

## Next Steps

- Add more unit tests for pure utility functions
- Write E2E tests for offline scenarios (queue mutations, sync on reconnect)
- Consider adding MSW (Mock Service Worker) for more realistic API mocking
- Add integration tests for API routes