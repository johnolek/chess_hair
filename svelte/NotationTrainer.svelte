<script>
  import { onMount } from 'svelte';
  import { Chessground } from "chessground";
  import { parsePgn, startingPosition } from 'chessops/pgn';
  import { Util } from 'src/util';
  import { getRandomGame } from "src/random_games";
  import { parseSan } from "chessops/san";
  import { makeFen } from "chessops/fen";
  import { makeSquare } from "chessops/util";
  import { pieceSet } from './stores';

  let correctCount = 0;
  let incorrectCount = 0;
  let correctAnswer;
  let answerAllowed;
  let answerValue = '';
  let resultText;
  let resultClass;

  let answerRank = '';
  let answerFile = '';

  let boardWidth = 600;
  let boardWrapper;
  let boardContainer;
  let chessground;
  let fen;



  $: {
    answerValue = `${answerFile}${answerRank}`;
  }

  $: {
    if (answerValue.length === 2) {
      handleAnswer();
    }
  }

  $: {
    if (chessground && fen) {
      chessground.set({
        fen: fen,
        highlight: {
          lastMove: false,
          check: false,
        }
      })
    }
  }

  function resize() {
    if (boardWrapper) {
      const width = boardWrapper.offsetWidth;
      const totalHeight = window.innerHeight;
      const newDimension = Math.min(0.7 * totalHeight, width);
      boardWidth = newDimension;
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
    }, 400);
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
      correctCount++;
    } else {
      resultText = `${answerValue} was incorrect. Correct answer was ${correctAnswer}.`
      resultClass = 'incorrect';
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

  onMount(() => {
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeydown);
    chessground = Chessground(boardContainer, {
      fen: '8/8/8/8/8/8/8/8',
      coordinates: false,
      animation: {
        enabled: true,
      },
      highlight: {
        lastMove: true,
      },
      draggable: false,
      selectable: false,
    });
    newPosition();
    resize();
  });
</script>

<link id="piece-sprite" href="/piece-css/{$pieceSet}.css" rel="stylesheet">
<div class="columns is-centered">
  <div class="column is-6-widescreen">
    <h1>Notation Trainer</h1>
    <div class="block">
      <p>Correct: {correctCount}</p>
      <p>Incorrect: {incorrectCount}</p>
    </div>
    <div class="board-wrapper block" bind:this={boardWrapper}>
      <div class="is2d" bind:this={boardContainer}
           style="position: relative;width: {boardWidth}px; height: {boardWidth}px;"></div>
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
