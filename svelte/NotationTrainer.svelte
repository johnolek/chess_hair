<script>
  import { onMount } from "svelte";
  import Chessboard from "./components/Chessboard.svelte";

  import { Util } from "src/util";
  import { getRandomGame } from "src/random_games";
  import { persisted } from "svelte-persisted-store";
  import ProgressTimer from "./components/ProgressTimer.svelte";
  import Counter from "./components/Counter.svelte";
  import DisappearingContent from "./components/DisappearingContent.svelte";
  import { Chess } from "chess.js";

  const orientation = persisted("notation.orientation", "white");
  const highScoreBlack = persisted("notation.highScoreBlack", 0);
  const highScoreWhite = persisted("notation.highScoreWhite", 0);

  let correctCount = 0;
  let incorrectCount = 0;
  let nextMove;
  let colorToMove;
  let otherColor = Util.otherColor($orientation);
  $: {
    otherColor = Util.otherColor($orientation);
  }

  let positionShownAt;

  class Answer {
    constructor(givenAnswer, correctAnswer, timeToAnswer, orientation) {
      this.givenAnswer = givenAnswer;
      this.correctAnswer = correctAnswer;
      this.timeToAnswer = timeToAnswer;
      this.orientation = orientation;
    }

    isCorrect() {
      return this.givenAnswer === this.correctAnswer;
    }
  }

  /** @type {Answer[]} */
  let answers = [];

  let chessgroundConfig = {
    fen: "8/8/8/8/8/8/8/8",
    coordinates: false,
    animation: {
      enabled: true,
    },
    highlight: {
      lastMove: true,
      check: true,
    },
    draggable: {
      enabled: true,
    },
    selectable: {
      enabled: true,
    },
    movable: {
      free: false,
      color: "both",
      dests: new Map(),
      events: {
        after: handleUserMove,
      },
    },
    orientation: $orientation,
  };
  let boardSize;
  let chessground;
  let fen;

  // Game stuff
  let gameRunning = false;
  let maxTime = 0;
  let correctBonus = 0;
  let incorrectPenalty = 10;

  function handleUserMove(moveEvent) {
    const move = moveEvent.detail.move;
    handleAnswer(move.san, nextMove);
  }

  function newPosition() {
    const previousMove = nextMove;

    const game = getRandomGame();
    const chess = new Chess();
    chess.loadPgn(game.pgn);
    const history = chess.history({ verbose: true });
    const moveCount = history.length;
    const random = Util.getRandomIntBetween(1, moveCount - 1);
    const candidateMove = history[random].san;

    if (
      candidateMove.includes("=") || // no promotions
      candidateMove === previousMove || // do not repeat moves
      whoseMoveIsIt(random) !== $orientation || // only show moves for current view
      ["O-O", "O-O-O"].includes(candidateMove) // no castles
    ) {
      return newPosition();
    }

    fen = history[random - 1].after;
    nextMove = candidateMove;
    colorToMove = whoseMoveIsIt(random);
    positionShownAt = new Date().getTime();
  }

  function whoseMoveIsIt(ply) {
    return ply % 2 === 0 ? "white" : "black";
  }

  function handleAnswer(userSan, answerSan) {
    const isCorrect = userSan === answerSan;
    correctBonus = correctBonus * 0.98;
    let timeToAnswer = new Date().getTime() - positionShownAt;
    answers = [
      ...answers,
      new Answer(userSan, answerSan, timeToAnswer, $orientation),
    ];
    if (isCorrect) {
      maxTime += correctBonus;
      correctCount++;
    } else {
      maxTime -= incorrectPenalty;
      incorrectCount++;
    }
    newPosition();
  }

  function startGame() {
    answers = [];
    gameRunning = true;
    maxTime = 30;
    correctCount = 0;
    incorrectCount = 0;
    correctBonus = 2.75;
    newPosition();
  }

  function endGame() {
    gameRunning = false;
    if ($orientation === "white") {
      if (correctCount > $highScoreWhite) {
        highScoreWhite.set(correctCount);
      }
    } else {
      if (correctCount > $highScoreBlack) {
        highScoreBlack.set(correctCount);
      }
    }
  }

  onMount(() => {
    newPosition();
  });
</script>

<div class="columns is-centered">
  <div class="column is-6-desktop">
    <div class="block">
      <Chessboard
        {chessgroundConfig}
        bind:fen
        bind:chessground
        orientation={$orientation}
        bind:size={boardSize}
        on:move={handleUserMove}
      >
        <DisappearingContent key={nextMove} slot="centered-content">
          <span class="tag is-size-3 is-{colorToMove}">
            {nextMove}
          </span>
        </DisappearingContent>
      </Chessboard>
    </div>
    <div
      class="block is-flex is-justify-content-center"
      style="width: {boardSize}px"
    >
      <span class="tag is-size-3 is-{colorToMove} mr-3">
        {nextMove}
      </span>
      {#if !gameRunning}
        <button class="button is-primary" on:click={startGame}
          >Start Game
        </button>
      {/if}
      {#if !gameRunning}
        <button
          class="button is-{otherColor} change-orientation-button ml-3"
          on:click={() => {
            orientation.set(otherColor);
            newPosition();
          }}
          >Play {otherColor}
        </button>
      {/if}
    </div>
    {#if gameRunning}
      <ProgressTimer max={maxTime} width={boardSize} on:complete={endGame}
      ></ProgressTimer>
    {/if}
  </div>
  <div class="column is-2-desktop">
    <div class="block">
      <Counter number={correctCount} title="Correct" />
      <Counter number={incorrectCount} title="Incorrect" />
      <Counter number={$highScoreWhite} title="High Score (white)" />
      <Counter number={$highScoreBlack} title="High Score (black)" />
    </div>
  </div>
</div>

<style>
</style>
