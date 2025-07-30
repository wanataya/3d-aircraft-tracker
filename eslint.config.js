import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  // options here
}).append(
  // your custom flat configs go here, for example:
  {
    ignores: [
      'node_modules',
      'dist',
      '.nuxt',
      '.output',
      '.git',
      '*.log',
      'public/models/',
      'public/textures/'
    ],
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn', 
      'prefer-const': 'error'
    }
  }
)
