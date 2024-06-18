<script>
  import { onMount } from 'svelte';
  import ChessBoard from './components/Chessboard.svelte';

  import { parsePgn, startingPosition } from 'chessops/pgn';
  import { Util } from 'src/util';
  import { getRandomGame } from "src/random_games";
  import { parseSan } from "chessops/san";
  import { makeFen } from "chessops/fen";
  import { makeSquare } from "chessops/util";
  import { persisted } from "svelte-persisted-store";

  const orientation = persisted('notation.orientation', 'white');

  let correctCount = 0;
  let incorrectCount = 0;
  let correctAnswer;
  let answerAllowed;
  let answerValue = '';
  let resultText;
  let resultClass;

  let answerRank = '';
  let answerFile = '';

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

  let chessground;
  let fen;

  // Game stuff
  let gameRunning = false;
  let highScore = 0;
  let startingTime = 60;
  let remainingTime = 0;
  let correctBonus = 2;
  let incorrectPenalty = 10;
  let gameInterval;

  $: {
    if (gameRunning && remainingTime <= 0) {
      stopGame();
    }
  }

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
    }, 400)
  }

  function handleAnswer() {
    if (!answerAllowed) {
      return;
    }
    if (answerValue.length !== 2) {
      return;
    }
    if (answerValue.toLowerCase().trim() === correctAnswer.toLowerCase()) {
      resultText = `${answerValue} was correct!`;
      resultClass = 'correct';
      remainingTime += correctBonus;
      correctCount++;
    } else {
      resultText = `${answerValue} was incorrect. Correct answer was ${correctAnswer}.`
      resultClass = 'incorrect';
      remainingTime -= incorrectPenalty;
      incorrectCount++;
    }
    answerRank = '';
    answerFile = '';
    newPosition();
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5' ,'6', '7', '8'];

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
    remainingTime = startingTime;
    correctCount = 0;
    incorrectCount = 0;
    gameInterval = setInterval(() => {
      remainingTime -= 0.05;
      if (remainingTime <= 0) {
        clearInterval(gameInterval);
      }
    }, 50);
    newPosition();
  }

  function stopGame() {
    clearInterval(gameInterval);
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
  <div class="column is-6-desktop is-centered">
    <h1>Notation Trainer</h1>
    <div class="block">
      {#if $orientation === 'white'}
        <button class="button is-small" on:click={() => {
          orientation.set('black');
        }}>View as black</button>
      {:else}
        <button class="button is-small" on:click={() => {
          orientation.set('white');
        }}>View as white</button>
      {/if}
      {#if !gameRunning}
        <button class="button is-small" on:click={startGame}>Start Game</button>
      {/if}
    </div>
    <div class="block">
      {#if gameRunning}
        {remainingTime.toFixed(2)}
      {/if}
      <p>Correct: {correctCount}</p>
      <p>Incorrect: {incorrectCount}</p>
      <p>High Score: {highScore}</p>
    </div>

    <div class="block">
      <ChessBoard
        {chessgroundConfig}
        bind:fen={fen}
        bind:chessground={chessground}
        orientation={$orientation}
      />
    </div>
    <div class="block">
      <div class="container has-text-centered">
        <span class="is-size-1">
          {answerFile !== '' ? answerFile : '-'}{answerRank !== '' ? answerRank : '-'}
        </span>
        {#if resultText}
          <div class="block">
            <div class="{resultClass} is-size-3">
              {resultText}
            </div>
          </div>
        {/if}
      </div>
    </div>
    <div class="block">
      <div class="columns">
        <div class="column is-half">
          <div class="fixed-grid has-4-cols">
            <div class="grid">
              {#each files as file}
                <div class="cell">
                  <button class="button is-large" on:click={() => answerFile = file}>{file}</button>
                </div>
              {/each}
            </div>
          </div>
        </div>
        <div class="column is-half">
          <div class="fixed-grid has-4-cols">
            <div class="grid">
              {#each ranks as rank}
                <div class="cell">
                  <button class="button is-large" on:click={() => answerRank = rank}>{rank}</button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
