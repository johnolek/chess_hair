<script>
  import { onMount } from 'svelte';
  import { Chessground } from "chessground";
  import { parsePgn, startingPosition } from 'chessops/pgn';
  import { Util } from 'src/util';
  import { parseSan } from "chessops/san";
  import { makeFen } from "chessops/fen";
  import { makeSquare } from "chessops/util";

  let correctCount = 0;
  let incorrectCount = 0;
  let correctAnswer;
  let answerInput;
  let resultText;
  let resultClass;

  let boardContainer;
  let chessground;
  let fen;

  $: {
    if (chessground && fen) {
      chessground.set({fen: fen})
      const classMap = new Map();
      chessground.set({
        highlight: {
          custom: classMap
        }
      })
    }
  }

  function getRandomGame() {
    return {
      "url": "https://www.chess.com/game/daily/665366299",
      "move_by": 1718587110,
      "pgn": "[Event \"Let's Play!\"]\n[Site \"Chess.com\"]\n[Date \"2024.06.06\"]\n[Round \"2\"]\n[White \"ham_sammy\"]\n[Black \"FRANKCASTLE100\"]\n[Result \"*\"]\n[CurrentPosition \"8/8/2k5/3R4/3K4/p5P1/P1P2P2/8 b - - 2 42\"]\n[Timezone \"UTC\"]\n[ECO \"C40\"]\n[ECOUrl \"https://www.chess.com/openings/Kings-Pawn-Opening-Kings-Knight-McConnell-Defense\"]\n[UTCDate \"2024.06.06\"]\n[UTCTime \"03:18:46\"]\n[WhiteElo \"1279\"]\n[BlackElo \"914\"]\n[TimeControl \"1/86400\"]\n[StartTime \"03:18:46\"]\n[Link \"https://www.chess.com/game/daily/665366299\"]\n\n1. e4 {[%clk 23:59:26]} 1... e5 {[%clk 22:26:10]} 2. Nf3 {[%clk 23:50:49]} 2... Qf6 {[%clk 22:45:13]} 3. d4 {[%clk 23:48:57]} 3... d6 {[%clk 13:35:30]} 4. Bg5 {[%clk 23:38:47]} 4... Qg6 {[%clk 18:48:59]} 5. dxe5 {[%clk 23:56:45]} 5... Qxe4+ {[%clk 23:43:31]} 6. Be2 {[%clk 23:59:15]} 6... Qb4+ {[%clk 4:44:35]} 7. Bd2 {[%clk 23:39:32]} 7... Qxb2 {[%clk 15:57:22]} 8. Nc3 {[%clk 21:53:50]} 8... dxe5 {[%clk 10:51:35]} 9. Rb1 {[%clk 22:04:35]} 9... Qa3 {[%clk 23:24:37]} 10. Nb5 {[%clk 23:04:35]} 10... Qe7 {[%clk 23:31:06]} 11. Bb4 {[%clk 22:52:52]} 11... Qd7 {[%clk 20:16:29]} 12. Qxd7+ {[%clk 22:43:04]} 12... Bxd7 {[%clk 23:15:06]} 13. Nxc7+ {[%clk 22:31:51]} 13... Kd8 {[%clk 23:49:01]} 14. Nxa8 {[%clk 22:52:08]} 14... Bxb4+ {[%clk 23:46:45]} 15. Rxb4 {[%clk 23:48:39]} 15... Bc6 {[%clk 13:09:40]} 16. O-O {[%clk 23:16:55]} 16... f6 {[%clk 22:18:01]} 17. Rd1+ {[%clk 23:22:38]} 17... Kc8 {[%clk 21:40:01]} 18. Bc4 {[%clk 23:53:40]} 18... Ne7 {[%clk 22:36:01]} 19. Be6+ {[%clk 23:35:03]} 19... Nd7 {[%clk 23:58:09]} 20. Rc4 {[%clk 23:31:55]} 20... Kb8 {[%clk 4:01:51]} 21. Bxd7 {[%clk 23:57:03]} 21... Kxa8 {[%clk 23:22:28]} 22. Bxc6 {[%clk 23:38:47]} 22... bxc6 {[%clk 23:46:37]} 23. Nd2 {[%clk 23:25:39]} 23... Rd8 {[%clk 21:35:17]} 24. Kf1 {[%clk 23:52:25]} 24... h5 {[%clk 23:34:12]} 25. Ke2 {[%clk 23:53:17]} 25... g5 {[%clk 19:40:48]} 26. Ne4 {[%clk 23:57:39]} 26... Nd5 {[%clk 23:26:50]} 27. Rxc6 {[%clk 15:03:38]} 27... Nf4+ {[%clk 23:35:17]} 28. Ke1 {[%clk 22:56:04]} 28... Nxg2+ {[%clk 17:57:41]} 29. Ke2 {[%clk 20:56:28]} 29... Nf4+ {[%clk 5:22:31]} 30. Ke1 {[%clk 23:03:38]} 30... Rd4 {[%clk 22:42:20]} 31. Rxd4 {[%clk 22:11:35]} 31... exd4 {[%clk 23:23:54]} 32. Nc5 {[%clk 23:55:49]} 32... Kb8 {[%clk 22:26:56]} 33. Rxf6 {[%clk 23:56:47]} 33... Kc7 {[%clk 23:54:20]} 34. Ne6+ {[%clk 23:51:45]} 34... Nxe6 {[%clk 23:43:11]} 35. Rxe6 {[%clk 23:59:39]} 35... g4 {[%clk 21:04:05]} 36. Rh6 {[%clk 17:58:20]} 36... a5 {[%clk 16:47:06]} 37. Kd2 {[%clk 22:21:23]} 37... a4 {[%clk 22:01:28]} 38. Rxh5 {[%clk 22:42:21]} 38... g3 {[%clk 3:57:41]} 39. hxg3 {[%clk 22:58:01]} 39... a3 {[%clk 15:25:51]} 40. Kd3 {[%clk 23:42:39]} 40... Kd6 {[%clk 23:55:00]} 41. Kxd4 {[%clk 17:46:22]} 41... Kc6 {[%clk 15:06:36]} 42. Rd5 {[%clk 21:55:50]} *\n",
      "time_control": "1/86400",
      "last_activity": 1718559786,
      "rated": true,
      "turn": "black",
      "fen": "8/8/2k5/3R4/3K4/p5P1/P1P2P2/8 b - - 2 42",
      "start_time": 1717643926,
      "time_class": "daily",
      "rules": "chess",
      "white": "https://api.chess.com/pub/player/ham_sammy",
      "black": "https://api.chess.com/pub/player/frankcastle100"
    };
  }

  function newPosition() {
    answerInput.value = '';
    const game = getRandomGame();
    const pgnGame = parsePgn(game.pgn)[0];
    const totalPlies = [...pgnGame.moves.mainline()].length;

    const random = Util.getRandomIntBetween(1, totalPlies - 1);
    const positionResult = startingPosition(pgnGame.headers);
    const position = positionResult.unwrap();

    const allNodes = [...pgnGame.moves.mainlineNodes()];

    let i;
    let move;
    let nextNode;

    for (i = 0; i <= random; i++) {
      const node = allNodes[i];
      move = parseSan(position, node.data.san);
      position.play(move);
      nextNode = allNodes[i + 1];
    }
    fen = makeFen(position.toSetup());

    correctAnswer = nextNode.data.san;
    const nextMove = parseSan(position, nextNode.data.san);
    const from = makeSquare(nextMove.from);
    const to = makeSquare(nextMove.to);
    setTimeout(() => {
      chessground.move(from, to);
      answerInput.focus();
    }, 1000);
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
      <form on:submit|preventDefault={() => {
        if (answerInput.value.toLowerCase().trim() === correctAnswer.toLowerCase()) {
          resultText = 'Correct!'
          resultClass = 'correct';
          correctCount++;
        } else {
          resultText = `${answerInput.value} was incorrect. Correct answer was ${correctAnswer}.`
          resultClass = 'incorrect';
          incorrectCount++;
        }
        newPosition();
      }}>
        <label for="answer">Answer</label>
        <input id="answer" type="text" bind:this={answerInput}/>
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
