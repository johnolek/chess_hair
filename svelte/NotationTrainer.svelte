<script>
  import { onMount } from 'svelte';
  import { Chessground } from "chessground";
  import { parsePgn, startingPosition } from 'chessops/pgn';
  import { Util } from 'src/util';
  import { getRandomGame } from "src/random_games";
  import { parseSan } from "chessops/san";
  import { makeFen } from "chessops/fen";
  import { makeSquare } from "chessops/util";

  let correctCount = 0;
  let incorrectCount = 0;
  let correctAnswer;
  let answerAllowed;
  let answerInput;
  let answerValue = '';
  let resultText;
  let resultClass;

  let boardContainer;
  let chessground;
  let fen;

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
      answerInput.focus();
      answerValue = '';
      answerAllowed = true;
    }, 1000);
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
      resultText = `${answerInput.value} was incorrect. Correct answer was ${correctAnswer}.`
      resultClass = 'incorrect';
      incorrectCount++;
    }
    answerValue = '';
    newPosition();
  }

  onMount(() => {
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
  });
</script>

<h1>Notation Trainer</h1>
<link id="piece-sprite" href="/piece-css/merida.css" rel="stylesheet">
<div class="columns">
  <div class="column is-2-desktop">
    <div class="block">
      <p>Correct: {correctCount}</p>
      <p>Incorrect: {incorrectCount}</p>
    </div>
    <div class="board-wrapper block">
      <div class="is2d" bind:this={boardContainer} style="height: 500px; width: 500px;"></div>
    </div>
    <div class="block">
      <form on:submit|preventDefault={handleAnswer}>
        <label for="answer">Answer</label>
        <input id="answer" type="text" bind:this={answerInput} bind:value={answerValue}/>
      </form>
    </div>
    {#if resultText}
      <div class="block">
        <div class="{resultClass} is-size-3">
          {resultText}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .is2d {
    width: 100%;
  }

  .column {
    width: 600px;
  }

  .board-wrapper {
    width: 100%;
    position: relative;
  }
</style>
