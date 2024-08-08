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

const files = "abcdefgh";
const ranks = "12345678";

const pieceValues = {
  p: 1, // pawn
  n: 3, // knight
  b: 3, // bishop
  r: 5, // rook
  q: 9, // queen
};

function getSurroundingSquares(square) {
  const file = square[0];
  const rank = square[1];
  const fileIndex = files.indexOf(file);
  const rankIndex = ranks.indexOf(rank);

  const surroundingSquares = [];

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue; // Skip the original square
      const newFileIndex = fileIndex + i;
      const newRankIndex = rankIndex + j;
      if (
        newFileIndex >= 0 &&
        newFileIndex < 8 &&
        newRankIndex >= 0 &&
        newRankIndex < 8
      ) {
        const newSquare = files[newFileIndex] + ranks[newRankIndex];
        surroundingSquares.push(newSquare);
      }
    }
  }

  return surroundingSquares;
}

export function getKingSurroundingSquares(fen, color = "w") {
  const square = findPiece(fen, "k", color);
  return getSurroundingSquares(square);
}

export function findPiece(fen, type, color) {
  const chess = new Chess(fen);
  const board = chess.board();
  const flattened = board.flat();
  const square = flattened
    .filter((square) => square !== null)
    .find((square) => square.type === type && square.color === color);
  if (!square) {
    return null;
  }
  return square.square;
}

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
