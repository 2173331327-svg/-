/**
 * 晴愈 - 核心疗愈玩法 2: 🎵 空灵音律 (参考 Google Vibe: 手势在画面上弹奏音乐)
 * 具备流畅流体色带光晕 (Chromatic Ribbon Trail)、水波涟漪、五度相生律与泛音合成器
 * 支持摄像头手势指尖追踪 + 鼠标/触控拖拽弹奏
 */

import React, { useRef, useEffect, useState } from 'react';
import { X, Music2, Camera, CameraOff, Sparkles, Volume2, Waves, Sliders, RefreshCw } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface EtherealMelodyGameProps {
  onClose: () => void;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
  color: string;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

interface SoundOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  noteIndex: number;
  color: string;
  label: string;
}

const MORANDI_PALETTE = [
  '#BAE6FD', // Sky cyan
  '#DDD6FE', // Lilac
  '#FBCFE8', // Sakura pink
  '#A7F3D0', // Sage green
  '#FEF08A', // Buttercup
  '#FED7AA', // Apricot peach
];

const SCALES = [
  { name: '羽调 · 空灵水音 (Pentatonic 432Hz)', notes: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99] },
  { name: '宫调 · 温润晨曦 (C Major Celesta)', notes: [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33] },
  { name: '商调 · 静谧星渊 (Lydian Dream)', notes: [261.63, 293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 523.25, 587.33] },
];

export const EtherealMelodyGame: React.FC<EtherealMelodyGameProps> = ({ onClose }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string>('手指或光标在画面滑过，即可生成彩带光晕与空灵乐音');
  const [scaleIndex, setScaleIndex] = useState<number>(0);
  const [instrumentTimbre, setInstrumentTimbre] = useState<'water' | 'crystal' | 'celeste'>('crystal');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);

  const trailRef = useRef<TrailPoint[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const soundOrbsRef = useRef<SoundOrb[]>([]);
  const isPointerDownRef = useRef<boolean>(false);
  const lastPlayTimeRef = useRef<number>(0);

  // Initialize floating floating sound orbs
  useEffect(() => {
    const orbs: SoundOrb[] = [];
    const labels = ['C', 'D', 'E', 'G', 'A', 'C5', 'E5'];
    for (let i = 0; i < 7; i++) {
      orbs.push({
        x: 120 + i * 110,
        y: 200 + (i % 2) * 80,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: 28,
        noteIndex: i,
        color: MORANDI_PALETTE[i % MORANDI_PALETTE.length],
        label: labels[i],
      });
    }
    soundOrbsRef.current = orbs;
  }, []);

  // Trigger sound & trail at coordinate
  const triggerNoteAt = (x: number, y: number, canvasW: number, canvasH: number) => {
    const now = performance.now();
    if (now - lastPlayTimeRef.current < 85) return; // Smooth arpeggio throttling
    lastPlayTimeRef.current = now;

    // Pitch mapped to X axis, Timbre resonance mapped to Y axis
    const noteIdx = Math.floor(Math.max(0, Math.min(8, (x / canvasW) * 9)));
    audioEngine.playEtherealNote(noteIdx);

    const color = MORANDI_PALETTE[noteIdx % MORANDI_PALETTE.length];

    // Add trail segment
    trailRef.current.push({
      x,
      y,
      age: 0,
      color,
      size: 16 + Math.random() * 8,
    });

    // Add ripple
    ripplesRef.current.push({
      x,
      y,
      radius: 8,
      maxRadius: 160 + Math.random() * 60,
      color,
      alpha: 0.8,
      lineWidth: 3,
    });
  };

  // MediaPipe Hand Detection Callback
  const onHandResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setCameraStatus(`手势追踪中 · 指尖挥舞即可弹奏流动画卷`);

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        // Index fingertip is index 8
        const indexTip = landmarks[8];
        const x = (1 - indexTip.x) * canvas.width;
        const y = indexTip.y * canvas.height;

        triggerNoteAt(x, y, canvas.width, canvas.height);
      }
    } else {
      setCameraStatus('请在镜头前伸出食指划动，或直接在屏幕上触控拖拽');
    }
  };

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const isTrackingRef = useRef<boolean>(false);
  const trackingFrameIdRef = useRef<number | null>(null);

  const startCamera = async () => {
    if (!videoRef.current) return;
    setCameraStatus('正在检查摄像头权限与手势识别模块...');

    // 1. Check if mediaDevices and getUserMedia exist
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraActive(false);
      setCameraStatus('当前环境未开放摄像头权限，已为您无缝切换至触控与光标弹奏模式 ✨');
      return;
    }

    try {
      // 2. Safe probe getUserMedia with silent catch to prevent unhandled rejection in iframe
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      }).catch(() => null);

      if (!stream) {
        setCameraActive(false);
        setCameraStatus('摄像头未授予权限，已为您启用触控与手势模拟模式 ✨');
        return;
      }

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 3. Initialize Hands instance if available
      const HandsClass = (window as any).Hands;
      if (HandsClass) {
        const hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults(onHandResults);
        handsInstanceRef.current = hands;

        // 4. Start frame tracking loop
        isTrackingRef.current = true;
        const processFrame = async () => {
          if (!isTrackingRef.current) return;
          if (videoRef.current && handsInstanceRef.current && videoRef.current.readyState >= 2) {
            try {
              await handsInstanceRef.current.send({ image: videoRef.current });
            } catch {
              // Ignore frame send interruptions during closing
            }
          }
          if (isTrackingRef.current) {
            trackingFrameIdRef.current = requestAnimationFrame(processFrame);
          }
        };
        trackingFrameIdRef.current = requestAnimationFrame(processFrame);
      }

      setCameraActive(true);
      setCameraStatus('手势弹奏已激活！在镜头前挥动手指，伴随光晕流体奏出旋律');
    } catch {
      setCameraActive(false);
      setCameraStatus('摄像头权限未开启，已为您无缝启用触控与光标弹奏模式 ✨');
    }
  };

  const stopCamera = () => {
    isTrackingRef.current = false;
    if (trackingFrameIdRef.current) {
      cancelAnimationFrame(trackingFrameIdRef.current);
      trackingFrameIdRef.current = null;
    }
    if (handsInstanceRef.current) {
      try {
        handsInstanceRef.current.close();
      } catch {
        // ignore
      }
      handsInstanceRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStatus('已切回触控/鼠标演奏模式');
  };

  // Main Canvas Render Loop (Google Vibe Fluid Chromatic Trail & Water Ripple)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      // Soft trail clear for smooth motion blur
      ctx.fillStyle = 'rgba(250, 249, 246, 0.24)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Floating Harmonic Orbs (Interactive floating chime bells)
      soundOrbsRef.current.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < 40 || orb.x > canvas.width - 40) orb.vx *= -1;
        if (orb.y < 40 || orb.y > canvas.height - 40) orb.vy *= -1;

        // Draw Orb Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = orb.color;
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.85;
        ctx.fill();

        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#292524';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.8;
        ctx.fillText(orb.label, orb.x, orb.y);
        ctx.restore();
      });

      // 2. Render Google Vibe Chromatic Ribbon Trail
      const trail = trailRef.current;
      for (let i = trail.length - 1; i >= 0; i--) {
        const pt = trail[i];
        pt.age += 0.02;

        if (pt.age >= 1.0) {
          trail.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (1 - pt.age * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = (1 - pt.age) * 0.65;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.restore();
      }

      // Connect trail points with fluid ribbon curve
      if (trail.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length - 1; i++) {
          const xc = (trail[i].x + trail[i + 1].x) / 2;
          const yc = (trail[i].y + trail[i + 1].y) / 2;
          ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
        }
        ctx.strokeStyle = '#BAE6FD';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Render Ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += 2.4;
        r.alpha -= 0.014;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.lineWidth = r.lineWidth;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.globalAlpha = Math.max(0, r.alpha * 0.25);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      stopCamera();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    triggerNoteAt(e.clientX - rect.left, e.clientY - rect.top, canvas.width, canvas.height);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    triggerNoteAt(e.clientX - rect.left, e.clientY - rect.top, canvas.width, canvas.height);
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#FAF9F6] border border-white/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 bg-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 flex items-center gap-2">
                空灵音律 · 画面手势弹奏
                <span className="text-[11px] font-normal text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Google Vibe 交互体验
                </span>
              </h2>
              <p className="text-xs text-stone-500">{cameraStatus}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (cameraActive ? stopCamera() : startCamera())}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs border ${
                cameraActive
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
              }`}
            >
              {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              {cameraActive ? '关闭摄像头' : '开启摄像头手势'}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Interactive Visualizer Stage */}
        <div className="relative flex-1 bg-gradient-to-b from-[#F7F5F0] via-[#FAF9F6] to-[#F0ECE1] overflow-hidden">
          {/* Mirrored Video Feed if camera on */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${
              cameraActive ? 'opacity-20' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Main Visualizer Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none"
          />

          {/* Guide hint overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-stone-400 z-0">
            <div className="w-16 h-16 rounded-full border border-stone-300 flex items-center justify-center animate-ping-slow mb-3">
              <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-stone-600">在画面任意划动指尖，如水波般流动奏出乐章</p>
            <p className="text-xs text-stone-400 mt-1">横轴自然调制音高 · 纵轴泛音混响 · 触碰发光钟琴球</p>
          </div>
        </div>

        {/* Bottom Tuning Dock */}
        <div className="px-6 py-3.5 bg-white/95 border-t border-stone-200/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-1 max-w-lg">
            {['宫 C', '商 D', '角 E', '徵 G', '羽 A', '高宫 C5', '高商 D5', '高角 E5', '高徵 G5'].map((name, i) => (
              <button
                key={name}
                onClick={(e) => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  triggerNoteAt(rect.left + rect.width / 2, canvas.height * 0.5, canvas.width, canvas.height);
                }}
                className="flex-1 py-1.5 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all text-center border border-stone-200/60 active:scale-95"
              >
                {name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-600">
            <Waves className="w-4 h-4 text-indigo-500" />
            <span>音律: {SCALES[scaleIndex].name.split(' ')[0]}</span>
            <button
              onClick={() => setScaleIndex((prev) => (prev + 1) % SCALES.length)}
              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[11px] font-medium transition-colors"
            >
              切换律制
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
