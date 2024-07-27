<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Util } from "src/util";
  import { Chess } from "chess.js";

  let bestMove = "";
  let topMoves = [];
  export let analyzing = false;

  export let fen;
  let analysisFen;
  export let depth = 20;

  $: if (fen && analysisFen && fen !== analysisFen) {
    stopAnalysis();
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
    if (!Util.isProduction()) {
      // console.log(message);
    }
    if (message.startsWith("bestmove")) {
      analyzing = false;
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
        } else {
          topMoves[moveIndex] = info;
        }

        // Filter out moves from earlier depths
        topMoves = topMoves.filter((move) => move.depth >= info.depth - 2); // Purge earlier depths

        // Sort topMoves by eval score in descending order
        topMoves = topMoves.sort((a, b) => b.score - a.score);

        // Keep only the top 5 unique moves, including the absolute top move
        if (topMoves.length > 5) {
          topMoves = topMoves.slice(0, 5);
        }

        topMoves = topMoves.map((moveData) => {
          return {
            ...moveData,
            fullMove: getFullMove(moveData.principalVariation[0]),
            fen: analysisFen,
          };
        });

        topMoves = topMoves.filter((move) => move.fullMove !== null);

        dispatchTopMoves();
      }
    }
  };

  function getFullMove(uciMove) {
    if (!analysisFen) {
      return null;
    }
    const chessInstance = new Chess();
    chessInstance.load(analysisFen);
    try {
      return chessInstance.move(uciMove);
    } catch (error) {
      return null;
    }
  }

  export function uciMessage(message) {
    stockfish.postMessage(message);
  }

  function dispatchBestMove() {
    if (bestMove !== "") {
      dispatch("bestmove", { bestMove });
    }
  }

  function dispatchTopMoves() {
    if (topMoves.length > 0) {
      dispatch("topmoves", { topMoves });
    }
  }

  export function analyzePosition() {
    if (analyzing) {
      stopAnalysis();
      setTimeout(analyzePosition, 500);
      return;
    }
    if (fen) {
      analyzing = true;
      clearData();
      analysisFen = fen;
      uciMessage(`position fen ${fen}`);
      uciMessage("setoption name MultiPV value 5");
      uciMessage(`go depth ${depth}`);
    }
  }

  export function stopAnalysis() {
    uciMessage("stop");
    uciMessage("uci");
    analyzing = false;
    topMoves = [];
    dispatchTopMoves();
  }

  function clearData() {
    bestMove = "";
    topMoves = [];
  }

  onMount(() => {
    uciMessage("setoption name Use NNUE value true");
  });
</script>
