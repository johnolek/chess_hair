<script>
  import { onMount } from 'svelte';
  import { Chessground } from "chessground";
  import { knightMovesData } from 'src/knight_moves_data';
  import Config from "src/local_config";
  import { ConfigForm } from "src/local_config";

  let chessground;
  let jsonData = knightMovesData;
  let positionData = null;
  let correctCount = 0;
  let incorrectCount = 0;

  let gameRunning = false;
  let timeRemaining = null;
  let timeElapsed = null;
  let gameStartTime = null;

  let progressClass = 'is-success';
  let animating = false;
  let answerShown;

  let highScore = 0;
  let maxPathsToDisplayOption;
  let animationLengthOption;
  let knightSquare;
  let kingSquare;
  let config;
  let configForm;
  let startTimedGameButtonDisabled = false;
  let resultText = '';
  let resultTextClass = '';

  let boardWidth = 512;
  let boardHeight = 512;
  let padding = 80;

  let button1;
  let button2;
  let button3;
  let button4;
  let button5;
  let button6;

  let mainColumn;
  let boardContainer;
  let boardWrapper;

  $: {
    if (gameRunning) {
      const percentDone = timeElapsed / 60;
      if (percentDone < 0.7) {
        progressClass = 'is-success';
      } else if (percentDone < 0.9) {
        progressClass = 'is-warning';
      } else {
        progressClass = 'is-danger';
      }
    } else {
      progressClass = 'is-success';
    }
  }

  $: {
    const totalHeight = window.innerHeight;
    const remainingHeight = totalHeight - boardHeight;

    if (button1) {
      const maxHeight = button1.offsetWidth;
      const calculatedHeight = (remainingHeight / 2) - padding;
      const buttonHeight = Math.min(maxHeight, calculatedHeight);
      button1.style.height = `${buttonHeight}px`;
      button2.style.height = `${buttonHeight}px`;
      button3.style.height = `${buttonHeight}px`;
      button4.style.height = `${buttonHeight}px`;
      button5.style.height = `${buttonHeight}px`;
      button6.style.height = `${buttonHeight}px`;
    }
  }

  onMount(() => {
    initConfig();

    chessground = Chessground(boardContainer, {
      fen: '8/8/8/8/8/8/8/8',
      animation: {
        enabled: true,
        duration: animationLengthOption.getValue(),
      },
      highlight: {
        lastMove: false,
      },
      draggable: false,
      selectable: false,
    });

    resize();
    window.addEventListener('resize', resize);

    initKeyboardShortcuts();
    resize();
    newPosition();
  });

  function resize() {
    const width = boardWrapper.offsetWidth;
    const totalHeight = window.innerHeight;
    const minButtonHeight = 30;
    const maxHeight = totalHeight - (2 * minButtonHeight) - padding;
    const boardDimensions = Math.min(width, maxHeight);
    boardHeight = boardDimensions;
    boardWidth = boardDimensions;
  }

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
    window.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key >= '1' && key <= '6') {
        // Trigger click event on corresponding button
        const button = getButton(parseInt(key));
        button.click();
      }
    });
  }

  function startTimedGame() {
    reset();
    startTimedGameButtonDisabled = true;
    gameRunning = true;
    timeRemaining = 60;
    timeElapsed = 0;
    gameStartTime = performance.now() / 1000;
    newPosition();
    setTimeout(() => {
      endGame();
    }, 60000); // 1 minute
    const timerInterval = setInterval(() => {
      if (timeRemaining === 0) {
        clearInterval(timerInterval);
      }
      timeRemaining -= 1;
    }, 1000);
    const progressInterval = setInterval(() => {
      if (timeRemaining === 0) {
        clearInterval(progressInterval);
      }
      timeElapsed = (performance.now() / 1000) - gameStartTime;
    }, 10);
  }

  function endGame() {
    if (correctCount > highScore && gameRunning) {
      highScore = correctCount;
    }
    if (incorrectCount > 0) {
      resultTextClass = 'incorrect';
      resultText = `Incorrect, game over! The correct answer was ${getMinimumMovesForCurrentPosition()}. Your score was ${correctCount}.`
    } else {
      resultTextClass = 'correct';
      resultText = `Time's up! Your score was ${correctCount}.`;
    }

    gameRunning = false;
    timeRemaining = null;
    timeElapsed = null;
    correctCount = 0;
    incorrectCount = 0;
    startTimedGameButtonDisabled = false;
  }

  function reset() {
    correctCount = 0;
    incorrectCount = 0;
    gameRunning = false;
    startTimedGameButtonDisabled = false;
    resultText = '';
    resultTextClass = '';
  }

  function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
  }

  function getRandomElement(array) {
    const index = getRandomIndex(array.length);
    return array[index];
  }

  function sortRandomly(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  function getMinimumMovesForCurrentPosition() {
    return positionData.min_length;
  }

  function getPathsForCurrentPosition() {
    return positionData.paths;
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
      animateElement(button, 'correctAnswer');
      resultTextClass = 'correct';
      resultText = `${number} was correct!`;
      newPosition();
    } else {
      incorrectCount += 1;
      animateElement(button, 'incorrectAnswer');
      if (gameRunning) {
        endGame();
      } else {
        resultText = `${number} was incorrect. The correct answer was ${minimum}.`;
        resultTextClass = 'incorrect';
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
    const shapes = [];
    const brushes = chessground.state.drawable.brushes;
    const brushKeys = Object.keys(brushes);
    let maxPathsToShow = maxPathsToDisplayOption.getValue();
    if (maxPathsToShow < 1) {
      maxPathsToShow = 1;
    }

    validPaths.forEach((path, index) => {
      if (index + 1 > maxPathsToShow) {
        return;
      }
      const movePairs = getMovePairsFromPath(path);
      const brushKey = brushKeys[index % brushKeys.length];
      movePairs.forEach((pair) => {
        const shape = {orig: pair[0], dest: pair[1], brush: brushKey, modifiers: {hilite: false, lineWidth: 5}}
        shapes.push(shape);
      });
    });

    const mainPath = validPaths[0];
    const mainMovePairs = getMovePairsFromPath(mainPath);
    mainMovePairs.forEach((pair) => {
      const shape = {orig: pair[0], dest: pair[1], brush: 'green', modifiers: {ineWidth: 10}}
      shapes.push(shape);
    });

    chessground.set({
      drawable: {
        shapes: shapes
      }
    });
  }

  function getMovePairsFromPath(path) {
    const pairs = [];
    for (let i = 0; i < path.length - 1; i++) {
      pairs.push([path[i], path[i + 1]]);
    }
    return pairs;
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

    setTimeout(() => makeSequentialMoves(movePairs, callback), animationLengthOption.getValue());
  }

  function clearDrawings() {
    answerShown = false;
    chessground.set({
      drawable: {
        shapes: []
      }
    });
  }

  function newPosition() {
    clearDrawings();
    const keys = Object.keys(jsonData);
    const index = getRandomIndex(keys.length);
    const key = keys[index];
    const previousKnightSquare = knightSquare;
    const previousKingSquare = kingSquare;
    const squares = key.split('.');
    knightSquare = squares[0];
    kingSquare = squares[1];
    positionData = jsonData[key];
    const king = {
      role: 'king',
      color: 'black',
    }
    const knight = {
      role: 'knight',
      color: 'white',
    }
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
    element.addEventListener('animationend', function () {
      // Once the animation ends, remove the class
      element.classList.remove(animationClass);
    }, {once: true}); // The listener is removed after it's invoked once
  }

  function initConfig() {
    config = new Config('knight_moves_game');
    animationLengthOption = config.getConfigOption('Animation length (ms)', 300);

    maxPathsToDisplayOption = config.getConfigOption('Max paths to show', 6);

    configForm = new ConfigForm(config);
    configForm.addLinkToDOM('config');
  }
</script>

<link id="piece-sprite" href="/piece-css/merida.css" rel="stylesheet">

<div class="columns">
  <div class="column column2 is-6-desktop" bind:this={mainColumn}>
    <div class="board-wrapper mb-3" bind:this={boardWrapper}>
      <div class="board-container is2d" bind:this={boardContainer}
           style="width: {boardWidth}px; height: {boardHeight}px; position: relative;">
      </div>
    </div>

    {#if gameRunning}
      <progress class="progress {progressClass}" value="{timeElapsed}" max="60" style="width: {boardWidth}px;"></progress>
    {/if}

    <div class="fixed-grid has-3-cols" style="width: {boardWidth}px">
      <div class="grid">
        <div class="cell">
          <button class="button is-primary" id="1" on:click={() => processButton('1')} bind:this={button1}>1</button>
        </div>
        <div class="cell">
          <button class="button is-primary" id="2" on:click={() => processButton('2')} bind:this={button2}>2</button>
        </div>
        <div class="cell">
          <button class="button is-primary" id="3" on:click={() => processButton('3')} bind:this={button3}>3</button>
        </div>
        <div class="cell">
          <button class="button is-primary" id="4" on:click={() => processButton('4')} bind:this={button4}>4</button>
        </div>
        <div class="cell">
          <button class="button is-primary" id="5" on:click={() => processButton('5')} bind:this={button5}>5</button>
        </div>
        <div class="cell">
          <button class="button is-primary" id="6" on:click={() => processButton('6')} bind:this={button6}>6</button>
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
        <button id="startTimedGame" disabled={startTimedGameButtonDisabled} on:click={startTimedGame}
                class="button is-primary">Start Timed Game
        </button>
        {#if timeRemaining > 0}
          <div id="timer">{timeRemaining}</div>
        {/if}
      </div>
    </div>
    <div class="box">
      <div class="container has-text-centered">
        {#if !answerShown}
          <div class="block">
            <button class="button is-info" disabled={answerShown || gameRunning} on:click|preventDefault={() => {
          if (positionData) {
            answerShown = true;
            const correctPaths = positionData.paths;
            const randomlySorted = sortRandomly(correctPaths);
            drawCorrectArrows(randomlySorted);
          }
        }}>Show answer
            </button>
          </div>
        {:else}
          <div class="block">
            <button class="button is-link" on:click={() => {
              clearDrawings();
            }}>
              Clear
            </button>
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

  .board-wrapper {
    width: 100%;
  }
  .correct {
    color: green;
  }

  .incorrect {
    color: red;
  }

  @keyframes incorrectAnswer {
    25% { background-color: red; transform: translateX(-10px); }
    50% { background-color: red; transform: translateX(10px); }
    75% { background-color: red; transform: translateX(-10px); }
    100% { transform: translateX(0px); }
  }

  .incorrectAnswer {
    animation: incorrectAnswer 1s linear;
  }

  @keyframes correctAnswer {
    50% { background-color: green; transform: scale(1.01); }
    100% { transform: scale(1); }
  }

  .correctAnswer {
    animation: correctAnswer 0.75s linear;
  }
</style>





