import eslintConfigTypescript from '@lionstone-digital/eslint-config-typescript'
import eslintPluginAstro from 'eslint-plugin-astro'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  ...eslintConfigTypescript,
  ...eslintPluginAstro.configs.recommended,
  { ignores: ['.astro/**', '.scratch/**'] },
  // Astro virtual modules (astro:assets) only exist at build time
  { rules: { 'import-x/no-unresolved': ['error', { ignore: ['^astro:'] }] } }
)
