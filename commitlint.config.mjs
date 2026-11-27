/**
 * Mensagens de commit no padrão Conventional Commits, em português.
 * Formato: `tipo: descrição` — ex.: `fix: taxa de entrega arredondada errado`.
 * Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Descrição em português começa com qualquer letra (maiúscula ou não).
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};

export default config;
