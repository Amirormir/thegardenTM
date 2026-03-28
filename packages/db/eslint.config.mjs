import baseConfig from '@nexus/config/eslint/base';

export default [
  {
    ignores: ['scripts/with-root-env.mjs'],
  },
  ...baseConfig,
];
