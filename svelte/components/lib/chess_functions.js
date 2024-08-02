import { Chess } from "chess.js";

export function getLegalMoves(fen) {
  const chess = new Chess(fen);
  return chess.moves({ verbose: true });
}

export function getLegalMovesMap(fen) {
  const moves = getLegalMoves(fen);
  const legalMovesMap = new Map();
  moves.forEach((move) => {
    if (!legalMovesMap.has(move.from)) {
      legalMovesMap.set(move.from, []);
    }
    legalMovesMap.get(move.from).push(move.to);
  });
  return legalMovesMap;
}
