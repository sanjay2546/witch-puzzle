/* ================================
   CONFIG
================================ */

const books = [
  { cover: "covers/The Salamander's Heart scan.jpg", pdf: "pdfs/The Salamander's Heart scan.PDF" },
  { cover: "covers/Brimstone Music scan.jpg", pdf: "pdfs/Brimstone Music scan.PDF" },
  { cover: "covers/Merefire scan.jpg", pdf: "pdfs/Merefire scan.PDF" },
  { cover: "covers/Green Fingers scan.jpg", pdf: "pdfs/Green Fingers scan.PDF" },
  { cover: "covers/The Cruel Empress scan TH.jpg", pdf: "pdfs/The Cruel Empress scan TH.PDF" }
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
let isUnlocking = false;
let _unlockBlobUrl = null;
let isLoadingPuzzle = false;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

/* ================================
   START
================================ */

function startGame() {
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  // Attach modal handlers once
  const downloadBtn = document.getElementById("downloadBtn");
  const continueBtn = document.getElementById("continueBtn");

  if (downloadBtn && !downloadBtn._attached) {
    downloadBtn.addEventListener("click", () => {
      // clicking this link is a user gesture; download should be handled by browser
      // hide the modal after click optionally, keep it until user continues
    });
    downloadBtn._attached = true;
  }

  if (continueBtn && !continueBtn._attached) {
    continueBtn.addEventListener("click", () => {
      const modal = document.getElementById("unlockModal");
      modal.classList.add("hidden");
      modal.style.display = "none";
      if (_unlockBlobUrl) {
        URL.revokeObjectURL(_unlockBlobUrl);
        _unlockBlobUrl = null;
      }
      isUnlocking = false;
      currentBook++;
      if (currentBook < books.length) {
        setTimeout(() => loadPuzzle(), 100);
      } else {
        document.getElementById("title").innerText = "All Stories Recovered ❤️";
      }
    });
    continueBtn._attached = true;
  }

  // Redraw when returning to the page (fixes black canvas after coming back from download)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (!img || !img.complete) {
        // reload image so we can redraw
        if (img && img.src) {
          const src = img.src;
          img = new Image();
          img.src = src;
          img.onload = () => draw();
        }
      } else {
        draw();
      }
    }
  });

  loadPuzzle();
}

/* ================================
   LOAD PUZZLE
================================ */

function loadPuzzle() {
  // Prevent checkSolved from firing during load
  isLoadingPuzzle = true;
  selected = null;
  pieces = [];
  
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
    isLoadingPuzzle = false;
  };
  
  img.onerror = () => {
    console.error("Failed to load image for book", currentBook);
    isLoadingPuzzle = false;
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

  canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  pickPiece(e.touches[0]);
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  movePiece(e.touches[0]);
}, { passive: false });

canvas.addEventListener("touchend", e => {
  e.preventDefault();
  dropPiece();
}, { passive: false });

}

/* ================================
   DRAW
================================ */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Only draw if image is loaded
  if (!img || !img.complete) return;

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
  if (isUnlocking || isLoadingPuzzle) return;
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
  if (isUnlocking || isLoadingPuzzle) return;

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
  if (isLoadingPuzzle) return;
  
  if (
    pieces.every(
      p => p.x === p.correctX && p.y === p.correctY
    )
  ) {
    if (!isUnlocking) setTimeout(unlockBook, 600);
  }
}

/* ================================
   FORCE DOWNLOAD
================================ */

async function unlockBook() {
  // Prevent re-entry
  if (isUnlocking) return;
  isUnlocking = true;

  try {
    // Show modal with loading message immediately
    const modal = document.getElementById("unlockModal");
    const modalInner = modal?.querySelector(".modal-inner");
    const downloadBtn = document.getElementById("downloadBtn");
    const continueBtn = document.getElementById("continueBtn");
    
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.display = "flex";
    }
    
    // Show loading state
    if (modalInner) {
      const originalContent = modalInner.innerHTML;
      modalInner.innerHTML = `<p>Downloading book...</p>`;
    }

    const res = await fetch(books[currentBook].pdf);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    _unlockBlobUrl = url;

    // Update modal with download button
    if (downloadBtn) {
      downloadBtn.href = url;
      downloadBtn.download = books[currentBook].pdf.split("/").pop();
      downloadBtn.setAttribute("role", "link");
      downloadBtn.setAttribute("target", "_blank");
      downloadBtn.style.display = "inline-block";
    }

    // Restore modal content
    if (modalInner) {
      modalInner.innerHTML = `
        <h3>Book unlocked</h3>
        <p>You can download the recovered book below.</p>
        <div class="modal-actions">
          <a id="downloadBtn" class="btn">Download</a>
          <button id="continueBtn" class="btn">Continue</button>
        </div>
      `;
      
      // Re-attach download button
      const newDownloadBtn = modalInner.querySelector("#downloadBtn");
      if (newDownloadBtn) {
        newDownloadBtn.href = url;
        newDownloadBtn.download = books[currentBook].pdf.split("/").pop();
        newDownloadBtn.setAttribute("role", "link");
        newDownloadBtn.setAttribute("target", "_blank");
      }
      
      // Re-attach continue button
      const newContinueBtn = modalInner.querySelector("#continueBtn");
      if (newContinueBtn) {
        newContinueBtn.addEventListener("click", () => {
          modal.classList.add("hidden");
          modal.style.display = "none";
          if (_unlockBlobUrl) {
            URL.revokeObjectURL(_unlockBlobUrl);
            _unlockBlobUrl = null;
          }
          isUnlocking = false;
          currentBook++;
          if (currentBook < books.length) {
            setTimeout(() => loadPuzzle(), 100);
          } else {
            document.getElementById("title").innerText = "All Stories Recovered ❤️";
          }
        });
      }
    }

  } catch (err) {
    console.error("Unlock failed", err);
    alert(`Error downloading book: ${err.message}. Try refreshing the page.`);
    isUnlocking = false;
    const modal = document.getElementById("unlockModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  }
}
