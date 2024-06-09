<script>
  import { onMount } from 'svelte';
  import { Chessground } from "chessground";
  import { knightMovesData } from '../app/javascript/src/knight_moves_data';
  import Config from "../app/javascript/src/local_config";
  import { ConfigForm } from "../app/javascript/src/local_config";

  let chessground;
  let jsonData = knightMovesData;
  let positionData = null;
  let correctCount = 0;
  let incorrectCount = 0;
  let gameRunning = false;
  let timeRemaining = null;
  let animating = false;

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

  onMount(() => {
    initConfig();

    chessground = Chessground(document.getElementById('board'), {
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

    initKeyboardShortcuts();
    reset();
    newPosition();
  });

  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key >= '1' && key <= '6') {
        // Trigger click event on corresponding button
        document.getElementById(key).click();
      }
    });
    // Add click event listener to each button
    for (let i = 1; i <= 6; i++) {
      document.getElementById(String(i)).addEventListener('click', (event) => {
        processButton(event.target.id);
      });
    }
  }

  function startTimedGame() {
    reset();
    startTimedGameButtonDisabled = true;
    gameRunning = true;
    timeRemaining = 60;
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
    const button = document.getElementById(id);
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

<main>
    <div class="container pt-5">
        <div class="row justify-content-center">
            <div class="col-12 col-xl-8 order-xl-2">
                <div id="game">
                    <div id="board"></div>
                    <div id="button-container" class="mt-3">
                        <div class="row">
                            <div class="col"><button class="btn btn-primary" id="1">1</button></div>
                            <div class="col"><button class="btn btn-primary" id="2">2</button></div>
                            <div class="col"><button class="btn btn-primary" id="3">3</button></div>
                        </div>
                        <div class="row mt-3">
                            <div class="col"><button class="btn btn-primary" id="4">4</button></div>
                            <div class="col"><button class="btn btn-primary" id="5">5</button></div>
                            <div class="col"><button class="btn btn-primary" id="6">6</button></div>
                        </div>
                    </div>
                    <div id="results">
                        {#if resultText !== ''}
                            <div id="resultText" class={resultTextClass}>{resultText}</div>
                        {/if}
                        <div id="move-counter"></div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-xl-3 order-xl-1">
                <div id="score-container" class="floatingThing">
                    <dl class="row">
                        <dt class="col-sm-5">Correct:</dt>
                        <dd class="col-sm-7"><span id="correctCount">{correctCount}</span></dd>
                        <dt class="col-sm-5">Incorrect:</dt>
                        <dd class="col-sm-7"><span id="incorrectCount">{incorrectCount}</span></dd>
                    </dl>
                </div>
                <div id="game-controls" class="floatingThing">
                    <button id="startTimedGame" disabled={startTimedGameButtonDisabled} on:click={startTimedGame} class="btn btn-primary">Start Timed Game</button>
                    {#if timeRemaining > 0}
                        <div id="timer">{timeRemaining}</div>
                    {/if}
                    <dl class="row">
                        <dt class="col-sm-5">High Score:</dt>
                        <dd class="col-sm-7"><span id="highScoreCount">{highScore}</span></dd>
                    </dl>
                </div>
            </div>
        </div>
    </div>
</main>
