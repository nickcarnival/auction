import { defineConfig } from 'eslint-define-config';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import unicornPlugin from 'eslint-plugin-unicorn';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default defineConfig([
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vscode/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/vitest.config.ts',
      '**/vitest.setup.ts',
    ],
  },

  // Base JavaScript/CommonJS configuration (including config files)
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022, // Use a more recent ECMAScript version
      sourceType: 'module',
      globals: {
        ...globals.node, // Node globals for JS/CJS/MJS files
      },
    },
    plugins: {
      import: importPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      ...eslintJs.configs.recommended.rules, // Start with recommended JS rules
      ...unicornPlugin.configs.recommended.rules, // Add unicorn recommended rules
      'no-console': ['warn', { allow: ['warn', 'log', 'error', 'info'] }],
      'import/no-extraneous-dependencies': 'off',
      // Customize unicorn rules as needed
      'unicorn/no-null': 'off', // Allow null when necessary
      'unicorn/prevent-abbreviations': 'off', // Allow common abbreviations
      'unicorn/filename-case': 'off', // Temporarily disable filename case rules
      'unicorn/switch-case-braces': 'off', // Allow no braces in switch case
      'unicorn/prefer-node-protocol': 'off', // Allow regular imports instead of node: protocol
      'unicorn/no-array-for-each': 'off', // Allow forEach
      'unicorn/catch-error-name': 'off', // Allow various error names
      'unicorn/explicit-length-check': 'off', // Allow length checks without explicit === 0
      'unicorn/prefer-module': 'off', // Allow CommonJS module patterns
      'unicorn/no-lonely-if': 'off', // Allow lonely if statements
      'unicorn/error-message': 'off', // Allow empty error messages
      'unicorn/no-process-exit': 'off', // Allow process.exit()
      'unicorn/prefer-number-properties': 'off', // Allow direct parseInt
      'unicorn/prefer-string-replace-all': 'off', // allow .replace(/g) for older TS lib targets
    },
  },

  // TypeScript Configuration (for server, shared, client TS, and d.ts files)
  {
    files: ['**/*.{ts,tsx,d.ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: [
          './tsconfig.json',
          './client/tsconfig.app.json',
          './client/tsconfig.node.json',
          './server/tsconfig.json',
          './shared/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname, // Use import.meta.dirname in ESM
      },
      globals: {
        ...globals.node, // Default to node globals for TS files initially
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      ...tseslint.configs['eslint-recommended'].rules, // Override base JS rules incompatible with TS
      ...tseslint.configs.recommended.rules, // Recommended TS rules
      ...unicornPlugin.configs.recommended.rules, // Add unicorn recommended rules
      // ...tseslint.configs['recommended-requiring-type-checking'].rules, // Optional: Consider enabling later
      'no-console': ['warn', { allow: ['warn', 'log', 'error', 'info'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      // Add configuration for empty object types
      '@typescript-eslint/no-empty-object-type': 'off', // Turn off empty object type warnings
      '@typescript-eslint/no-explicit-any': 'error', // Changed from warn to error
      // Add rule to disable the import/no-extraneous-dependencies error
      'import/no-extraneous-dependencies': 'off',
      // Customize unicorn rules for TypeScript
      'unicorn/no-null': 'off', // Allow null for TypeScript compatibility
      'unicorn/prevent-abbreviations': 'off', // Allow common abbreviations
      'unicorn/filename-case': 'off', // Temporarily disable filename case rules
      'unicorn/switch-case-braces': 'off', // Allow no braces in switch case
      'unicorn/prefer-node-protocol': 'off', // Allow regular imports instead of node: protocol
      'unicorn/no-array-for-each': 'off', // Allow forEach
      'unicorn/catch-error-name': 'off', // Allow various error names
      'unicorn/explicit-length-check': 'off', // Allow length checks without explicit === 0
      'unicorn/prefer-module': 'off', // Allow CommonJS module patterns
      'unicorn/prefer-ternary': 'off', // Allow if statements that could be ternary
      'unicorn/no-negated-condition': 'off', // Allow negated conditions
      'unicorn/no-nested-ternary': 'off', // Allow nested ternary expressions
      'unicorn/prefer-add-event-listener': 'off', // Allow on* event handlers
      'unicorn/prefer-global-this': 'off', // Allow window references
      'unicorn/no-useless-undefined': 'off', // Allow explicit undefined
      'unicorn/prefer-string-slice': 'off', // Allow substring
      'unicorn/prefer-set-has': 'off', // Allow array includes
      'unicorn/no-empty-file': 'off', // Allow empty files
      'unicorn/numeric-separators-style': 'off', // Allow different numeric formats
      'unicorn/no-lonely-if': 'off', // Allow lonely if statements
      'unicorn/error-message': 'off', // Allow empty error messages
      'unicorn/no-process-exit': 'off', // Allow process.exit()
      'unicorn/prefer-number-properties': 'off', // Allow direct parseInt
      'unicorn/prefer-string-replace-all': 'off', // allow .replace(/g) for older TS lib targets
    },
  },

  // Client-specific Configuration (React/Browser)
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      // Inherits parser/plugins from the main TS block
      globals: {
        ...globals.browser, // Override globals for browser environment
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    // Consider adding React plugin configuration here if needed
    plugins: {
      unicorn: unicornPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // Convert warnings to errors
      'no-console': ['warn', { allow: ['warn', 'log', 'error', 'info'] }],

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error', // Enforce rules of hooks
      'react-hooks/exhaustive-deps': 'error', // Verify the list of dependencies for hooks

      // React-specific rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off', // Turn off prop-types as we use TypeScript

      // Unicorn rules
      'unicorn/no-negated-condition': 'off', // Allow negated conditions
      'unicorn/no-nested-ternary': 'off', // Allow nested ternary expressions
    },
  },
]);
