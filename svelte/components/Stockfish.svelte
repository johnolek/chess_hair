<script>
  import { onMount, createEventDispatcher, onDestroy } from "svelte";
  import { cloneDeep } from "lodash";
  import { Util } from "src/util";
  import { Chess } from "chess.js";
  import { stockfishLines, stockfishDepth, stockfishCores } from "../stores";

  export let analysisEnabled = false;
  export let analyzing = false;
  export let readyok = false;

  let topMoves = {};
  let analysisFen;
  let stockfishWorker;

  stockfishLines.subscribe(restartAnalysis);
  stockfishDepth.subscribe(restartAnalysis);

  const dispatch = createEventDispatcher();

  function restartAnalysis() {
    if (analysisEnabled && analysisFen) {
      Util.log("restarting analysis");
      analyzePosition(analysisFen);
    }
  }

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

  function checkForReady(message) {
    if (message === "readyok") {
      Util.log("stockfish ready command received");
      readyok = true;
      if (stopping) {
        Util.log("setting stopping to false");
        stopping = false;
      }
      if (analyzing) {
        Util.log("setting analyzing to false");
        analyzing = false;
      }
    }
  }

  function checkForEvalFileLoaded(event) {
    const message = event.data;
    if (message.startsWith("Load eval file success: 1")) {
      stockfishWorker.removeEventListener("message", checkForEvalFileLoaded);
      uciMessage("isready");
    }
  }

  function getFullMove(uciMove, fen) {
    const chessInstance = new Chess();
    chessInstance.load(fen);
    try {
      return chessInstance.move(uciMove);
    } catch (error) {
      Util.error("error getting full move", error);
      return null;
    }
  }

  /**
   * Send a message to the Stockfish worker
   *
   * @param message
   */
  export function uciMessage(message) {
    stockfishWorker.postMessage(message);
  }

  function getTopMovesArray(topMoves, fen) {
    const topMovesArray = Object.values(topMoves)
      .slice(0, $stockfishLines)
      .map(cloneDeep)
      .map((moveData) => {
        return {
          ...moveData,
          fullMove: getFullMove(moveData.principalVariation[0], fen),
          fen: fen,
        };
      })
      .filter((moveData) => moveData.fullMove);

    return topMovesArray;
  }

  function dispatchTopMoves(topMoves, fen) {
    const topMovesArray = getTopMovesArray(topMoves, fen);

    if (topMovesArray.length > 0) {
      dispatch("topmoves", { topMoves: cloneDeep(topMovesArray) });
    }
  }

  let nextAnalysisTimeout;
  export function analyzePosition(fen, attempt = 0) {
    analysisEnabled = true;
    topMoves = {};
    if (analyzing) {
      Util.log(`Attempt ${attempt}: already analyzing, stopping and retrying`);
      stopAnalysis();
      clearTimeout(nextAnalysisTimeout);
      nextAnalysisTimeout = setTimeout(() => {
        analyzePosition(fen, attempt + 1);
      }, 5);
      return;
    }

    Util.log(`Starting to analyze position: ${fen}`);
    analysisFen = fen;
    analyzing = true;
    readyok = false;
    uciMessage(`position fen ${fen}`);
    uciMessage(`setoption name MultiPV value ${$stockfishLines}`);
    uciMessage(`setoption name Threads value ${$stockfishCores}`);
    uciMessage(`go depth ${$stockfishDepth}`);
  }

  let stopping = false;
  export function stopAnalysis() {
    if (!analyzing || stopping) {
      return;
    }
    // This will be set back to false after receiving the readyok message
    stopping = true;
    uciMessage("stop");
    uciMessage("isready");
  }

  function handleStockfishMessage(message) {
    Util.debug(message);
    checkForReady(message);

    if (stopping) {
      return;
    }

    if (message.startsWith("info depth") && message.includes("pv")) {
      const info = parseStockfishInfo(message);
      if (info) {
        topMoves[info.multiPV] = info;
        dispatchTopMoves(topMoves, analysisFen);
      }
    }

    if (message.startsWith("bestmove")) {
      const topMovesArray = getTopMovesArray(topMoves, analysisFen);
      const isAnalysisComplete =
        topMovesArray.length > 0 &&
        topMovesArray.every((topMove) => topMove.depth === $stockfishDepth);
      if (isAnalysisComplete) {
        stopAnalysis();
      }
    }
  }

  onMount(() => {
    stockfishWorker = new Worker(
      "/javascript/stockfish/src/stockfish-nnue-16.js", // served with rails public assets server thing
    );
    Util.log({ stockfishWorker: stockfishWorker });
    stockfishWorker.addEventListener("error", (event) => Util.error(event));
    stockfishWorker.addEventListener("message", (event) =>
      handleStockfishMessage(event.data),
    );
    stockfishWorker.addEventListener("message", checkForEvalFileLoaded);
    uciMessage("setoption name Use NNUE value true");
  });

  onDestroy(() => {
    stockfishWorker.terminate();
  });
</script>
