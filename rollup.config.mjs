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
    emitCss: false
  }),
  resolve({
    browser: true,
    dedupe: ['svelte'],
  })
];

const sharedWatchOptions = {
  clearScreen: false
};

const sharedConfig = {
  plugins: sharedPlugins,
  watch: sharedWatchOptions,
  external: id => id.startsWith('src/'),
};

export default [
  {
    ...sharedConfig,
    input: './svelte/KnightMoves.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'KnightMoves',
      file: 'app/javascript/dist/knight_moves.js'
    },
  },
  {
    ...sharedConfig,
    input: './svelte/DailyGames.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'DailyGames',
      file: 'app/javascript/dist/daily_games.js'
    },
  },
  {
    ...sharedConfig,
    input: './svelte/ThemeSwitcher.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'ThemeSwitcher',
      file: 'app/javascript/dist/theme_switcher.js'
    },
  },
  {
    ...sharedConfig,
    input: './svelte/NotationTrainer.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'NotationTrainer',
      file: 'app/javascript/dist/notation_trainer.js'
    },
  },
  {
    ...sharedConfig,
    input: './svelte/GlobalConfig.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'GlobalConfig',
      file: 'app/javascript/dist/global_config.js'
    },
  },
  {
    ...sharedConfig,
    input: './svelte/Puzzles.svelte',
    output: {
      ...sharedOutputOptions,
      name: 'Puzzles',
      file: 'app/javascript/dist/puzzles.js'
    },
  },
]
