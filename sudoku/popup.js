const DIFFICULTY = {
  easy: { label: 'Easy', cells: 36 },
  medium: { label: 'Medium', cells: 30 },
  hard: { label: 'Hard', cells: 24 },
  expert: { label: 'Expert', cells: 20 }
};

let state = {
  level: 'easy',
  board: [],
  solution: [],
  fixed: [],
  selected: null,
  timer: 0,
  timerInterval: null,
  paused: false,
  finished: false
};

function genSolvedBoard() {
  const b = Array.from({ length: 9 }, () => Array(9).fill(0));
  function isValid(b, r, c, v) {
    for (let i = 0; i < 9; i++) {
      if (b[r][i] === v) return false;
      if (b[i][c] === v) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++)
      for (let j = bc; j < bc + 3; j++)
        if (b[i][j] === v) return false;
    return true;
  }
  function solve(b) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const nums = shuffle([1,2,3,4,5,6,7,8,9]);
          for (const v of nums) {
            if (isValid(b, r, c, v)) {
              b[r][c] = v;
              if (solve(b)) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  solve(b);
  return b;
}

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function genPuzzle(level) {
  const solution = genSolvedBoard();
  const board = solution.map(r => [...r]);
  const cells = DIFFICULTY[level].cells;
  const fixed = Array.from({ length: 9 }, () => Array(9).fill(true));
  let removed = 0;
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );
  for (const [r, c] of positions) {
    if (removed >= 81 - cells) break;
    board[r][c] = 0;
    fixed[r][c] = false;
    removed++;
  }
  return { board, solution, fixed };
}

function copyBoard(b) {
  return b.map(r => [...r]);
}

function initGame(level) {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  const data = genPuzzle(level);
  state.level = level;
  state.board = data.board;
  state.solution = data.solution;
  state.fixed = data.fixed;
  state.selected = null;
  state.timer = 0;
  state.paused = false;
  state.finished = false;
  renderBoard();
  renderLevel();
  renderTimer();
  updateNumpad();
  showScreen('game');
  startTimer();
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (!state.paused && !state.finished) {
      state.timer++;
      renderTimer();
    }
  }, 1000);
}

function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function renderTimer() {
  document.getElementById('timer').textContent = formatTime(state.timer);
}

function renderLevel() {
  document.getElementById('level-display').textContent = DIFFICULTY[state.level].label;
}

function renderBoard() {
  const table = document.getElementById('sudoku-grid');
  table.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < 9; c++) {
      const td = document.createElement('td');
      td.dataset.r = r;
      td.dataset.c = c;
      const v = state.board[r][c];
      if (v !== 0) {
        td.textContent = v;
        if (state.fixed[r][c]) td.classList.add('given');
        else td.classList.add('filled');
      }
      td.addEventListener('click', () => selectCell(r, c));
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function selectCell(r, c) {
  if (state.paused || state.finished) return;
  if (state.fixed[r][c]) return;
  state.selected = { r, c };
  highlightBoard();
}

function highlightBoard() {
  const tds = document.querySelectorAll('#sudoku-grid td');
  tds.forEach(td => {
    td.classList.remove('selected', 'highlighted', 'same-number', 'error');
  });
  if (!state.selected) return;
  const { r, c } = state.selected;
  const selTd = document.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
  if (selTd) selTd.classList.add('selected');
  const v = state.board[r][c];
  tds.forEach(td => {
    const tr = +td.dataset.r, tc = +td.dataset.c;
    if (tr === r && tc === c) return;
    const sameRow = tr === r;
    const sameCol = tc === c;
    const sameBox = Math.floor(tr / 3) === Math.floor(r / 3) && Math.floor(tc / 3) === Math.floor(c / 3);
    if (sameRow || sameCol || sameBox) td.classList.add('highlighted');
    if (v !== 0 && state.board[tr][tc] === v && !(tr === r && tc === c)) {
      td.classList.add('same-number');
    }
  });
}

function placeNumber(n) {
  if (!state.selected || state.paused || state.finished) return;
  const { r, c } = state.selected;
  if (state.fixed[r][c]) return;
  state.board[r][c] = n;
  const td = document.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
  td.textContent = n || '';
  td.classList.remove('filled', 'error');
  if (n !== 0) {
    td.classList.add('filled');
    if (n !== state.solution[r][c]) td.classList.add('error');
  }
  clearErrorStyles();
  highlightBoard();
  updateNumpad();
  if (isBoardComplete()) finishGame();
}

function clearErrorStyles() {
  document.querySelectorAll('#sudoku-grid td.error').forEach(td => {
    if (+td.textContent === state.solution[+td.dataset.r][+td.dataset.c]) {
      td.classList.remove('error');
    }
  });
}

function isBoardComplete() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] !== state.solution[r][c]) return false;
  return true;
}

function finishGame() {
  state.finished = true;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  document.getElementById('finish-time').textContent = `Time: ${formatTime(state.timer)}`;
  document.getElementById('finish-overlay').classList.remove('hidden');
}

function updateNumpad() {
  const counts = {};
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const v = state.board[r][c];
      counts[v] = (counts[v] || 0) + 1;
    }
  document.querySelectorAll('.num-btn').forEach(btn => {
    const n = +btn.dataset.num;
    btn.style.opacity = (counts[n] || 0) >= 9 ? '0.3' : '1';
  });
}

function checkBoard() {
  let errs = 0;
  const tds = document.querySelectorAll('#sudoku-grid td');
  tds.forEach(td => {
    td.classList.remove('error');
    const r = +td.dataset.r, c = +td.dataset.c;
    if (state.fixed[r][c]) return;
    const v = state.board[r][c];
    if (v !== 0 && v !== state.solution[r][c]) {
      td.classList.add('error');
      errs++;
    }
  });
  if (errs === 0) {
    document.querySelectorAll('#sudoku-grid td.filled').forEach(td => td.classList.remove('error'));
  }
}

function giveHint() {
  if (state.paused || state.finished) return;
  const empties = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (!state.fixed[r][c] && state.board[r][c] === 0) empties.push([r, c]);
    }
  if (empties.length === 0) return;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  state.board[r][c] = state.solution[r][c];
  const td = document.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
  td.textContent = state.solution[r][c];
  td.classList.add('given');
  state.fixed[r][c] = true;
  td.classList.remove('filled', 'error');
  clearErrorStyles();
  highlightBoard();
  updateNumpad();
  if (isBoardComplete()) finishGame();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id + '-screen').classList.add('active');
}

/* ---- Event Listeners ---- */
document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    initGame(btn.dataset.level);
  });
});

document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    placeNumber(+btn.dataset.num);
  });
});

document.getElementById('erase-btn').addEventListener('click', () => {
  placeNumber(0);
});

document.getElementById('check-btn').addEventListener('click', checkBoard);

document.getElementById('hint-btn').addEventListener('click', giveHint);

document.getElementById('back-btn').addEventListener('click', () => {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  document.getElementById('finish-overlay').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  showScreen('menu');
});

document.getElementById('new-game-btn').addEventListener('click', () => {
  initGame(state.level);
  document.getElementById('finish-overlay').classList.add('hidden');
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  initGame(state.level);
  document.getElementById('finish-overlay').classList.add('hidden');
});

document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('finish-overlay').classList.add('hidden');
  showScreen('menu');
});

document.getElementById('resume-btn').addEventListener('click', () => {
  state.paused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
});

document.getElementById('quit-btn').addEventListener('click', () => {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.paused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  showScreen('menu');
});

document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') placeNumber(+e.key);
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') placeNumber(0);
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    if (!state.selected) return;
    let { r, c } = state.selected;
    if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
    if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
    if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
    if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
    if (state.fixed[r][c]) {
      selectCell(r, c);
    } else {
      selectCell(r, c);
    }
  }
});

showScreen('menu');
