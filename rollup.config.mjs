import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const isProduction = process.env.RAILS_ENV === 'production';

export default {
  plugins: [
    svelte({
      compilerOptions: {
        dev: !isProduction,
      },
      emitCss: false
    }),
    resolve({
      browser: true,
      dedupe: ['svelte', 'svelte-fa'],
      extensions: ['.svelte', '.mjs', '.js', '.json', '.node']
    }),
    commonjs()
  ],
  external: id => id.startsWith('src/'),
  input: './svelte/App.svelte',
  output: {
    sourcemap: true,
    format: 'es',
    name: 'App',
    file: 'app/javascript/dist/app.js'
  },
}
