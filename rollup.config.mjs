import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
const isProduction = process.env.RAILS_ENV === 'production';

export default {
  plugins: [
    svelte({
      compilerOptions: {
        dev: !isProduction,
      },
      include: './svelte/**/*.svelte',
      emitCss: false
    }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
    })
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
