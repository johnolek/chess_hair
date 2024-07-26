<script>
  import { onMount, createEventDispatcher } from "svelte";

  let bestMove = "";
  let topMoves = [];
  let analyzing = false;

  export let fen;
  export let depth = 20;

  $: if (fen) {
    // Clear when the FEN changes
    clearData();
  }

  const stockfish = new Worker(
    "/javascript/stockfish/src/stockfish-nnue-16.js", // served with rails public assets server thing
  );

  const dispatch = createEventDispatcher();

  function parseStockfishInfo(infoLine) {
    const regex =
      /info depth (\d+)(?: seldepth (\d+))?(?: multipv (\d+))? score cp (-?\d+)(?: nodes (\d+))?(?: nps (\d+))?(?: hashfull (\d+))?(?: tbhits (\d+))?(?: time (\d+))? pv (.+)/;
    const match = infoLine.match(regex);

    if (!match) {
      return null;
    }

    const [
      ,
      depth,
      selDepth = null,
      multiPV = null,
      score,
      nodes = null,
      nps = null,
      hashfull = null,
      tbHits = null,
      time = null,
      pv,
    ] = match;

    return {
      depth: parseInt(depth, 10), // The search depth reached by Stockfish
      selectiveDepth: selDepth ? parseInt(selDepth, 10) : null, // The selective search depth
      multiPV: multiPV ? parseInt(multiPV, 10) : null, // The number of principal variations (PV) considered
      score: parseFloat(score) / 100, // The evaluation score in centipawns
      nodes: nodes ? parseInt(nodes, 10) : null, // The number of nodes searched
      nps: nps ? parseInt(nps, 10) : null, // Nodes per second
      hashfull: hashfull ? parseInt(hashfull, 10) : null, // The hash table usage percentage
      tablebaseHits: tbHits ? parseInt(tbHits, 10) : null, // The number of tablebase hits
      time: time ? parseInt(time, 10) : null, // The time taken for the search in milliseconds
      principalVariation: pv.split(" "), // The principal variation moves
    };
  }

  stockfish.onmessage = (event) => {
    const message = event.data;
    if (message.startsWith("bestmove")) {
      bestMove = message.split(" ")[1];
      dispatchBestMove();
      stopAnalysis();
    } else if (message.startsWith("info depth") && message.includes("pv")) {
      const info = parseStockfishInfo(message);
      if (info) {
        const moves = info.principalVariation;
        let firstMove = moves[0];
        let moveIndex = topMoves.findIndex(
          (move) => move.principalVariation[0] === firstMove,
        );

        if (moveIndex === -1) {
          topMoves.push(info);
        }

        topMoves[moveIndex] = info;

        // Sort topMoves by eval score in descending order
        topMoves = topMoves.sort((a, b) => b.score - a.score);

        // Keep only the top 5 unique moves, including the absolute top move
        if (topMoves.length > 5) {
          topMoves = topMoves.slice(0, 5);
        }

        dispatchTopMoves();
      }
    }
  };

  function uciMessage(message) {
    stockfish.postMessage(message);
  }

  function dispatchBestMove() {
    dispatch("bestmove", { bestMove });
  }

  function dispatchTopMoves() {
    dispatch("topmoves", { topMoves });
  }

  function analyzePosition() {
    if (fen) {
      clearData();
      analyzing = true;
      uciMessage(`position fen ${fen}`);
      uciMessage("setoption name MultiPV value 5");
      uciMessage(`go depth ${depth}`);
    }
  }

  function stopAnalysis() {
    analyzing = false;
    uciMessage("stop");
  }

  function clearData() {
    bestMove = "";
    topMoves = [];
    dispatchBestMove();
    dispatchTopMoves();
  }

  onMount(() => {
    uciMessage("uci");
    uciMessage("isready");
    uciMessage("setoption name Use NNUE value true");
  });
</script>

<div>
  <button
    class="button is-primary"
    on:click={analyzePosition}
    disabled={analyzing}
    class:is-loading={analyzing}
    >Analyze Position
  </button>
  <button class="button is-danger" on:click={stopAnalysis} disabled={!analyzing}
    >Stop Analysis
  </button>
  {#if topMoves.length > 0}
    <table class="table is-striped is-fullwidth">
      <thead>
        <tr>
          <th>Move</th>
          <th>Evaluation</th>
          <th>Depth</th>
        </tr>
      </thead>
      <tbody>
        {#each topMoves as move}
          <tr>
            <td>{move.principalVariation[0]}</td>
            <td>{move.score > 0 ? "+" : ""}{move.score}</td>
            <td>{move.depth}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
