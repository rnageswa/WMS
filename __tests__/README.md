# Warehouse Management System Automation Testing Framework

## Overview

This directory contains the automation testing framework for the Warehouse Management System.

## Directory Structure

```
__tests__/
├── unit/
│   ├── components/
│   │   ├── products/
│   │   │   ├── products/
│   │   │   │   └── ProductForm.test.tsx
│   │   │   │   └── ProductList.test.tsx
│   │   ├── inventory/
│   │   │   └── InventoryAdjustmentForm.test.tsx
│   │   ├── purchasing/
│   │   ├── orders/
│   │   └── suppliers/
│   └── services/
│       ├── api.test.ts
│       └── validation.test.ts
├── e2e/
│   └── critical-flows/
│       └── auth-flow.spec.ts
└── setup.ts
```

## Test Commands

```bash
# Component/Unit Tests
npm run test              # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:coverage      # Run tests with coverage report
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Run Playwright E2E tests in headed mode
```

## Test Structure

### Unit Tests (Vitest + React Testing Library) - 90% of tests
- Component rendering tests
- Business logic tests
- API service tests
- Utility function tests

### End-to-End Tests (Playwright) - 10% of tests
- Critical user flows
- Authentication flows
- Complex workflows

## Test Files

All test files follow the naming convention:
- `*.test.ts` or `*.test.tsx` for unit tests
- `*.spec.ts` for end-to-end tests

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `setup.ts` - Test setup file

This framework provides comprehensive testing coverage with 90% component/unit tests and 10% end-to-end tests for critical flows.