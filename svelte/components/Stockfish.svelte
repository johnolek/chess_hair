<script>
  import { onMount, createEventDispatcher, onDestroy } from "svelte";
  import { Util } from "src/util";
  import { Chess } from "chess.js";

  let bestMove = "";
  let topMoves = {};
  export let analyzing = false;

  export let fen;
  let analysisFen;
  export let depth = 20;
  export let numCores = 1;
  export let lines = 5;
  export let ready = false;

  export let readyok = false;
  let analysisFileLoaded = false;
  let nnueInitialized = false;

  $: ready = analysisFileLoaded;

  $: if (fen && analysisFen && fen !== analysisFen) {
    stopAnalysis();
  }

  $: {
    if (readyok && !nnueInitialized) {
      uciMessage("setoption name Use NNUE value true");
      nnueInitialized = true;
    }
  }

  let stockfish;

  const dispatch = createEventDispatcher();

  function parseStockfishInfo(infoLine) {
    const parts = infoLine.split(" ");

    const depth = parseInt(parts[2], 10);
    const selDepth = parts.includes("seldepth") ? parseInt(parts[4], 10) : null;
    const multiPV = parts.includes("multipv") ? parseInt(parts[6], 10) : null;

    let scoreType, scoreValue;
    if (parts.includes("score")) {
      const scoreIndex = parts.indexOf("score");
      scoreType = parts[scoreIndex + 1];
      scoreValue = parseInt(parts[scoreIndex + 2], 10);
    }

    const nodes = parts.includes("nodes")
      ? parseInt(parts[parts.indexOf("nodes") + 1], 10)
      : null;
    const nps = parts.includes("nps")
      ? parseInt(parts[parts.indexOf("nps") + 1], 10)
      : null;
    const hashfull = parts.includes("hashfull")
      ? parseInt(parts[parts.indexOf("hashfull") + 1], 10)
      : null;
    const tbHits = parts.includes("tbhits")
      ? parseInt(parts[parts.indexOf("tbhits") + 1], 10)
      : null;
    const time = parts.includes("time")
      ? parseInt(parts[parts.indexOf("time") + 1], 10)
      : null;
    const pv = parts.slice(parts.indexOf("pv") + 1).join(" ");

    const score = scoreType === "cp" ? scoreValue / 100 : scoreValue;
    const scoreDisplay =
      scoreType === "cp"
        ? scoreValue > 0
          ? `+${scoreValue / 100}`
          : (scoreValue / 100).toString()
        : `#${scoreValue}`;
    return {
      depth,
      selectiveDepth: selDepth,
      multiPV,
      scoreType,
      score,
      scoreDisplay,
      nodes,
      nps,
      hashfull,
      tablebaseHits: tbHits,
      time,
      principalVariation: pv.split(" "),
    };
  }

  function checkForReady(event) {
    const message = event.data;
    if (message === "readyok") {
      readyok = true;
    }
  }

  function checkForEvalFileLoaded(event) {
    const message = event.data;
    if (message.startsWith("Load eval file success: 1")) {
      analysisFileLoaded = true;
      stockfish.removeEventListener("message", checkForEvalFileLoaded);
    }
  }

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

  /**
   * Send a message to the Stockfish worker
   *
   * @param message
   */
  export function uciMessage(message) {
    stockfish.postMessage(message);
  }

  function dispatchBestMove() {
    if (bestMove !== "") {
      dispatch("bestmove", { bestMove });
    }
  }

  function dispatchTopMoves() {
    const topMovesArray = Object.values(topMoves)
      .slice(0, lines)
      .map((moveData) => {
        return {
          ...moveData,
          fullMove: getFullMove(moveData.principalVariation[0]),
          fen: analysisFen,
        };
      })
      .filter((moveData) => moveData.fullMove);

    if (topMovesArray.length > 0) {
      topMoves = Object.fromEntries(
        topMovesArray.map((move, index) => [index + 1, move]),
      );
      dispatch("topmoves", { topMoves: Object.values(topMoves) });
    }
  }

  export function analyzePosition() {
    if (analyzing || !readyok) {
      stopAnalysis();
      setTimeout(analyzePosition, 200);
      return;
    }
    if (fen) {
      analyzing = true;
      readyok = false;
      clearData();
      analysisFen = fen;
      uciMessage(`position fen ${fen}`);
      uciMessage(`setoption name MultiPV value ${lines}`);
      uciMessage(`setoption name Threads value ${numCores}`);
      uciMessage(`go depth ${depth}`);
    }
  }

  export function stopAnalysis() {
    if (!analyzing && readyok) {
      return;
    }
    uciMessage("stop");
    uciMessage("isready");
    clearData();
    dispatchTopMoves();
  }

  function clearData() {
    bestMove = "";
    topMoves = {};
  }

  function handleStockfishMessage(message) {
    Util.debug(message);
    if (message.startsWith("bestmove")) {
      analyzing = false;
      dispatchTopMoves();
      stopAnalysis();
    } else if (message.startsWith("info depth") && message.includes("pv")) {
      const info = parseStockfishInfo(message);
      if (info) {
        topMoves[info.multiPV] = info;
        dispatchTopMoves();
      }
    }
  }

  onMount(() => {
    stockfish = new Worker(
      "/javascript/stockfish/src/stockfish-nnue-16.js", // served with rails public assets server thing
    );
    Util.log({ stockfishWorker: stockfish });
    stockfish.addEventListener("error", (event) => Util.error(event));
    stockfish.addEventListener("message", (event) =>
      handleStockfishMessage(event.data),
    );
    stockfish.addEventListener("message", checkForEvalFileLoaded);
    stockfish.addEventListener("message", checkForReady);
    uciMessage("uci");
    uciMessage("isready");
  });

  onDestroy(() => {
    stockfish.terminate();
  });
</script>
