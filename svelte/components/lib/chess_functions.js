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

const pieceValues = {
  p: 1, // pawn
  n: 3, // knight
  b: 3, // bishop
  r: 5, // rook
  q: 9, // queen
};

export function getMaterialCounts(fen) {
  const chess = new Chess(fen);
  const materialCounts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    whiteWinning: false,
    blackWinning: false,
    equal: false,
    difference: 0,
  };

  const board = chess.board();
  board.forEach((row) => {
    row.forEach((square) => {
      if (square) {
        const piece = square;
        const type = piece.type;
        if (type !== "k") {
          materialCounts[piece.color][type] += 1;
        }
      }
    });
  });

  // Calculate total material value for white and black
  const totalMaterial = {
    w: Object.entries(materialCounts.w).reduce(
      (total, [type, count]) => total + pieceValues[type] * count,
      0,
    ),
    b: Object.entries(materialCounts.b).reduce(
      (total, [type, count]) => total + pieceValues[type] * count,
      0,
    ),
  };
  materialCounts.w.total = totalMaterial.w;
  materialCounts.b.total = totalMaterial.b;
  materialCounts.difference = totalMaterial.w - totalMaterial.b;
  materialCounts.whiteWinning = totalMaterial.w > totalMaterial.b;
  materialCounts.blackWinning = totalMaterial.b > totalMaterial.w;

  return { materialCounts };
}
