import prettierConfig from '@lionstone-digital/prettier-config'

export default {
  ...prettierConfig,
  plugins: [...prettierConfig.plugins, 'prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro'
      }
    }
  ]
}
