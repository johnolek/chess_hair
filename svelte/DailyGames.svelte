<script>
  import { onMount } from 'svelte';
  import Config from "src/local_config";
  import { ConfigForm } from "src/local_config";
  import { boardOptions, pieceSetOptions } from "src/board/options";
  import DailyGame from "./DailyGame.svelte";

  let myGames = [];
  let theirGames = [];
  let title = 'Daily Games';
  $: document.title = title;
  let pieceSet;
  let gameCount = null;
  let previousGameCount = null;

  $: {
    if (previousGameCount !== null && gameCount !== null && gameCount > previousGameCount) {
      const newTitle = '♘'.repeat(gameCount);
      animateTitle(newTitle);
    }
    if (gameCount === 0) {
      setTitle('Not your turn');
    }
  }

  const chessDotComUsername = document.body.dataset.chessDotComUsername;
  const config = new Config();
  const configForm = new ConfigForm(config);
  const updateFrequencyOption = config.getConfigOption('Update frequency in seconds', 5);

  const boardOption = config.getConfigOption('Board', 'brown');
  boardOption.setAllowedValues(boardOptions);
  boardOption.addObserver(board => {
    document.body.dataset.board = board;
    boardOption.setValue(board);
  });

  const pieceSetOption = config.getConfigOption('Piece set', 'merida');
  pieceSetOption.setAllowedValues(pieceSetOptions);
  pieceSetOption.addObserver(set => {
    pieceSet = set;
  });
  pieceSet = pieceSetOption.getValue();

  const titleAnimationSpeedOption = config.getConfigOption('Title animation speed in ms', 250);
  const titleAnimationLength = config.getConfigOption('Title animation length in ms', 3000);
  const firstTitleAnimationText = config.getConfigOption('Title animation 1', '♘♞♘ New Move ♘♞♘');
  const secondTitleAnimationText = config.getConfigOption('Title animation 2', '♞♘♞ New Move ♞♘♞');

  const themeOption = config.getConfigOption('Theme', 'system');
  themeOption.setAllowedValues(['system', 'dark', 'light']);

  function animateTitle(finalTitle) {
    const string1 = firstTitleAnimationText.getValue();
    const string2 = secondTitleAnimationText.getValue();

    let animationInterval = setInterval(function () {
      title = title === string1 ? string2 : string1;
    }, titleAnimationSpeedOption.getValue());

    setTimeout(function () {
      clearInterval(animationInterval);
      setTitle(finalTitle);
    }, titleAnimationLength.getValue());
  }

  function setTitle(newTitle) {
    title = `${newTitle} | Daily Games`;
  }

  async function updateGames() {
    const games = await fetchGames();
    myGames = filterMyTurnGames(games);
    theirGames = filterTheirTurnGames(games);
    previousGameCount = gameCount;
    gameCount = myGames.length;
    setTimeout(updateGames, updateFrequencyOption.getValue() * 1000);
  }

  /**
   * @typedef {Object} Game
   * @property {string} url
   * @property {number} move_by
   * @property {string} pgn
   * @property {string} time_control
   * @property {number} last_activity
   * @property {boolean} rated
   * @property {string} turn
   * @property {string} fen
   * @property {number} start_time
   * @property {string} time_class
   * @property {string} rules
   * @property {string} white
   * @property {string} black
   */

  /**
   * Fetch games
   * @returns {Promise<Game[]>} The games
   */
  async function fetchGames() {
    const response = await fetch(`https://api.chess.com/pub/player/${chessDotComUsername}/games`);
    const data = await response.json();
    return data.games;
  }

  function filterMyTurnGames(games) {
    return games.filter(game => (game.turn === 'white' && game.white.includes(chessDotComUsername)) || (game.turn === 'black' && game.black.includes(chessDotComUsername)));
  }

  function filterTheirTurnGames(games) {
    const myTurnGames = filterMyTurnGames(games)
    const myTurnUrls = myTurnGames.map((game) => game.url);
    return games.filter((game) => !myTurnUrls.includes(game.url));
  }

  onMount(async () => {
    await updateGames();
    configForm.addLinkToDOM('config');
    document.body.dataset.board = boardOption.getValue();
  });
</script>

<link id="piece-sprite" href="/piece-css/{pieceSet}.css" rel="stylesheet">

<h1 class="title">Daily Games</h1>
<h2>My Turn</h2>
{#each myGames as game (game.url)}
  <DailyGame
    {game}
    myColor="{game.white.includes(chessDotComUsername) ? 'white' : 'black'}"
  />
{/each}
<hr/>
<h2>Their Turn</h2>
{#each theirGames as game (game.url)}
  <DailyGame {game} myColor="{game.white.includes(chessDotComUsername) ? 'white' : 'black'}"/>
{/each}
