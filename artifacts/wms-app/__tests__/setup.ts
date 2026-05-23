// Test setup file
import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';

process.env.NODE_ENV = 'test';

// Mock fetch globally
global.fetch = vi.fn();