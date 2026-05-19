class Game2048 {
    constructor() {
        this.gridSize = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = this.loadBestScore();
        this.history = [];
        this.gameOver = false;
        this.won = false;
        this.keepPlaying = false;
        this.tileId = 0;
        this.init();
        this.bindEvents();
    }
    init() {
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.history = [];
        this.gameOver = false;
        this.won = false;
        this.keepPlaying = false;
        this.tileId = 0;
        this.addRandomTile();
        this.addRandomTile();
        this.render();
        this.updateScoreDisplay();
    }
    createEmptyGrid() {
        return Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
    }
    loadBestScore() {
        const saved = localStorage.getItem('2048-best-score');
        return saved ? parseInt(saved, 10) : 0;
    }
    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('2048-best-score', this.bestScore.toString());
        }
    }
    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (!this.grid[i][j]) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            this.grid[randomCell.row][randomCell.col] = {
                id: ++this.tileId,
                value: value,
                merged: false
            };
        }
    }
    render() {
        const container = document.getElementById('tiles-container');
        container.innerHTML = '';
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const tile = this.grid[i][j];
                if (tile) {
                    const tileElement = document.createElement('div');
                    tileElement.className = `tile tile-${tile.value} tile-position-${i}-${j}`;
                    if (tile.merged) {
                        tileElement.classList.add('tile-merged');
                        tile.merged = false;
                    }
                    tileElement.textContent = tile.value;
                    container.appendChild(tileElement);
                }
            }
        }
    }
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('best-score').textContent = this.bestScore;
    }
    saveState() {
        this.history.push({
            grid: this.grid.map(row => row.map(cell => cell ? { ...cell } : null)),
            score: this.score
        });
        if (this.history.length > 10) {
            this.history.shift();
        }
    }
    undo() {
        if (this.history.length > 0 && !this.gameOver) {
            const lastState = this.history.pop();
            this.grid = lastState.grid;
            this.score = lastState.score;
            this.render();
            this.updateScoreDisplay();
        }
    }
    move(direction) {
        if (this.gameOver) return false;
        this.saveState();
        let moved = false;
        const vectors = {
            up: { row: -1, col: 0 },
            down: { row: 1, col: 0 },
            left: { row: 0, col: -1 },
            right: { row: 0, col: 1 }
        };
        const vector = vectors[direction];
        const traversals = this.buildTraversals(vector);
        traversals.rows.forEach(row => {
            traversals.cols.forEach(col => {
                const cell = { row, col };
                const tile = this.grid[row][col];
                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = positions.next;
                    const nextTile = next.row >= 0 && this.grid[next.row][next.col];
                    if (nextTile && nextTile.value === tile.value && !nextTile.merged) {
                        this.grid[next.row][next.col] = {
                            id: ++this.tileId,
                            value: tile.value * 2,
                            merged: true
                        };
                        this.grid[cell.row][cell.col] = null;
                        this.score += tile.value * 2;
                        if (tile.value * 2 === 2048 && !this.won) {
                            this.won = true;
                            this.showWinModal();
                        }
                        moved = true;
                    } else if (positions.farthest.row !== cell.row || positions.farthest.col !== cell.col) {
                        this.grid[positions.farthest.row][positions.farthest.col] = {
                            id: ++this.tileId,
                            value: tile.value,
                            merged: false
                        };
                        this.grid[cell.row][cell.col] = null;
                        moved = true;
                    }
                }
            });
        });
        if (moved) {
            this.addRandomTile();
            this.saveBestScore();
            if (!this.canMove()) {
                this.gameOver = true;
                this.showGameOverModal();
            }
            this.render();
            this.updateScoreDisplay();
        } else {
            this.history.pop();
        }
        return moved;
    }
    buildTraversals(vector) {
        const traversals = { rows: [], cols: [] };
        for (let i = 0; i < this.gridSize; i++) {
            traversals.rows.push(i);
            traversals.cols.push(i);
        }
        if (vector.row === 1) traversals.rows.reverse();
        if (vector.col === 1) traversals.cols.reverse();
        return traversals;
    }
    findFarthestPosition(cell, vector) {
        let previous;
        let current = { ...cell };
        do {
            previous = { ...current };
            current = {
                row: previous.row + vector.row,
                col: previous.col + vector.col
            };
        } while (this.withinBounds(current) && !this.grid[current.row][current.col]);
        const nextTile = this.withinBounds(current) ? this.grid[current.row][current.col] : null;
        return {
            farthest: previous,
            next: nextTile ? current : { row: -1, col: -1 }
        };
    }
    withinBounds(position) {
        return position.row >= 0 && position.row < this.gridSize &&
               position.col >= 0 && position.col < this.gridSize;
    }
    canMove() {
        if (this.hasEmptyCells()) return true;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const tile = this.grid[i][j];
                if (tile) {
                    if (this.canMerge(i, j, i, j + 1) || this.canMerge(i, j, i + 1, j)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    hasEmptyCells() {
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (!this.grid[i][j]) return true;
            }
        }
        return false;
    }
    canMerge(row1, col1, row2, col2) {
        if (row2 >= this.gridSize || col2 >= this.gridSize) return false;
        const tile1 = this.grid[row1][col1];
        const tile2 = this.grid[row2][col2];
        return tile1 && tile2 && tile1.value === tile2.value;
    }
    showGameOverModal() {
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-modal').style.display = 'flex';
    }
    showWinModal() {
        document.getElementById('win-score').textContent = this.score;
        document.getElementById('win-modal').style.display = 'flex';
    }
    continueGame() {
        this.keepPlaying = true;
        document.getElementById('win-modal').style.display = 'none';
    }
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'
            };
            const direction = keyMap[e.key];
            if (direction) {
                e.preventDefault();
                this.move(direction);
            }
        });
        let touchStartX = 0, touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipe = 30;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > minSwipe) {
                    this.move(deltaX > 0 ? 'right' : 'left');
                }
            } else {
                if (Math.abs(deltaY) > minSwipe) {
                    this.move(deltaY > 0 ? 'down' : 'up');
                }
            }
        }, { passive: true });
        document.getElementById('new-game').addEventListener('click', () => {
            this.hideModals();
            this.init();
        });
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('restart-game').addEventListener('click', () => {
            this.hideModals();
            this.init();
        });
        document.getElementById('continue-game').addEventListener('click', () => this.continueGame());
        document.getElementById('restart-after-win').addEventListener('click', () => {
            this.hideModals();
            this.init();
        });
    }
    hideModals() {
        document.getElementById('game-over-modal').style.display = 'none';
        document.getElementById('win-modal').style.display = 'none';
    }
}
document.addEventListener('DOMContentLoaded', () => new Game2048());