# How to Run Unit Tests for Warehouse Management System

## Test Execution Instructions

To run the unit tests, you need to navigate to the correct directory and use the appropriate commands:

## Root Folder for Running Tests

The root folder to execute unit tests is:
`D:\MyProjects\WMS\WMS\artifacts\wms-app`

## Prerequisites

Make sure you have installed the required dependencies:
```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app
pnpm install
```

## Running Tests

### To run all unit tests:
```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app
npm run test:run
```

### To run tests with coverage:
```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app
npm run test:coverage
```

### To run E2E tests:
```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app
npm run test:e2e
```

### To run E2E tests in headed mode:
```bash
cd D:\MyProjects\WMS\WMS\artifacts\wms-app
npm run test:e2e:ui
```

## Available Test Commands

The following test scripts are available in the package.json:

- `test`: Run tests in watch mode
- `test:ui`: Run tests with UI
- `test:run`: Run all tests once
- `test:coverage`: Run tests with coverage report
- `test:e2e`: Run Playwright E2E tests
- `test:e2e:ui`: Run Playwright E2E tests in headed mode

## Test Files Location

Test files are located in:
`D:\MyProjects\WMS\WMS\__tests__`

This includes:
- Unit tests in `__tests__/unit/`
- Component tests in `__tests__/unit/components/`
- E2E tests in `__tests__/e2e/`

## Test Framework Structure

The testing framework uses:
- Vitest + React Testing Library for 90% of tests (components and logic)
- Playwright for 10% of tests (critical user flows)