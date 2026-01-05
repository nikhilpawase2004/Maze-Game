const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

let maze, cellSize, player, moves;

/* ---------- Maze ---------- */
function Maze(size) {
  this.size = size;
  this.grid = [];

  for (let y = 0; y < size; y++) {
    this.grid[y] = [];
    for (let x = 0; x < size; x++) {
      this.grid[y][x] = { n: false, s: false, e: false, w: false, visited: false };
    }
  }

  const dirs = ["n","s","e","w"];
  const mod = {
    n: [0,-1,"s"],
    s: [0,1,"n"],
    e: [1,0,"w"],
    w: [-1,0,"e"]
  };

  let stack = [[0,0]];
  this.grid[0][0].visited = true;

  while (stack.length) {
    let [x,y] = stack.pop();
    shuffle(dirs);

    for (let d of dirs) {
      let nx = x + mod[d][0];
      let ny = y + mod[d][1];

      if (nx>=0 && ny>=0 && nx<size && ny<size && !this.grid[ny][nx].visited) {
        this.grid[y][x][d] = true;
        this.grid[ny][nx][mod[d][2]] = true;
        this.grid[ny][nx].visited = true;
        stack.push([x,y],[nx,ny]);
        break;
      }
    }
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ---------- Draw ---------- */
function drawMaze() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "white";

  for (let y = 0; y < maze.size; y++) {
    for (let x = 0; x < maze.size; x++) {
      const c = maze.grid[y][x];
      const px = x * cellSize;
      const py = y * cellSize;

      if (!c.n) drawLine(px,py,px+cellSize,py);
      if (!c.s) drawLine(px,py+cellSize,px+cellSize,py+cellSize);
      if (!c.e) drawLine(px+cellSize,py,px+cellSize,py+cellSize);
      if (!c.w) drawLine(px,py,px,py+cellSize);
    }
  }

  // End point
  ctx.fillStyle = "lime";
  ctx.fillRect(
    (maze.size-1)*cellSize + cellSize/4,
    (maze.size-1)*cellSize + cellSize/4,
    cellSize/2,
    cellSize/2
  );
}

function drawLine(x1,y1,x2,y2) {
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

function drawPlayer() {
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(
    player.x * cellSize + cellSize/2,
    player.y * cellSize + cellSize/2,
    cellSize/3,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/* ---------- Game ---------- */
function startGame() {
  const level = +document.getElementById("level").value;
  maze = new Maze(level);
  cellSize = canvas.width / level;
  player = { x: 0, y: 0 };
  moves = 0;

  drawMaze();
  drawPlayer();
}

/* ---------- Movement ---------- */
document.addEventListener("keydown", e => {
  if (!maze) return;

  const cell = maze.grid[player.y][player.x];
  let moved = false;

  if (e.key === "ArrowUp" && cell.n) { player.y--; moved = true; }
  if (e.key === "ArrowDown" && cell.s) { player.y++; moved = true; }
  if (e.key === "ArrowLeft" && cell.w) { player.x--; moved = true; }
  if (e.key === "ArrowRight" && cell.e) { player.x++; moved = true; }

  if (moved) {
    moves++;
    drawMaze();
    drawPlayer();

    if (player.x === maze.size-1 && player.y === maze.size-1) {
      document.getElementById("info").innerText =
        `🎉 Reached destination in ${moves} moves`;
    }
  }
});
