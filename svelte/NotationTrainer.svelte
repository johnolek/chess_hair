<script>
  import { onMount } from 'svelte';
  import Chessboard from './components/Chessboard.svelte';

  import { parsePgn, startingPosition } from 'chessops/pgn';
  import { Util } from 'src/util';
  import { getRandomGame } from "src/random_games";
  import { parseSan } from "chessops/san";
  import { makeFen } from "chessops/fen";
  import { makeSquare } from "chessops/util";
  import { persisted } from "svelte-persisted-store";
  import ProgressTimer from "./components/ProgressTimer.svelte";

  const orientation = persisted('notation.orientation', 'white');

  let correctCount = 0;
  let incorrectCount = 0;
  let correctAnswer;
  let answerAllowed;
  let answerValue = '';

  let answerRank = '';
  let answerFile = '';

  let answers = [];

  let chessgroundConfig = {
    fen: '8/8/8/8/8/8/8/8',
    coordinates: false,
    animation: {
      enabled: true,
    },
    highlight: {
      lastMove: true,
    },
    draggable: {
      enabled: false,
    },
    selectable: {
      enabled: false,
    },
    orientation: $orientation,
  };
  let boardSize;
  let chessground;
  let fen;
  let displayGoodMessage;

  // Game stuff
  let gameRunning = false;
  let highScore = 0;
  let maxTime = 0;
  let correctBonus = 2;
  let incorrectPenalty = 10;

  $: {
    answerValue = `${answerFile}${answerRank}`;
  }

  $: {
    if (answerValue.length === 2) {
      handleAnswer();
    }
  }

  function newPosition() {
    answerAllowed = false;
    const game = getRandomGame();
    const pgnGame = parsePgn(game.pgn)[0];
    const totalPlies = [...pgnGame.moves.mainline()].length;

    const random = Util.getRandomIntBetween(1, totalPlies - 1);
    const positionResult = startingPosition(pgnGame.headers);
    const position = positionResult.unwrap();
    const allNodes = [...pgnGame.moves.mainlineNodes()];

    if (['O-O', 'O-O-O'].includes(allNodes[random].data.san)) {
      // Skip castles
      return newPosition();
    }

    let i;
    let move;
    let nextNode;

    for (i = 0; i < random; i++) {
      const node = allNodes[i];
      move = parseSan(position, node.data.san);
      position.play(move);
      nextNode = allNodes[i + 1];
    }
    fen = makeFen(position.toSetup());

    const nextMove = parseSan(position, nextNode.data.san);
    const from = makeSquare(nextMove.from);
    const to = makeSquare(nextMove.to);
    correctAnswer = to;

    setTimeout(() => {
      chessground.set({
        highlight: {
          lastMove: true,
          check: false,
        }
      });
      chessground.move(from, to);
      answerValue = '';
      answerAllowed = true;
    }, 200)
  }

  function handleAnswer() {
    if (!answerAllowed) {
      return;
    }
    if (answerValue.length !== 2) {
      return;
    }
    if (answerValue.toLowerCase().trim() === correctAnswer.toLowerCase()) {
      maxTime += correctBonus;
      correctCount++;
    } else {
      maxTime -= incorrectPenalty;
      incorrectCount++;
    }
    answerRank = '';
    answerFile = '';
    newPosition();
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (key === 'backspace') {
      answerRank = '';
      answerFile = '';
      return;
    }

    if (files.includes(key)) {
      answerFile = key;
    } else if (ranks.includes(key)) {
      answerRank = key;
    }
  }

  function startGame() {
    gameRunning = true;
    maxTime = 30;
    correctCount = 0;
    incorrectCount = 0;
    newPosition();
  }

  function endGame() {
    gameRunning = false;
    if (correctCount > highScore) {
      highScore = correctCount;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    newPosition();
  });
</script>

<div class="columns is-centered">
  <div class="column is-6-desktop">
    <div class="block">
      <Chessboard
        {chessgroundConfig}
        bind:fen={fen}
        bind:chessground={chessground}
        orientation={$orientation}
        bind:size={boardSize}
      />
    </div>
    {#if gameRunning}
      <ProgressTimer max={maxTime} width={boardSize} on:complete={endGame}></ProgressTimer>
    {/if}
    <div class="block" style="width: {boardSize}px;">
      <div class="columns">
        <div class="column">
          <div class="fixed-grid has-8-cols">
            <div class="grid">
              {#each files as file (file)}
                <div class="cell">
                  <button class:selected={answerFile === file} class="button"
                          on:click={() => answerFile = file}>{file}</button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <div class="fixed-grid has-8-cols">
            <div class="grid">
              {#each ranks as rank (rank)}
                <div class="cell">
                  <button class:selected={answerRank === rank} class="button"
                          on:click={() => answerRank = rank}>{rank}</button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="column is-2-desktop">
    <div class="block">
      {#if $orientation === 'white'}
        <button class="button is-small" on:click={() => {
          orientation.set('black');
        }}>View as black
        </button>
      {:else}
        <button class="button is-small" on:click={() => {
          orientation.set('white');
        }}>View as white
        </button>
      {/if}
    </div>
    {#if !gameRunning}
      <div class="block">
        <button class="button is-small" on:click={startGame}>Start Game</button>
      </div>
    {/if}
    <div class="block">
      <p>Correct: {correctCount}</p>
      <p>Incorrect: {incorrectCount}</p>
      <p>High Score: {highScore}</p>
    </div>
  </div>
</div>

<style>
  .selected {
    background: var(--bulma-success);
  }

  .selected:hover {
    background: var(--bulma-success-80)
  }

  .grid button {
    width: 95%;
  }
</style>
