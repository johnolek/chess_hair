import LichessPgnViewer from 'https://cdn.jsdelivr.net/npm/lichess-pgn-viewer@2.1.0/dist/lichess-pgn-viewer.min.js';
import Config from "./local_config";
import { ConfigForm } from "./local_config.js";
import { boardOptions, pieceSetOptions} from "./board/options";

const config = new Config();
const configForm = new ConfigForm(config);

const updateFrequencyOption = config.getConfigOption('Update frequency in seconds', 5);

const boardOption = config.getConfigOption('Board', 'brown');
boardOption.setAllowedValues(boardOptions);
boardOption.addObserver(board => {
    document.body.dataset.board = board;
    boardOption.setValue(board);
});

const pieceSetOption = config.getConfigOption('Piece set', 'merida');
pieceSetOption.setAllowedValues(pieceSetOptions);
const spriteStylesheet = document.getElementById('piece-sprite');
pieceSetOption.addObserver(set => {
    spriteStylesheet.href = `/piece-css/${set}.css`;
    pieceSetOption.setValue(set);
});

const titleAnimationSpeedOption = config.getConfigOption('Title animation speed in ms', 250);
const titleAnimationLength = config.getConfigOption('Title animation length in ms', 3000);

const firstTitleAnimationText = config.getConfigOption('Title animation 1',  '♘♞♘ New Move ♘♞♘');
const secondTitleAnimationText = config.getConfigOption('Title animation 2',   '♞♘♞ New Move ♞♘♞');

const themeOption = config.getConfigOption('Theme', 'system');
themeOption.setAllowedValues(['system', 'dark', 'light']);

const playerName = document.body.dataset.chessDotComUsername;
let gameCount = null;

async function fetchGames() {
    const response = await fetch(`https://api.chess.com/pub/player/${playerName}/games`);
    const data = await response.json();
    return data.games;
}

function filterMyTurnGames(games) {
    return games.filter(game => (game.turn === 'white' && game.white.includes(playerName)) || (game.turn === 'black' && game.black.includes(playerName)));
}

function sortGamesByMostRecentActivity(games) {
    return games.sort((a, b) => b.last_activity - a.last_activity);
}

function filterTheirTurnGames(games) {
    const myTurnGames = filterMyTurnGames(games)
    const myTurnUrls = myTurnGames.map((game) => game.url);
    return games.filter((game) => !myTurnUrls.includes(game.url));
}

function generateGameLinks(games, container) {
    if (games.length === 0) {
        return;
    }
    games.forEach(game => {
        const lastActivity = game.last_activity;
        const url = game.url;
        const existingGame = document.getElementById(url);
        if (existingGame) {
            if (parseInt(existingGame.dataset.lastActivity) === lastActivity) {
                return;
            } else {
                existingGame.parentNode.removeChild(existingGame);
            }
        }
        const gameContainer = document.createElement('div');
        gameContainer.classList.add('game');
        gameContainer.id = game.url;
        gameContainer.dataset.lastActivity = lastActivity;
        const link = document.createElement('a');
        link.href = game.url;
        link.target = '_blank';

        const myColor = game.white.includes(playerName) ? 'white' : 'black';

        link.textContent = `chess.com`;

        const lineBreak = document.createElement('br');

        const board = document.createElement('div');
        board.classList.add('is2d');
        board.id = game.url;

        gameContainer.appendChild(link);
        gameContainer.appendChild(board);
        gameContainer.appendChild(lineBreak);
        container.appendChild(gameContainer);

        gameContainer.addEventListener('click', () => {
            setTimeout(() => {
                removeAllUndesiredLinks();
            })
        })

        setTimeout(() => {
            LichessPgnViewer(board, {
                pgn: game.pgn,
                initialPly: 'last',
                orientation: myColor,
                scrollToMove: false,
            });
        });
    });
}

function removeAllUndesiredLinks() {
    const analysisLinks = [...document.querySelectorAll('.lpv__menu__analysis')];
    const practiceLinks = [...document.querySelectorAll('.lpv__menu__practice')];
    const allLinks = [...analysisLinks, ...practiceLinks];
    allLinks.forEach((link) => {
        link.parentNode.removeChild(link);
    });
}

function animateTitle(finalTitle) {
    const string1 = firstTitleAnimationText.getValue();
    const string2 = secondTitleAnimationText.getValue();

    let animationInterval = setInterval(function() {
        document.title = document.title === string1 ? string2 : string1;
    }, titleAnimationSpeedOption.getValue());

    setTimeout(function() {
        clearInterval(animationInterval);
        document.title = finalTitle;
    }, titleAnimationLength.getValue());
}

function updateGameCount(games) {
    const count = games.length;
    if (gameCount === count) {
        return;
    }

    const newTitle = `${count} ${chessSymbols(count)}`;

    if (gameCount === null || count < gameCount) {
        document.title = newTitle
    } else {
        animateTitle(newTitle);
    }
    gameCount = count;
}

function chessSymbols(count) {
    const knight = '♘';
    return knight.repeat(count);
}

async function updateGames() {
    const games = await fetchGames();
    const myTurnGames = filterMyTurnGames(games);
    updateGameCount(myTurnGames);
    const myTurnContainer = document.getElementById('gameLinks_myTurn')
    generateGameLinks(sortGamesByMostRecentActivity(myTurnGames), myTurnContainer);
    const theirTurnGames = filterTheirTurnGames(games);
    const theirTurnContainer = document.getElementById('gameLinks_theirTurn')
    generateGameLinks(sortGamesByMostRecentActivity(theirTurnGames), theirTurnContainer);
    setTimeout(updateGames, updateFrequencyOption.getValue() * 1000);
}

document.addEventListener('DOMContentLoaded', async () => {
    await updateGames();
    configForm.addLinkToDOM('config');
    spriteStylesheet.href = `/piece-css/${pieceSetOption.getValue()}.css`;
    document.body.dataset.board = boardOption.getValue();
});