import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: './svelte/knight_moves.svelte',
  output: {
    sourcemap: true,
    format: 'es',
    name: 'KnightMoves',
    file: 'app/javascript/dist/knight_moves.js'
  },
  plugins: [
    svelte({
      compilerOptions: {
        dev: true,
      },
    }),
    resolve({
      browser: true,
      dedupe: ['svelte']
    })
  ],
  watch: {
    clearScreen: false
  }
}
