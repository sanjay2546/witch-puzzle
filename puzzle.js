/* ================================
   CONFIG
================================ */

const books = [
  { cover: "covers/The Salamander's Heart scan.jpg", pdf: "pdfs/The Salamander's Heart scan.PDF" },
  { cover: "covers/book2.jpg", pdf: "pdfs/book2.pdf" },
  { cover: "covers/book3.jpg", pdf: "pdfs/book3.pdf" },
  { cover: "covers/book4.jpg", pdf: "pdfs/book4.pdf" },
  { cover: "covers/book5.jpg", pdf: "pdfs/book5.pdf" }
];

const rows = 4;
const cols = 3;
const SNAP = 20;

/* ================================
   STATE
================================ */

let currentBook = 0;
let pieces = [];
let selected = null;
let img = null;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

/* ================================
   START
================================ */

function startGame() {
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  loadPuzzle();
}

/* ================================
   LOAD PUZZLE
================================ */

function loadPuzzle() {
  document.getElementById(
    "title"
  ).innerText = `Recovered Fragment — Book ${currentBook + 1}`;

  img = new Image();
  img.src = books[currentBook].cover;

  img.onload = () => {
    const maxH = 680;
    const ratio = img.width / img.height;

    canvas.height = maxH;
    canvas.width = maxH * ratio;

    createPieces();
  };
}

/* ================================
   CREATE PIECES
================================ */

function createPieces() {
  pieces = [];

  const pw = canvas.width / cols;
  const ph = canvas.height / rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      pieces.push({
        row: y,
        col: x,
        w: pw,
        h: ph,
        x: Math.random() * (canvas.width - pw),
        y: Math.random() * (canvas.height - ph),
        correctX: x * pw,
        correctY: y * ph
      });
    }
  }

  draw();

  canvas.onmousedown = pickPiece;
  canvas.onmousemove = movePiece;
  canvas.onmouseup = dropPiece;

  canvas.ontouchstart = e => pickPiece(e.touches[0]);
  canvas.ontouchmove = e => movePiece(e.touches[0]);
  canvas.ontouchend = dropPiece;
}

/* ================================
   DRAW
================================ */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  pieces.forEach(p => {
    ctx.drawImage(
      img,
      p.col * img.width / cols,
      p.row * img.height / rows,
      img.width / cols,
      img.height / rows,
      p.x,
      p.y,
      p.w,
      p.h
    );

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  });
}

/* ================================
   INTERACTION
================================ */

function pickPiece(e) {
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    if (
      mx > p.x &&
      mx < p.x + p.w &&
      my > p.y &&
      my < p.y + p.h
    ) {
      selected = p;
      pieces.push(pieces.splice(i, 1)[0]);
      break;
    }
  }
}

function movePiece(e) {
  if (!selected) return;

  const r = canvas.getBoundingClientRect();
  selected.x = e.clientX - r.left - selected.w / 2;
  selected.y = e.clientY - r.top - selected.h / 2;

  draw();
}

function dropPiece() {
  if (!selected) return;

  if (
    Math.abs(selected.x - selected.correctX) < SNAP &&
    Math.abs(selected.y - selected.correctY) < SNAP
  ) {
    selected.x = selected.correctX;
    selected.y = selected.correctY;
  }

  selected = null;
  draw();
  checkSolved();
}

/* ================================
   SOLVED CHECK
================================ */

function checkSolved() {
  if (
    pieces.every(
      p =>
        p.x === p.correctX &&
        p.y === p.correctY
    )
  ) {
    setTimeout(unlockBook, 600);
  }
}

/* ================================
   FORCE DOWNLOAD
================================ */

async function unlockBook() {
  const res = await fetch(books[currentBook].pdf);
  const blob = await res.blob();

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `WITCH_Book_${currentBook + 1}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  currentBook++;

  if (currentBook < books.length) {
    loadPuzzle();
  } else {
    document.getElementById("title").innerText =
      "All Stories Recovered ❤️";
  }
}
