// board
let board;
let boardWidth = window.innerWidth;
let boardHeight = window.innerHeight;
let context;

// bird
let birdWidth = boardWidth / 25;
let birdHeight = birdWidth * (34 / 44);
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;

let bird = {
  x: birdX,
  y: birdY,
  width: birdWidth,
  height: birdHeight,
};

// pipes
let pipeWidth = boardWidth / 12;
let pipeHeight = pipeWidth * (2072 / 450);
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// physics
let velocityX = -boardWidth / 250;
let velocityY = 0;
let gravity = 0.4;

let gameOver = false;
let score = 0;

let wingSound = new Audio("./audio/sfx_wing.wav");
let hitSound = new Audio("./audio/sfx_hit.wav");
let pointSound = new Audio("./audio/sfx_point.wav");
let bgm = new Audio("./audio/bgm_mario.mp3");
bgm.loop = true;

// Pipes Linked List
class PipePair {
  constructor(topPipe, bottomPipe) {
    this.top = topPipe;
    this.bottom = bottomPipe;
    this.passed = false;
  }
}

class PipeNode {
  constructor(pipePair, next = null) {
    this.pipe = pipePair;
    this.next = next;
  }
}

class PipeLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  append(pipePair) {
    const node = new PipeNode(pipePair);
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
  }

  removeOffScreenPipes() {
    while (this.head && this.head.pipe.top.x + this.head.pipe.top.width < 0) {
      this.head = this.head.next;
    }
    if (!this.head) this.tail = null;
  }

  forEach(callback) {
    let current = this.head;
    while (current) {
      callback(current.pipe);
      current = current.next;
    }
  }
}

let pipeList = new PipeLinkedList();

// Bird Frame Circular Linked List
class BirdFrameNode {
  constructor(img) {
    this.img = img;
    this.next = null;
  }
}

class CircularBirdFrames {
  constructor() {
    this.current = null;
  }

  append(img) {
    const newNode = new BirdFrameNode(img);
    if (!this.current) {
      this.current = newNode;
      newNode.next = this.current; // circular ke dirinya sendiri
    } else {
      let temp = this.current;
      while (temp.next !== this.current) {
        temp = temp.next;
      }
      temp.next = newNode;
      newNode.next = this.current;
    }
  }

  nextFrame() {
    if (this.current) {
      this.current = this.current.next;
    }
  }

  getCurrentFrame() {
    return this.current ? this.current.img : null;
  }
}

let birdFrameList = new CircularBirdFrames();

// Responsive Board
window.addEventListener("resize", () => {
  boardWidth = window.innerWidth;
  boardHeight = window.innerHeight;
  board.width = boardWidth;
  board.height = boardHeight;
});

// Setup
window.onload = function () {
  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d");

  for (let i = 0; i < 4; i++) {
    let birdImg = new Image();
    birdImg.src = `./flappy-bird/flappybird${i}.png`;
    birdFrameList.append(birdImg);
  }

  topPipeImg = new Image();
  topPipeImg.src = "./flappy-bird/toppipe.png";

  bottomPipeImg = new Image();
  bottomPipeImg.src = "./flappy-bird/bottompipe.png";

  requestAnimationFrame(update);
  setInterval(placePipes, 850);
  setInterval(animateBird, 100);
  document.addEventListener("keydown", moveBird);
  board.addEventListener("click", moveBird);
};

// Loop Update
function update() {
  requestAnimationFrame(update);
  if (gameOver) return;

  context.clearRect(0, 0, board.width, board.height);

  // bird physics
  velocityY += gravity;
  bird.y = Math.max(bird.y + velocityY, 0);
  context.drawImage(birdFrameList.getCurrentFrame(), bird.x, bird.y, bird.width, bird.height);

  if (bird.y > board.height) {
    gameOver = true;
  }

  // pipe logic
  pipeList.forEach((pair) => {
    pair.top.x += velocityX;
    pair.bottom.x += velocityX;

    context.drawImage(pair.top.img, pair.top.x, pair.top.y, pair.top.width, pair.top.height);
    context.drawImage(
      pair.bottom.img,
      pair.bottom.x,
      pair.bottom.y,
      pair.bottom.width,
      pair.bottom.height
    );

    if (!pair.passed && bird.x > pair.top.x + pair.top.width) {
      score++;
      pair.passed = true;
      if (score % 5 === 0) {
        pointSound.play();
      }
    }

    if (detectCollision(bird, pair.top) || detectCollision(bird, pair.bottom)) {
      hitSound.play();
      gameOver = true;
    }
  });

  pipeList.removeOffScreenPipes();

  // score
  context.strokeStyle = "black";
  context.lineWidth = 5;
  context.strokeText(score, boardWidth / 2, boardHeight / 6);
  context.fillStyle = "white";
  context.font = "60px sans-serif";
  context.fillText(score, boardWidth / 2, boardHeight / 6);

  if (gameOver) {
    context.strokeText("GAME OVER", boardWidth / 2.65, boardHeight / 3.5);
    context.fillText("GAME OVER", boardWidth / 2.65, boardHeight / 3.5);
    bgm.pause();
    bgm.currentTime = 0;
  }
}

// Animasi Burung (Circular Linked List)
function animateBird() {
  birdFrameList.nextFrame();
}

// Membuat Pipa
function placePipes() {
  if (gameOver) return;

  let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
  let openingSpace = board.height / 3;

  let topPipe = {
    img: topPipeImg,
    x: pipeX,
    y: randomPipeY,
    width: pipeWidth,
    height: pipeHeight,
  };

  let bottomPipe = {
    img: bottomPipeImg,
    x: pipeX,
    y: randomPipeY + pipeHeight + openingSpace,
    width: pipeWidth,
    height: pipeHeight,
  };

  let pipePair = new PipePair(topPipe, bottomPipe);
  pipeList.append(pipePair);
}

function moveBird(e) {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyX" || e.type === "click") {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
    }

    if (bgm.paused) {
      bgm.play();
    }

    wingSound.play();
    velocityY = -6;

    if (gameOver) {
      bird.y = birdY;
      pipeList = new PipeLinkedList();
      score = 0;
      gameOver = false;
      bgm.currentTime = 0;
      bgm.play();
    }
  }
}

// Mendeteksi Tabrakan
function detectCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
