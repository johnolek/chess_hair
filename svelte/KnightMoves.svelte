<script>
  import { onMount } from "svelte";

  import Chessboard from "./components/Chessboard.svelte";
  import ProgressTimer from "./components/ProgressTimer.svelte";
  import { Chess } from "chess.js";

  import { knightMovesData } from "src/knight_moves_data";
  import Config from "src/local_config";
  import { ConfigForm } from "src/local_config";
  import { Util } from "src/util";

  let chessground;
  let chessboard;
  let fen;
  let jsonData = knightMovesData;
  let positionData = null;
  let correctCount = 0;
  let incorrectCount = 0;

  let gameRunning = false;
  let timeRemaining = null;

  let animating = false;
  let answerShown;
  let groupedPaths = [];
  let groupIndex = 0;

  let disableNext = false;
  let disablePrev = true;

  $: {
    disableNext = groupIndex >= groupedPaths.length - 1;
    disablePrev = groupIndex <= 0;
  }

  $: {
    if (answerShown && groupedPaths.length > 0 && groupIndex >= 0) {
      drawCorrectArrows(groupedPaths[groupIndex]);
    }
  }

  let highScore = 0;
  let maxPathsToDisplayOption;
  let animationLengthOption;
  let knightSquare;
  let kingSquare;
  let config;
  let configForm;

  let boardWidth;

  let button1;
  let button2;
  let button3;
  let button4;
  let button5;
  let button6;

  const customBrushes = {
    brand1: {
      key: "brand1",
      color: Util.getRootCssVarValue("--brand-color-1"),
      opacity: 1,
      lineWidth: 15,
    },
    brand2: {
      key: "brand2",
      color: Util.getRootCssVarValue("--brand-color-2"),
      opacity: 1,
      lineWidth: 15,
    },
    brand3: {
      key: "brand3",
      color: Util.getRootCssVarValue("--brand-color-3"),
      opacity: 1,
      lineWidth: 15,
    },
    brand4: {
      key: "brand4",
      color: Util.getRootCssVarValue("--brand-color-4"),
      opacity: 1,
      lineWidth: 15,
    },
    brand5: {
      key: "brand5",
      color: Util.getRootCssVarValue("--brand-color-5"),
      opacity: 1,
      lineWidth: 15,
    },
    brand6: {
      key: "brand6",
      color: Util.getRootCssVarValue("--brand-color-6"),
      opacity: 1,
      lineWidth: 15,
    },
    brand7: {
      key: "brand7",
      color: Util.getRootCssVarValue("--brand-color-7"),
      opacity: 1,
      lineWidth: 15,
    },
    brand8: {
      key: "brand8",
      color: Util.getRootCssVarValue("--brand-color-8"),
      opacity: 1,
      lineWidth: 15,
    },
    brand9: {
      key: "brand9",
      color: Util.getRootCssVarValue("--brand-color-9"),
      opacity: 1,
      lineWidth: 15,
    },
  };

  initConfig();

  let chessgroundConfig = {
    fen: "8/8/8/8/8/8/8/8",
    animation: {
      enabled: true,
      duration: animationLengthOption.getValue(),
    },
    highlight: {
      lastMove: false,
    },
    draggable: false,
    selectable: false,
    drawable: {
      brushes: customBrushes,
    },
  };

  onMount(() => {
    initKeyboardShortcuts();
    newPosition();
  });

  function getButton(id) {
    switch (id) {
      case 1:
        return button1;
      case 2:
        return button2;
      case 3:
        return button3;
      case 4:
        return button4;
      case 5:
        return button5;
      case 6:
        return button6;
    }
  }

  function initKeyboardShortcuts() {
    window.addEventListener("keydown", (event) => {
      const key = event.key;
      if (key >= "1" && key <= "6") {
        // Trigger click event on corresponding button
        const button = getButton(parseInt(key));
        button.click();
      }
    });
  }

  function startTimedGame() {
    reset();
    gameRunning = true;
    newPosition();
  }

  function endGame() {
    if (correctCount > highScore && gameRunning) {
      highScore = correctCount;
    }

    gameRunning = false;
    timeRemaining = null;
    correctCount = 0;
    incorrectCount = 0;
  }

  function reset() {
    correctCount = 0;
    incorrectCount = 0;
    gameRunning = false;
  }

  function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
  }

  function sortRandomly(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  function getMinimumMovesForCurrentPosition() {
    return positionData.min_length;
  }

  function processButton(id) {
    if (animating) {
      return;
    }
    const number = parseInt(id);
    const minimum = getMinimumMovesForCurrentPosition();
    const button = getButton(number);
    if (number === minimum) {
      correctCount += 1;
      animateElement(button, "correctAnswer");
      newPosition();
    } else {
      incorrectCount += 1;
      animateElement(button, "incorrectAnswer");
      if (gameRunning) {
        endGame();
      } else {
      }
      const correctPaths = positionData.paths;
      const randomlySorted = sortRandomly(correctPaths);
      const pathToAnimate = randomlySorted[0];
      const movePairs = getMovePairsFromPath(pathToAnimate);
      drawCorrectArrows(randomlySorted);
      makeSequentialMoves(movePairs, () => {
        newPosition();
      });
    }
  }

  function drawCorrectArrows(validPaths) {
    clearDrawings();
    const shapes = [];
    const alreadyDrawn = new Set();
    const brushKeys = Object.keys(customBrushes);
    let maxPathsToShow = maxPathsToDisplayOption.getValue();
    if (maxPathsToShow < 1) {
      maxPathsToShow = 1;
    }
    maxPathsToShow = 50;

    validPaths.forEach((path, index) => {
      if (index + 1 > maxPathsToShow) {
        return;
      }
      const movePairs = getMovePairsFromPath(path);
      const brushKey = brushKeys[index % brushKeys.length];
      movePairs.forEach((pair) => {
        if (alreadyDrawn.has(pair)) {
          return;
        }
        const shape = {
          orig: pair[0],
          dest: pair[1],
          brush: brushKey,
          modifiers: { lineWidth: 10 },
        };
        shapes.push(shape);
        alreadyDrawn.add(pair);
      });
    });

    const mainPath = validPaths[0];
    const mainMovePairs = getMovePairsFromPath(mainPath);
    mainMovePairs.forEach((pair) => {
      const shape = {
        orig: pair[0],
        dest: pair[1],
        brush: "green",
        modifiers: { ineWidth: 10 },
      };
      shapes.push(shape);
    });

    chessground.set({
      drawable: {
        shapes: shapes,
      },
    });
  }

  function getMovePairsFromPath(path) {
    const pairs = [];
    for (let i = 0; i < path.length - 1; i++) {
      pairs.push([path[i], path[i + 1]]);
    }
    return pairs;
  }

  function getGroupedPaths(paths) {
    let groups = [];

    for (let path of paths) {
      let addedToGroup = false;

      for (let group of groups) {
        let overlap = group.some((groupPath) => {
          for (let i = 0; i < groupPath.length - 1; i++) {
            for (let j = 0; j < path.length - 1; j++) {
              if (
                groupPath[i] === path[j] &&
                groupPath[i + 1] === path[j + 1]
              ) {
                return true;
              }
            }
          }
          return false;
        });

        if (!overlap) {
          group.push(path);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([path]);
      }
    }

    return groups;
  }

  function incrementGroupIndex() {
    if (groupIndex < groupedPaths.length - 1) {
      groupIndex++;
    }
  }

  function decrementGroupIndex() {
    if (groupIndex > 0) {
      groupIndex--;
    }
  }

  function makeSequentialMoves(movePairs = [], callback = null) {
    animating = true;
    if (movePairs.length < 1) {
      animating = false;
      if (callback) {
        callback();
      }
      return;
    }

    // shift mutates the array
    const move = movePairs.shift();

    chessground.move(move[0], move[1]);

    setTimeout(
      () => makeSequentialMoves(movePairs, callback),
      animationLengthOption.getValue(),
    );
  }

  function clearDrawings() {
    chessground.set({
      drawable: {
        shapes: [],
      },
    });
  }

  function newPosition() {
    chessboard.clear();
    clearDrawings();
    answerShown = false;
    const keys = Object.keys(jsonData);
    const index = getRandomIndex(keys.length);
    const key = keys[index];
    const previousKnightSquare = knightSquare;
    const previousKingSquare = kingSquare;
    const squares = key.split(".");
    knightSquare = squares[0];
    kingSquare = squares[1];
    positionData = jsonData[key];
    const king = {
      role: "king",
      color: "black",
    };
    const knight = {
      role: "knight",
      color: "white",
    };
    const piecesDiff = new Map();
    if (previousKnightSquare && previousKingSquare) {
      piecesDiff.set(previousKnightSquare, undefined);
      piecesDiff.set(previousKingSquare, undefined);
    }
    piecesDiff.set(kingSquare, king);
    piecesDiff.set(knightSquare, knight);
    chessground.setPieces(piecesDiff);
    chessground.setPieces(new Map());
  }

  function animateElement(element, animationClass) {
    element.classList.add(animationClass);

    // Listen for the animationend event
    element.addEventListener(
      "animationend",
      function () {
        // Once the animation ends, remove the class
        element.classList.remove(animationClass);
      },
      { once: true },
    ); // The listener is removed after it's invoked once
  }

  function initConfig() {
    config = new Config("knight_moves_game");
    animationLengthOption = config.getConfigOption(
      "Animation length (ms)",
      300,
    );

    maxPathsToDisplayOption = config.getConfigOption("Max paths to show", 6);

    configForm = new ConfigForm(config);
    configForm.addLinkToDOM("config");
  }
</script>

<link id="piece-sprite" href="/piece-css/merida.css" rel="stylesheet" />

<div class="columns">
  <div class="column column2 is-6-desktop">
    <div class="block">
      <Chessboard
        {chessgroundConfig}
        bind:fen
        bind:chessground
        bind:this={chessboard}
        bind:size={boardWidth}
      />
    </div>

    {#if gameRunning}
      <ProgressTimer max="30" width={boardWidth} on:complete={endGame} />
    {/if}

    <div class="fixed-grid has-3-cols" style="width: {boardWidth}px">
      <div class="grid">
        <div class="cell">
          <button
            class="button is-primary"
            id="1"
            on:click={() => processButton("1")}
            bind:this={button1}>1</button
          >
        </div>
        <div class="cell">
          <button
            class="button is-primary"
            id="2"
            on:click={() => processButton("2")}
            bind:this={button2}>2</button
          >
        </div>
        <div class="cell">
          <button
            class="button is-primary"
            id="3"
            on:click={() => processButton("3")}
            bind:this={button3}>3</button
          >
        </div>
        <div class="cell">
          <button
            class="button is-primary"
            id="4"
            on:click={() => processButton("4")}
            bind:this={button4}>4</button
          >
        </div>
        <div class="cell">
          <button
            class="button is-primary"
            id="5"
            on:click={() => processButton("5")}
            bind:this={button5}>5</button
          >
        </div>
        <div class="cell">
          <button
            class="button is-primary"
            id="6"
            on:click={() => processButton("6")}
            bind:this={button6}>6</button
          >
        </div>
      </div>
    </div>
  </div>

  <div class="column column1 is-3-desktop">
    <div class="box score-container">
      <div class="container has-text-centered">
        <h2 class="is-size-5">Correct</h2>
        <div class="score is-size-2">{correctCount}</div>
        <h2 class="is-size-5">Incorrect</h2>
        <div class="score is-size-2">{incorrectCount}</div>
      </div>
    </div>
    <div class="box">
      <div class="container has-text-centered">
        <h2 class="is-size-5">High Score</h2>
        <div class="score is-size-2">{highScore}</div>
        {#if !gameRunning}
          <button
            id="startTimedGame"
            on:click={startTimedGame}
            class="button is-primary"
            >Start Timed Game
          </button>
        {/if}
        {#if timeRemaining > 0}
          <div id="timer">{timeRemaining}</div>
        {/if}
      </div>
    </div>
    <div class="box">
      <div class="container has-text-centered">
        {#if !answerShown}
          <div class="block">
            <button
              class="button is-info"
              disabled={answerShown || gameRunning}
              on:click|preventDefault={() => {
                if (positionData) {
                  answerShown = true;
                  const correctPaths = positionData.paths;
                  const randomlySorted = sortRandomly(correctPaths);
                  groupedPaths = sortRandomly(getGroupedPaths(randomlySorted));
                  groupIndex = 0;
                }
              }}
              >Show answer
            </button>
          </div>
        {:else}
          <div class="block">
            <button
              class="button is-link"
              on:click={() => {
                clearDrawings();
                answerShown = false;
              }}
            >
              Clear
            </button>
            {#if groupedPaths.length > 1}
              <div class="buttons has-addons">
                <button
                  class="button"
                  on:click={decrementGroupIndex}
                  disabled={disablePrev}>&laquo;</button
                >
                <button
                  class="button"
                  on:click={incrementGroupIndex}
                  disabled={disableNext}>&raquo;</button
                >
              </div>
            {/if}
          </div>
          <div class="block has-text-left">
            <div>
              Minimum # of moves: {getMinimumMovesForCurrentPosition()}
            </div>
            <div>
              Total unique paths: {positionData.paths.length}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .cell button {
    width: 100%;
    display: inline-block;
  }

  @keyframes incorrectAnswer {
    25% {
      background-color: red;
      transform: translateX(-10px);
    }
    50% {
      background-color: red;
      transform: translateX(10px);
    }
    75% {
      background-color: red;
      transform: translateX(-10px);
    }
    100% {
      transform: translateX(0px);
    }
  }

  .incorrectAnswer {
    animation: incorrectAnswer 1s linear;
  }

  @keyframes correctAnswer {
    50% {
      background-color: green;
      transform: scale(1.01);
    }
    100% {
      transform: scale(1);
    }
  }

  .correctAnswer {
    animation: correctAnswer 0.75s linear;
  }
</style>
