import {
  FilesetResolver,
  HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

let handLandmarker = null;
let lastVideoTime = -1;
let results = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });
}

async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function drawStar(x, y, outerRadius = 32, innerRadius = 14, points = 5) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const sx = Math.cos(angle) * radius;
    const sy = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(sx, sy);
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  ctx.closePath();

  ctx.shadowColor = "rgba(255, 230, 80, 0.95)";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "rgba(255, 220, 70, 0.95)";
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.stroke();

  ctx.restore();
}

function drawPinchEffect(x, y) {
  drawStar(x, y);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 240, 120, 0.3)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function normalizedToCanvas(point) {
  return {
    x: (1 - point.x) * canvas.width,
    y: point.y * canvas.height
  };
}

function detectPinch(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const pinchDistance = distance(thumbTip, indexTip);
  const isPinching = pinchDistance < 0.05;

  return {
    isPinching,
    thumbTip,
    indexTip
  };
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (
    handLandmarker &&
    video.readyState >= 2 &&
    video.currentTime !== lastVideoTime
  ) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, performance.now());
  }

  if (results && results.landmarks && results.landmarks.length > 0) {
    const landmarks = results.landmarks[0];
    const pinch = detectPinch(landmarks);

    if (pinch.isPinching) {
      const thumb = normalizedToCanvas(pinch.thumbTip);
      const index = normalizedToCanvas(pinch.indexTip);

      const centerX = (thumb.x + index.x) / 2;
      const centerY = (thumb.y + index.y) / 2;

      drawPinchEffect(centerX, centerY);
    }
  }

  requestAnimationFrame(render);
}

async function main() {
  try {
    await setupCamera();
    await createHandLandmarker();
    render();
  } catch (error) {
    console.error(error);

    const message = document.createElement("div");
    message.style.position = "fixed";
    message.style.inset = "0";
    message.style.display = "grid";
    message.style.placeItems = "center";
    message.style.background = "black";
    message.style.color = "white";
    message.style.zIndex = "20";
    message.style.padding = "24px";
    message.style.textAlign = "center";
    message.innerHTML = `
      <div>
        <h2>Camera setup failed</h2>
        <p>Make sure camera access is allowed and open this over HTTPS or GitHub Pages.</p>
      </div>
    `;
    document.body.appendChild(message);
  }
}

main();
