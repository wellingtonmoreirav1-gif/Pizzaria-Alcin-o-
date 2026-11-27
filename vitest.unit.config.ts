import { defineConfig } from 'vitest/config';
import base from './vitest.config';

/** Só os testes unitários (sem banco). Usado pelo Stryker e pela cobertura do CI. */
export default defineConfig({ ...base, test: { ...base.test, include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'] } });
