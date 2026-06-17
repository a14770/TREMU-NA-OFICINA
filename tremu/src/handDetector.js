import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let handLandmarker = undefined;

// ─── 1. Carregar o modelo de Inteligência Artificial ──────────────────────────
export async function criarDetectorDeMao() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
  
  return handLandmarker;
}

// ─── 2. Classificar gesto detectado ──────────────────────────────────────────
export function classificarGesto(landmarks, dataset = { exemplos: [] }) {
  if (!landmarks || landmarks.length === 0) {
    return { letra: null, candidatos: [] };
  }

  const pontos = landmarks[0];
  const pontoNormalizado = normalizarLandmarks(pontos);
  const exemplos = dataset.exemplos || [];

  if (exemplos.length === 0) {
    return { letra: null, candidatos: [] };
  }

  const resultados = exemplos.map((exemplo) => {
    const exemploNormalizado = normalizarLandmarks(exemplo.keypoints);
    const distancia = compararLandmarks(pontoNormalizado, exemploNormalizado);
    return {
      letra: exemplo.letra,
      distancia,
    };
  });

  resultados.sort((a, b) => a.distancia - b.distancia);

  const melhor = resultados[0];
  const candidatos = resultados.slice(0, 5).map((item) => ({
    letra: item.letra,
    score: Math.max(0, 1 - item.distancia),
  }));

  const limiar = 0.12;
  if (melhor && melhor.distancia <= limiar) {
    return {
      letra: melhor.letra,
      candidatos,
    };
  }

  return {
    letra: null,
    candidatos,
  };
}

function normalizarLandmarks(pontos) {
  const arr = pontos.map((p) => ({ x: p.x, y: p.y }));
  const cx = arr.reduce((sum, p) => sum + p.x, 0) / arr.length;
  const cy = arr.reduce((sum, p) => sum + p.y, 0) / arr.length;
  const diffs = arr.map((p) => ({ x: p.x - cx, y: p.y - cy }));
  const maior = Math.max(
    ...diffs.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))),
    1e-6
  );
  return diffs.map((p) => ({ x: p.x / maior, y: p.y / maior }));
}

function compararLandmarks(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let soma = 0;
  for (let i = 0; i < a.length; i += 1) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    soma += dx * dx + dy * dy;
  }
  return Math.sqrt(soma / a.length);
}

// ─── 3. Desenhar pontos das mãos no canvas ───────────────────────────────────
function desenharPontos(ctx, marcos, canvas) {
  ctx.fillStyle = "#00FF00"; // Cor verde para os pontos
  for (const ponto of marcos) {
    const x = ponto.x * canvas.width;
    const y = ponto.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export function desenharMao(canvas, video, landmarks) {
  if (!canvas || !video) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Garantir que o canvas tem dimensões válidas
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;
  
  // Limpar o canvas e desenhar a imagem da webcam por trás
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Se encontrar mãos, desenhar os pontos
  if (landmarks && landmarks.length > 0) {
    for (const marcos of landmarks) {
      desenharPontos(ctx, marcos, canvas);
    }
  }
}

// ─── 4. Função auxiliar para detectar em cada frame ──────────────────────────
export function detectarMao(video, tempoAtual) {
  if (!handLandmarker || !video) {
    return null;
  }
  
  try {
    const resultados = handLandmarker.detectForVideo(video, tempoAtual);
    return resultados.landmarks || [];
  } catch (erro) {
    console.error("Erro na detecção:", erro);
    return [];
  }
}

function _desenharPainel(ctx, W, H, letraDetectada) {
  const PAD    = 12
  const W_BOX  = 120
  const H_BOX  = 64
  const x      = W - W_BOX - PAD
  const y      = PAD
  const radius = 10

  // Fundo com blur/escurecimento
  ctx.save()
  ctx.globalAlpha = 0.78
  ctx.fillStyle   = '#111827'
  _roundRect(ctx, x, y, W_BOX, H_BOX, radius)
  ctx.fill()
  ctx.restore()

  // Borda
  ctx.save()
  ctx.globalAlpha  = 0.9
  ctx.strokeStyle  = letraDetectada ? '#FFD23F' : 'rgba(255,255,255,0.2)'
  ctx.lineWidth    = 1.5
  _roundRect(ctx, x, y, W_BOX, H_BOX, radius)
  ctx.stroke()
  ctx.restore()

  // Label pequeno
  ctx.save()
  ctx.globalAlpha  = 0.65
  ctx.fillStyle    = '#9CA3AF'
  ctx.font         = '700 10px system-ui, sans-serif'
  ctx.letterSpacing = '0.08em'
  ctx.textAlign    = 'center'
  ctx.fillText('LETRA', x + W_BOX / 2, y + 18)
  ctx.restore()

  // Letra grande
  ctx.save()
  ctx.fillStyle = letraDetectada ? '#FFD23F' : 'rgba(255,255,255,0.25)'
  ctx.font      = `700 ${letraDetectada ? 34 : 28}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (letraDetectada) {
    ctx.shadowColor = '#FFD23F'
    ctx.shadowBlur  = 12
  }
  ctx.fillText(letraDetectada || '—', x + W_BOX / 2, y + H_BOX / 2 + 8)
  ctx.restore()
}

// ─── Utilitário: rectângulo com cantos arredondados ───────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
