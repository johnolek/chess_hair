import {knightMovesData} from './knight_moves_data'
import {Chessground} from "chessground";
import Config from "./local_config";
import { ConfigForm } from "./local_config";

class ChessGame {
    constructor() {
        this.initConfig();
        this.chessground = Chessground(document.getElementById('board'), {
            fen: '8/8/8/8/8/8/8/8',
            animation: {
                enabled: true,
                duration: this.animationLengthOption.getValue(),
            },
            highlight: {
                lastMove: false,
            },
            draggable: false,
            selectable: false,
        });
        this.initKeyboardShortcuts();
        this.highScore = 0;
        this.startTimedGameButton = document.getElementById('startTimedGame');
        this.startTimedGameButton.addEventListener('click', () => {
            this.startTimedGame();
        });
        this.jsonData = knightMovesData;
        this.positionData = null;
        this.reset();
        this.newPosition();
    }

    startTimedGame() {
        this.reset();
        this.startTimedGameButton.disabled = true;
        this.gameRunning = true;
        this.newPosition();
        this.gameTimer = setTimeout(() => {
            this.endGame();
        }, 60000); // 1 minute
        this.updateTimerDisplay(60);
    }

    endGame() {
        this.updateTimerDisplay(0);
        document.getElementById('timer').innerHTML = "";
        clearTimeout(this.gameTimer);
        if (this.correctCount > this.highScore && this.gameRunning) {
            this.highScore = this.correctCount;
            document.getElementById('highScoreCount').innerHTML = this.highScore;
        }
        const resultTextElement = document.getElementById('resultText');
        resultTextElement.className = "";
        if (this.incorrectCount > 0) {
            resultTextElement.innerText = `Incorrect, game over! The correct answer was ${this.getMinimumMovesForCurrentPosition()}. Your score was ${this.correctCount}.`
            resultTextElement.className = "incorrect";
        } else {
            resultTextElement.innerText = `Time's up! Your score was ${this.correctCount}.`;
            resultTextElement.className = 'correct';
        }

        this.gameRunning = false;
        this.gameTimer = null;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.updateScores();
        this.startTimedGameButton.disabled = false;
    }

    reset() {
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.gameRunning = false;
        this.gameTimer = null;
        this.startTimedGameButton.disabled = false;
        this.updateScores();
        this.updateResultText();
    }

    getRandomIndex(max) {
        return Math.floor(Math.random() * max);
    }

    getRandomElement(array) {
        const index = this.getRandomIndex(array.length);
        return array[index];
    }

    initKeyboardShortcuts() {
        window.addEventListener('keydown', (event) => {
            const key = event.key;
            if (key >= '1' && key <= '6') {
                // Trigger click event on corresponding button
                document.getElementById(key).click();
            }
        });
        // Add click event listener to each button
        for (let i = 1; i <= 6; i++) {
            document.getElementById(String(i)).addEventListener('click', (event) => {
                this.processButton(event.target.id);
            });
        }
    }

    getMinimumMovesForCurrentPosition() {
        return this.positionData.min_length;
    }

    getPathsForCurrentPosition() {
        return this.positionData.paths;
    }

    processButton(id) {
        if (this.animating) {
            return;
        }
        const number = parseInt(id);
        const minimum = this.getMinimumMovesForCurrentPosition();
        const button = document.getElementById(id);
        if (number === minimum) {
            this.correctCount += 1;
            this.animateElement(button, 'correctAnswer');
            this.updateResultText(`${number} was correct!`, 'correct');
            this.updateScores();
            this.newPosition();
        } else {
            this.incorrectCount += 1;
            this.animateElement(button, 'incorrectAnswer');
            if (this.gameRunning) {
                this.endGame();
            } else {
                this.updateResultText(`${number} was incorrect. The correct answer was ${minimum}: `, 'incorrect');
            }
            const correctPaths = this.positionData.paths;
            const randomlySorted = this.sortRandomly(correctPaths);
            const pathToAnimate = randomlySorted[0];
            const movePairs = this.getMovePairsFromPath(pathToAnimate);
            this.drawCorrectArrows(randomlySorted);
            this.makeSequentialMoves(movePairs, () => {
                this.newPosition();
            });
            setTimeout(() => console.log(this.chessground.state), 500);
        }
    }

    sortRandomly(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    getCssVariableValue(variableName) {
        let element = document.body;
        let cssVariableValue = getComputedStyle(element).getPropertyValue(variableName);
        return cssVariableValue.trim();
    }

    drawCorrectArrows(validPaths) {
        const shapes = [];
        const brushes = this.chessground.state.drawable.brushes;
        const brushKeys = Object.keys(brushes);
        let maxPathsToShow = this.maxPathsToDisplayOption.getValue();
        if (maxPathsToShow < 1) {
            maxPathsToShow = 1;
        }

        validPaths.forEach((path, index) => {
            if (index + 1 > maxPathsToShow) {
                return;
            }
            const movePairs = this.getMovePairsFromPath(path);
            const brushKey = brushKeys[index % brushKeys.length];
            movePairs.forEach((pair) => {
                const shape = {orig: pair[0], dest: pair[1], brush: brushKey, modifiers: {hilite: false, lineWidth: 5}}
                shapes.push(shape);
            });
        });

        const mainPath = validPaths[0];
        const mainMovePairs = this.getMovePairsFromPath(mainPath);
        mainMovePairs.forEach((pair, index) => {
            const shape = {orig: pair[0], dest: pair[1], brush: 'green', modifiers: {ineWidth: 10}}
            shapes.push(shape);
        });

        this.chessground.set({
           drawable: {
               shapes: shapes
           }
        });
    }

    getMovePairsFromPath(path) {
        const pairs = [];
        for (let i = 0; i < path.length - 1; i++) {
            pairs.push([path[i], path[i + 1]]);
        }
        return pairs;
    }

    makeSequentialMoves(movePairs = [], callback = null) {
        this.animating = true;
        if (movePairs.length < 1) {
            this.animating = false;
            if (callback) {
                callback();
            }
            return;
        }

        // shift mutates the array
        const move = movePairs.shift();

        this.chessground.move(move[0], move[1]);

        setTimeout(() => this.makeSequentialMoves(movePairs, callback), this.animationLengthOption.getValue());
    }

    updateScores() {
        document.getElementById('incorrectCount').innerHTML = this.incorrectCount;
        document.getElementById('correctCount').innerHTML = this.correctCount;
    }

    updateTimerDisplay(seconds) {
        document.getElementById('timer').innerHTML = `${seconds}`;
        if (seconds > 0 && this.gameRunning) {
            setTimeout(() => {
                if (this.gameRunning) {
                    this.updateTimerDisplay(seconds - 1);
                }
            }, 1000);
        }
    }

    updateResultText(message = '', className = '') {
        const resultTextElement = document.getElementById('resultText');
        resultTextElement.innerText = message;
        resultTextElement.className = '';
        resultTextElement.className = className;
    }

    clearDrawings() {
        this.chessground.set({
            drawable: {
                shapes: []
            }
        });
    }

    newPosition() {
        this.clearDrawings();
        const keys = Object.keys(this.jsonData);
        const index = this.getRandomIndex(keys.length);
        const key = keys[index];
        const previousKnightSquare = this.knightSquare;
        const previousKingSquare = this.kingSquare;
        const squares = key.split('.');
        this.knightSquare = squares[0];
        this.kingSquare = squares[1];
        this.positionData = this.jsonData[key];
        const king = {
            role: 'king',
            color: 'black',
        }
        const knight = {
            role: 'knight',
            color: 'white',
        }
        const piecesDiff = new Map();
        if (previousKnightSquare && previousKingSquare) {
            piecesDiff.set(previousKnightSquare, undefined);
            piecesDiff.set(previousKingSquare, undefined);
        }
        piecesDiff.set(this.kingSquare, king);
        piecesDiff.set(this.knightSquare, knight);
        this.chessground.setPieces(piecesDiff);
        this.chessground.setPieces(new Map());
    }

    animateElement(element, animationClass) {
        element.classList.add(animationClass);

        // Listen for the animationend event
        element.addEventListener('animationend', function () {
            // Once the animation ends, remove the class
            element.classList.remove(animationClass);
        }, {once: true}); // The listener is removed after it's invoked once
    }

    initConfig() {
        this.config = new Config('knight_moves_game');
        this.animationLengthOption = this.config.getConfigOption('Animation length (ms)', 300);

        this.maxPathsToDisplayOption = this.config.getConfigOption('Max paths to show', 6);

        this.configForm = new ConfigForm(this.config);
        this.configForm.addLinkToDOM('config');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    window.game = new ChessGame();
});
