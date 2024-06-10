import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';

const sharedOutputOptions = {
  sourcemap: true,
  format: 'es',
};

const sharedPlugins = [
  svelte({
    compilerOptions: {
      dev: true,
    },
    include: './svelte/**/*.svelte',
  }),
  resolve({
    browser: true,
    dedupe: ['svelte'],
  })
];

const sharedWatchOptions = {
  clearScreen: false
};

export default [
  {
    input: './svelte/KnightMoves.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'KnightMoves',
      file: 'app/javascript/dist/knight_moves.js'
    },
    plugins: sharedPlugins,
    watch: sharedWatchOptions
  },
  {
    input: './svelte/DailyGames.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'DailyGames',
      file: 'app/javascript/dist/daily_games.js'
    },
    plugins: sharedPlugins,
    watch: sharedWatchOptions
  }
]
