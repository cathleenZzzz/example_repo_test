import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("status");

let handLandmarker;
let stream;
let animationFrameId;
let lastVideoTime = -1;

const PINCH_THRESHOLD = 0.055;
const RELEASE_THRESHOLD = 0.075;
let pinchActive = false;

function setStatus(message) {
  statusText.textContent = message;
}

async function createHandLandmarker() {
  setStatus("Loading hand tracking model…");

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  setStatus("Model ready. Click Start camera.");
}

function resizeCanvasToVideo() {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return;

  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function normalizedToCanvas(landmark) {
  return {
    x: (1 - landmark.x) * canvas.width,
    y: landmark.y * canvas.height,
  };
}

function drawStar(x, y, outerRadius, innerRadius, spikes = 5) {
  let rotation = Math.PI / 2 * 3;
  let step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);

  for (let i = 0; i < spikes; i += 1) {
    ctx.lineTo(
      x + Math.cos(rotation) * outerRadius,
      y + Math.sin(rotation) * outerRadius
    );
    rotation += step;

    ctx.lineTo(
      x + Math.cos(rotation) * innerRadius,
      y + Math.sin(rotation) * innerRadius
    );
    rotation += step;
  }

  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(x, y, 2, x, y, outerRadius * 1.4);
  gradient.addColorStop(0, "rgba(255, 246, 150, 1)");
  gradient.addColorStop(0.45, "rgba(255, 214, 74, 0.98)");
  gradient.addColorStop(1, "rgba(255, 135, 0, 0.1)");

  ctx.shadowColor = "rgba(255, 215, 0, 0.9)";
  ctx.shadowBlur = outerRadius * 0.7;
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = Math.max(2, outerRadius * 0.08);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.stroke();
  ctx.restore();
}

function drawPinchEffect(thumbTip, indexTip) {
  const thumb = normalizedToCanvas(thumbTip);
  const index = normalizedToCanvas(indexTip);
  const centerX = (thumb.x + index.x) / 2;
  const centerY = (thumb.y + index.y) / 2;
  const fingerGap = Math.max(18, Math.hypot(index.x - thumb.x, index.y - thumb.y));
  const outerRadius = Math.max(18, Math.min(50, fingerGap * 0.9));

  drawStar(centerX, centerY, outerRadius, outerRadius * 0.45);
}

function processFrame() {
  animationFrameId = requestAnimationFrame(processFrame);
  if (!handLandmarker || video.readyState < 2) return;

  resizeCanvasToVideo();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;

  const nowInMs = performance.now();
  const result = handLandmarker.detectForVideo(video, nowInMs);

  if (!result.landmarks?.length) {
    pinchActive = false;
    setStatus("Show one hand to the camera.");
    return;
  }

  const landmarks = result.landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const pinchDistance = distance(thumbTip, indexTip);

  if (!pinchActive && pinchDistance < PINCH_THRESHOLD) {
    pinchActive = true;
  } else if (pinchActive && pinchDistance > RELEASE_THRESHOLD) {
    pinchActive = false;
  }

  if (pinchActive) {
    drawPinchEffect(thumbTip, indexTip);
    setStatus("Pinch detected ✨");
  } else {
    setStatus("Pinch thumb + index finger to create a star.");
  }
}

async function startCamera() {
  startButton.disabled = true;

  try {
    if (!handLandmarker) {
      await createHandLandmarker();
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    setStatus("Camera ready. Pinch to summon the star.");

    cancelAnimationFrame(animationFrameId);
    lastVideoTime = -1;
    processFrame();
  } catch (error) {
    console.error(error);
    setStatus(
      "Camera or model setup failed. Open this on GitHub Pages or another HTTPS site and allow camera access."
    );
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", startCamera);
createHandLandmarker().catch((error) => {
  console.error(error);
  setStatus("Could not load the hand tracking model.");
});
