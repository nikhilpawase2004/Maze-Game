/**
 * Neon Labyrinth - Professional Edition
 * Feature: Hard Mode is now Clear (No Fog)
 */

// --- Constants & Config ---
const CONFIGS = {
    easy:   { cols: 15, rows: 15, braidFactor: 0, fog: false },    // Perfect Maze
    medium: { cols: 25, rows: 25, braidFactor: 0.2, fog: false },  // 20% Loops
    hard:   { cols: 40, rows: 40, braidFactor: 0.6, fog: false }   // 60% Loops + Clear View
};

// --- Sound Engine (Web Audio API) ---
const sfx = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    init() { if (this.ctx.state === 'suspended') this.ctx.resume(); },
    play(type) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (type === 'win') {
            this.playNote(523.25, t, 0.1);
            this.playNote(659.25, t + 0.1, 0.1);
            this.playNote(783.99, t + 0.2, 0.1);
            this.playNote(1046.50, t + 0.3, 0.4);
        }
    },
    playNote(freq, time, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
    }
};

// --- State Management ---
const state = {
    maze: [],
    player: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    cols: 0, rows: 0, size: 0,
    difficulty: 'medium',
    isRunning: false,
    moves: 0,
    startTime: 0,
    timerInterval: null
};

// --- DOM Elements ---
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const ui = {
    level: document.getElementById('level-display'),
    time: document.getElementById('timer'),
    moves: document.getElementById('moves'),
    modal: document.getElementById('winModal'),
    finalTime: document.getElementById('final-time'),
    finalMoves: document.getElementById('final-moves'),
    restartBtn: document.getElementById('btn-restart'),
    diffBtns: document.querySelectorAll('.btn-diff')
};

// --- Maze Logic ---
class Cell {
    constructor(c, r) {
        this.c = c;
        this.r = r;
        this.walls = [true, true, true, true]; // Top, Right, Bottom, Left
        this.visited = false;
    }

    checkNeighbors(maze, cols, rows) {
        const neighbors = [];
        const index = (c, r) => (c < 0 || r < 0 || c > cols - 1 || r > rows - 1) ? -1 : c + r * cols;

        const top    = maze[index(this.c, this.r - 1)];
        const right  = maze[index(this.c + 1, this.r)];
        const bottom = maze[index(this.c, this.r + 1)];
        const left   = maze[index(this.c - 1, this.r)];

        if (top && !top.visited) neighbors.push(top);
        if (right && !right.visited) neighbors.push(right);
        if (bottom && !bottom.visited) neighbors.push(bottom);
        if (left && !left.visited) neighbors.push(left);

        if (neighbors.length > 0) return neighbors[Math.floor(Math.random() * neighbors.length)];
        return undefined;
    }
}

function generateMaze() {
    state.maze = [];
    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            state.maze.push(new Cell(c, r));
        }
    }

    // 1. Recursive Backtracker
    let current = state.maze[0];
    let stack = [];
    current.visited = true;

    while (true) {
        let next = current.checkNeighbors(state.maze, state.cols, state.rows);
        if (next) {
            next.visited = true;
            stack.push(current);
            removeWalls(current, next);
            current = next;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }

    // 2. Braiding (Loops)
    const braidFactor = CONFIGS[state.difficulty].braidFactor;
    if (braidFactor > 0) {
        for (let i = 0; i < state.maze.length; i++) {
            let cell = state.maze[i];
            let wallCount = cell.walls.filter(w => w).length;
            if (wallCount === 3 && Math.random() < braidFactor) {
                removeRandomWall(cell);
            }
        }
    }
}

function removeWalls(a, b) {
    const x = a.c - b.c;
    if (x === 1) { a.walls[3] = false; b.walls[1] = false; }
    if (x === -1) { a.walls[1] = false; b.walls[3] = false; }
    const y = a.r - b.r;
    if (y === 1) { a.walls[0] = false; b.walls[2] = false; }
    if (y === -1) { a.walls[2] = false; b.walls[0] = false; }
}

function removeRandomWall(cell) {
    let neighbors = [];
    const idx = (c, r) => (c < 0 || r < 0 || c > state.cols - 1 || r > state.rows - 1) ? -1 : c + r * state.cols;

    if (cell.r > 0) neighbors.push([state.maze[idx(cell.c, cell.r-1)], 0, 2]);
    if (cell.c < state.cols-1) neighbors.push([state.maze[idx(cell.c+1, cell.r)], 1, 3]);
    if (cell.r < state.rows-1) neighbors.push([state.maze[idx(cell.c, cell.r+1)], 2, 0]);
    if (cell.c > 0) neighbors.push([state.maze[idx(cell.c-1, cell.r)], 3, 1]);

    if (neighbors.length > 0) {
        const rand = neighbors[Math.floor(Math.random() * neighbors.length)];
        const target = rand[0];
        if (cell.walls[rand[1]]) {
            cell.walls[rand[1]] = false;
            target.walls[rand[2]] = false;
        }
    }
}

// --- Game Loop ---
function initGame() {
    clearInterval(state.timerInterval);
    state.isRunning = true;
    state.moves = 0;
    ui.moves.innerText = '0';
    ui.time.innerText = '00:00';
    ui.modal.classList.remove('show');

    const conf = CONFIGS[state.difficulty];
    state.cols = conf.cols;
    state.rows = conf.rows;

    const maxWidth = window.innerWidth > 600 ? 600 : window.innerWidth - 40;
    const maxHeight = window.innerHeight > 600 ? 600 : window.innerHeight - 300;
    const availableSize = Math.min(maxWidth, maxHeight);
    
    state.size = Math.floor(availableSize / Math.max(state.cols, state.rows));
    if (state.size < 8) state.size = 8; // Allow smaller cells for density

    canvas.width = state.size * state.cols;
    canvas.height = state.size * state.rows;

    generateMaze();
    state.player = { x: 0, y: 0 };
    state.goal = { x: state.cols - 1, y: state.rows - 1 };

    state.startTime = Date.now();
    state.timerInterval = setInterval(() => {
        const delta = Math.floor((Date.now() - state.startTime) / 1000);
        const m = Math.floor(delta / 60).toString().padStart(2, '0');
        const s = (delta % 60).toString().padStart(2, '0');
        ui.time.innerText = `${m}:${s}`;
    }, 1000);

    draw();
}

function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const size = state.size;

    // Draw Walls
    ctx.strokeStyle = '#ffffff';
    // Dynamic line width: if cells are tiny (Hard mode), make lines thin
    ctx.lineWidth = size < 12 ? 1 : 2; 
    ctx.lineCap = "round";
    ctx.beginPath();
    
    state.maze.forEach(cell => {
        const x = cell.c * size;
        const y = cell.r * size;
        if (cell.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + size, y); }
        if (cell.walls[1]) { ctx.moveTo(x + size, y); ctx.lineTo(x + size, y + size); }
        if (cell.walls[2]) { ctx.moveTo(x + size, y + size); ctx.lineTo(x, y + size); }
        if (cell.walls[3]) { ctx.moveTo(x, y + size); ctx.lineTo(x, y); }
    });
    ctx.stroke();

    // Goal
    ctx.fillStyle = '#00ccff';
    const gp = state.goal;
    ctx.fillRect(gp.x * size + size * 0.2, gp.y * size + size * 0.2, size * 0.6, size * 0.6);

    // Player
    ctx.fillStyle = '#ff0055';
    const pp = state.player;
    ctx.beginPath();
    ctx.arc(pp.x * size + size / 2, pp.y * size + size / 2, size * 0.35, 0, 2 * Math.PI);
    ctx.fill();

    // Fog Logic - Only runs if config.fog is true (currently disabled)
    if (CONFIGS[state.difficulty].fog) {
        const px = pp.x * size + size / 2;
        const py = pp.y * size + size / 2;
        const radius = size * 4.5;
        const gradient = ctx.createRadialGradient(px, py, size, px, py, radius);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(0.8, "rgba(15, 23, 42, 0.98)");
        gradient.addColorStop(1, "rgba(15, 23, 42, 1)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function movePlayer(dx, dy) {
    if (!state.isRunning) return;
    const index = state.player.x + state.player.y * state.cols;
    const currentCell = state.maze[index];
    let moved = false;

    if (dy === -1 && !currentCell.walls[0]) { state.player.y--; moved = true; }
    else if (dx === 1 && !currentCell.walls[1]) { state.player.x++; moved = true; }
    else if (dy === 1 && !currentCell.walls[2]) { state.player.y++; moved = true; }
    else if (dx === -1 && !currentCell.walls[3]) { state.player.x--; moved = true; }

    if (moved) {
        sfx.play('move');
        state.moves++;
        ui.moves.innerText = state.moves;
        draw();
        
        if (state.player.x === state.goal.x && state.player.y === state.goal.y) {
            sfx.play('win');
            state.isRunning = false;
            clearInterval(state.timerInterval);
            ui.finalTime.innerText = ui.time.innerText;
            ui.finalMoves.innerText = state.moves;
            ui.modal.classList.add('show');
        }
    }
}

// --- Inputs ---
ui.diffBtns.forEach(btn => btn.addEventListener('click', (e) => {
    state.difficulty = e.target.dataset.level;
    ui.diffBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    // Update button text to remove flashlight icon
    ui.diffBtns.forEach(b => {
        if(b.dataset.level === 'hard') b.innerText = 'Hard';
    });
    
    ui.level.innerText = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
    initGame();
}));
ui.restartBtn.addEventListener('click', initGame);

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup','w'].includes(k)) { e.preventDefault(); movePlayer(0, -1); }
    if (['arrowright','d'].includes(k)) { e.preventDefault(); movePlayer(1, 0); }
    if (['arrowdown','s'].includes(k)) { e.preventDefault(); movePlayer(0, 1); }
    if (['arrowleft','a'].includes(k)) { e.preventDefault(); movePlayer(-1, 0); }
});

let tsX = 0, tsY = 0;
canvas.addEventListener('touchstart', e => { tsX = e.changedTouches[0].screenX; tsY = e.changedTouches[0].screenY; e.preventDefault(); }, {passive: false});
canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - tsX;
    const dy = e.changedTouches[0].screenY - tsY;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 30) movePlayer(dx > 0 ? 1 : -1, 0); }
    else { if (Math.abs(dy) > 30) movePlayer(0, dy > 0 ? 1 : -1); }
}, {passive: false});

// Init
window.onload = initGame;
window.onresize = initGame;
