<script>
  import { onMount } from 'svelte';
  import Config from "../app/javascript/src/local_config";
  import { ConfigForm } from "../app/javascript/src/local_config";
  import { boardOptions, pieceSetOptions } from "../app/javascript/src/board/options";
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
      const newTitle = `${knightSymbols(gameCount.length)}`;
      animateTitle(newTitle);
    }
  }

  const playerName = document.body.dataset.chessDotComUsername;
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

  function knightSymbols(count) {
    const knight = '♘';
    return knight.repeat(count);
  }

  function animateTitle(finalTitle) {
    const string1 = firstTitleAnimationText.getValue();
    const string2 = secondTitleAnimationText.getValue();

    let animationInterval = setInterval(function () {
      title = title === string1 ? string2 : string1;
    }, titleAnimationSpeedOption.getValue());

    setTimeout(function () {
      clearInterval(animationInterval);
      title = finalTitle;
    }, titleAnimationLength.getValue());
  }

  onMount(async () => {
    async function fetchGames() {
      const response = await fetch(`https://api.chess.com/pub/player/${playerName}/games`);
      const data = await response.json();
      return data.games;
    }

    function filterMyTurnGames(games) {
      return games.filter(game => (game.turn === 'white' && game.white.includes(playerName)) || (game.turn === 'black' && game.black.includes(playerName)));
    }

    function sortGamesByMostRecentActivity(games) {
      return games.sort((a, b) => b.last_activity - a.last_activity);
    }

    function filterTheirTurnGames(games) {
      const myTurnGames = filterMyTurnGames(games)
      const myTurnUrls = myTurnGames.map((game) => game.url);
      return games.filter((game) => !myTurnUrls.includes(game.url));
    }

    function removeAllUndesiredLinks() {
      const analysisLinks = [...document.querySelectorAll('.lpv__menu__analysis')];
      const practiceLinks = [...document.querySelectorAll('.lpv__menu__practice')];
      const allLinks = [...analysisLinks, ...practiceLinks];
      allLinks.forEach((link) => {
        link.parentNode.removeChild(link);
      });
    }

    async function updateGames() {
      const games = await fetchGames();
      myGames = filterMyTurnGames(games);
      previousGameCount = gameCount;
      gameCount = myGames.length;
      theirGames = filterTheirTurnGames(games);
      setTimeout(updateGames, updateFrequencyOption.getValue() * 1000);
    }

    await updateGames();
    configForm.addLinkToDOM('config');
    document.body.dataset.board = boardOption.getValue();
  });
</script>

<link id="piece-sprite" href="/piece-css/{pieceSet}.css" rel="stylesheet">
<h1>Daily Games</h1>
<h2>My Turn</h2>
{#each myGames as game}
  <DailyGame {game} myColor="{game.white.includes(playerName) ? 'white' : 'black'}"/>
{/each}
<hr/>
<h2>Their Turn</h2>
{#each theirGames as game}
  <DailyGame {game} myColor="{game.white.includes(playerName) ? 'white' : 'black'}"/>
{/each}
