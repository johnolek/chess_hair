import { knightMovesData } from './knight_moves'

class ChessGame {
    constructor() {
        this.board = Chessboard('board', {
            pieceTheme: '/piece/cburnett/{piece}.svg'
        });
        this.initKeyboardShortcuts();
        this.initResizeListener();
        this.highScore = 0;
        this.startTimedGameButton = document.getElementById('startTimedGame');
        this.moveCounter = document.getElementById('move-counter');
        this.startTimedGameButton.addEventListener('click', () => {
            this.startTimedGame();
        });
        this.jsonData = knightMovesData;
        this.positionData = null;
        this.reset();
        this.newPosition();
    }

    initResizeListener() {
        window.addEventListener('resize', () => {
            this.board.resize();
        });
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

    getRandomPathForCurrentPosition() {
        return this.getRandomElement(this.getPathsForCurrentPosition());
    }

    processButton(id) {
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
            const randomValidPath = this.getRandomPathForCurrentPosition();
            const movePairs = randomValidPath.slice(0, -1).map((value, index) => `${value}-${randomValidPath[index + 1]}`);
            movePairs.forEach((pair, index) => {
                setTimeout(() => {
                    this.board.move(pair);
                    this.moveCounter.innerText = index + 1;
                    if (index === movePairs.length - 1) {
                        setTimeout(() => {
                            this.moveCounter.innerText = '';
                            this.updateScores();
                            this.newPosition();
                        }, 1000);
                    }
                }, index * 1000); // Delay increases by 1000ms for each move
            });
        }
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

    newPosition() {
        const keys = Object.keys(this.jsonData);
        const index = this.getRandomIndex(keys.length);
        const key = keys[index];
        [this.knightSquare, this.kingSquare] = key.split('.');
        this.positionData = this.jsonData[key];
        const position = {};
        position[this.kingSquare] = 'bK';
        position[this.knightSquare] = 'wN';
        this.board.position(position);
    }

    animateElement(element, animationClass) {
        element.classList.add(animationClass);

        // Listen for the animationend event
        element.addEventListener('animationend', function () {
            // Once the animation ends, remove the class
            element.classList.remove(animationClass);
        }, {once: true}); // The listener is removed after it's invoked once
    }
}

document.addEventListener("DOMContentLoaded", function () {
    window.game = new ChessGame();
});
