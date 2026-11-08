/**
 * 晴愈 - 核心疗愈玩法 1: 🌿 手势控制种花 (参考: hand_gesture_interactive_garden)
 * 支持 MediaPipe 双手摄像头实时手势追踪 + 虚拟手势/触控双模式
 * 左手：大拇指碰食指(🌻向日葵)、中指(🌸樱花)、无名指(🌹玫瑰)、小指(🌵仙人掌) 下种
 * 右手：大拇指碰无名指(💧浇水发芽)、食指(☀️阳光促开花/结硕果🍎)、中指(⚡雷电净化)、小指(🌪️龙卷风吹拂)
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, CameraOff, Sparkles, Droplets, Sun, Zap, Wind, HelpCircle, RefreshCw } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface FlowerBloomGameProps {
  onClose: () => void;
  onPlantCompleted?: () => void;
}

interface SeedEntity {
  id: string;
  x: number;
  y: number;
  emoji: string;
  vy: number;
  vx: number;
  size: number;
}

interface WaterDropEntity {
  id: string;
  x: number;
  y: number;
  vy: number;
}

interface FlowerEntity {
  id: string;
  x: number;
  startY: number;
  targetY: number;
  currentY: number;
  emoji: string;
  growth: number;
  state: 'growing' | 'bloomed' | 'charred' | 'blowing_away';
  maxSize: number;
  alpha: number;
  vx: number;
  vy: number;
  rotation: number;
  name: string;
}

interface FruitEntity {
  id: string;
  x: number;
  y: number;
  emoji: string;
  vy: number;
}

interface WindParticleEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

const LEFT_FINGER_PLANTS: Record<string, { emoji: string; name: string }> = {
  index: { emoji: '🌻', name: '向日葵' },
  middle: { emoji: '🌸', name: '樱花' },
  ring: { emoji: '🌹', name: '玫瑰' },
  pinky: { emoji: '🌵', name: '仙人掌' },
};

const PLANT_NAMES: Record<string, string> = {
  '🌻': '向日葵',
  '🌸': '樱花',
  '🌹': '玫瑰',
  '🌵': '仙人掌',
};

export const FlowerBloomGame: React.FC<FlowerBloomGameProps> = ({ onClose, onPlantCompleted }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string>('摄像头未开启 (可使用下方手势按钮或直接触控)');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('双手在镜头前捏合指尖，或点击手势按钮开始播种与浇水');
  const [toastIcon, setToastIcon] = useState<string>('✨');

  // Video & Canvases
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);

  // Entities state in refs for 60fps render loop
  const activeSeedsRef = useRef<SeedEntity[]>([]);
  const activeWaterRef = useRef<WaterDropEntity[]>([]);
  const activeFlowersRef = useRef<FlowerEntity[]>([]);
  const activeFruitsRef = useRef<FruitEntity[]>([]);
  const activeWindRef = useRef<WindParticleEntity[]>([]);
  const lightningLineRef = useRef<{ startX: number; startY: number; endX: number; endY: number; createdAt: number } | null>(null);

  // Touch pinch debounce
  const touchStateRef = useRef({
    left: { index: false, middle: false, ring: false, pinky: false },
    right: { index: false, middle: false, ring: false, pinky: false },
  });

  const showToast = (text: string, icon = '✨') => {
    setToastMessage(text);
    setToastIcon(icon);
  };

  // Triggering actions from either Camera or Buttons
  const handleLeftFingerAction = (finger: 'index' | 'middle' | 'ring' | 'pinky', spawnX?: number, spawnY?: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const plant = LEFT_FINGER_PLANTS[finger];
    const x = spawnX !== undefined ? spawnX : (canvas.width * (0.2 + Math.random() * 0.3));
    const y = spawnY !== undefined ? spawnY : 120;

    activeSeedsRef.current.push({
      id: 'seed_' + Date.now() + Math.random(),
      x,
      y,
      emoji: plant.emoji,
      vy: 2.8 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 1.5,
      size: 24,
    });

    audioEngine.playPlantSeedSound();
    showToast(`播撒【${plant.name} ${plant.emoji}】花种`, plant.emoji);
  };

  const handleRightFingerAction = (action: 'water' | 'sun' | 'lightning' | 'wind', spawnX?: number, spawnY?: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    if (action === 'water') {
      // Drop water drops & fertilize
      const x = spawnX !== undefined ? spawnX : (canvas.width * (0.5 + Math.random() * 0.3));
      const y = spawnY !== undefined ? spawnY : 120;
      activeWaterRef.current.push({
        id: 'water_' + Date.now() + Math.random(),
        x,
        y,
        vy: 6.5 + Math.random() * 3,
      });

      audioEngine.playWaterDropSound();
      showToast('甘霖水滴 💧 注入土壤，滋润萌芽', '💧');

      // Fertilize seeds
      if (activeSeedsRef.current.length > 0) {
        const seed = activeSeedsRef.current.shift()!;
        activeFlowersRef.current.push({
          id: 'fl_' + Date.now() + Math.random(),
          x: seed.x,
          startY: canvas.height + 40,
          targetY: canvas.height - 80,
          currentY: canvas.height + 40,
          emoji: seed.emoji,
          growth: 0,
          state: 'growing',
          maxSize: 64,
          alpha: 1.0,
          vx: 0,
          vy: 0,
          rotation: 0,
          name: PLANT_NAMES[seed.emoji] || '心象之花',
        });
      }
    } else if (action === 'sun') {
      // Sun magic: bloom all seeds or drop fruits
      let droppedFruit = false;
      activeFlowersRef.current.forEach((fl) => {
        if (fl.state === 'bloomed') {
          activeFruitsRef.current.push({
            id: 'fruit_' + Date.now() + Math.random(),
            x: fl.x,
            y: fl.currentY - 35,
            emoji: '🍎',
            vy: 4.5 + Math.random() * 2,
          });
          audioEngine.playFruitPopSound();
          droppedFruit = true;
        }
      });

      if (droppedFruit) {
        showToast('太阳魔法 ☀️：已结出丰硕果实！', '🍎');
      } else if (activeSeedsRef.current.length > 0) {
        activeSeedsRef.current.forEach((seed) => {
          activeFlowersRef.current.push({
            id: 'fl_' + Date.now() + Math.random(),
            x: seed.x,
            startY: canvas.height + 40,
            targetY: canvas.height - 80,
            currentY: canvas.height + 40,
            emoji: seed.emoji,
            growth: 0,
            state: 'growing',
            maxSize: 64,
            alpha: 1.0,
            vx: 0,
            vy: 0,
            rotation: 0,
            name: PLANT_NAMES[seed.emoji] || '心象之花',
          });
        });
        activeSeedsRef.current = [];
        audioEngine.playBloomSound();
        showToast('温暖阳光 ☀️：种子吸饱能量，瞬间抽芽绽放！', '☀️');
      } else {
        showToast('和煦日光洒落 ☀️', '☀️');
      }
    } else if (action === 'lightning') {
      // Lightning strike
      const startX = spawnX !== undefined ? spawnX : canvas.width * 0.5;
      lightningLineRef.current = {
        startX,
        startY: 20,
        endX: startX + (Math.random() - 0.5) * 80,
        endY: canvas.height - 40,
        createdAt: performance.now(),
      };
      audioEngine.playLightningCrackSound();

      // Cleanse charred flowers or unbloomed seeds
      activeFlowersRef.current.forEach((fl) => {
        fl.state = 'charred';
      });
      activeSeedsRef.current = [];
      showToast('雷电轰鸣 ⚡：重置并洗礼花园！', '⚡');
    } else if (action === 'wind') {
      // Tornado wind gust
      audioEngine.playWindGustSound();
      for (let i = 0; i < 10; i++) {
        activeWindRef.current.push({
          id: 'wind_' + Date.now() + Math.random(),
          x: -20,
          y: Math.random() * canvas.height,
          vx: 8 + Math.random() * 9,
          vy: (Math.random() - 0.5) * 2.5,
          size: 14 + Math.random() * 18,
          alpha: 0.75,
        });
      }

      activeFlowersRef.current.forEach((fl) => {
        if (fl.state === 'bloomed' || fl.state === 'growing') {
          fl.state = 'blowing_away';
          fl.vx = 8 + Math.random() * 6;
          fl.vy = -3 - Math.random() * 4;
        }
      });
      activeSeedsRef.current.forEach((seed) => {
        seed.vx = 7 + Math.random() * 5;
        seed.vy = -1;
      });

      showToast('柔风吹拂 🌪️：花瓣与思绪随风自由飘散！', '🌪️');
    }
  };

  // Start MediaPipe Hands & Camera safely with graceful permission handling
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const isTrackingRef = useRef<boolean>(false);
  const trackingFrameIdRef = useRef<number | null>(null);

  const startCamera = async () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;
    setCameraStatus('正在检查摄像头权限与手势识别模块...');

    // 1. Check if mediaDevices and getUserMedia exist in the current environment
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraActive(false);
      setCameraStatus('当前环境未开放摄像头权限，已自动启用触控手势模式 ✨');
      showToast('当前环境未开放摄像头，已为您启用触控手势模式 ✨', '🖐️');
      return;
    }

    try {
      // 2. Safe probe getUserMedia with silent catch to prevent unhandled rejection in iframe
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      }).catch(() => null);

      if (!stream) {
        setCameraActive(false);
        setCameraStatus('摄像头未授予权限，已为您启用全套手势模拟与触控模式 ✨');
        showToast('已无缝启用触控与手势模式，点击屏幕或下方按钮直接游玩 ✨', '🖐️');
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
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
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
      setCameraStatus('摄像头已开启 · 展示双手即可灵敏触发手势');
      showToast('手势识别已就绪！在镜头前将大拇指与各指尖捏合', '🖐️');
    } catch {
      setCameraActive(false);
      setCameraStatus('摄像头未授予权限，已启用全套手势模拟面板');
      showToast('已为您切换至触控与手势模拟模式 ✨', '🖐️');
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
    setCameraStatus('摄像头已关闭 · 切换至虚拟手势触控模式');
  };

  // MediaPipe Hand Detection Callback
  const onHandResults = (results: any) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw hand badges on tips
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setCameraStatus(`已锁定 ${results.multiHandLandmarks.length} 只手 · 捏合指尖进行施法`);

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i]?.label || 'Left';
        // Invert X because video is mirrored
        const normalized = landmarks.map((lm: any) => ({
          x: (1 - lm.x) * canvas.width,
          y: lm.y * canvas.height,
        }));

        const isLeft = handedness === 'Left';
        const thumb = normalized[4];
        const fingerTips: Record<'index' | 'middle' | 'ring' | 'pinky', { x: number; y: number }> = {
          index: normalized[8],
          middle: normalized[12],
          ring: normalized[16],
          pinky: normalized[20],
        };

        // Draw fingertip markers
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Thumb dot
        ctx.beginPath();
        ctx.arc(thumb.x, thumb.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        (Object.keys(fingerTips) as ('index' | 'middle' | 'ring' | 'pinky')[]).forEach((finger) => {
          const pt = fingerTips[finger];
          const dist = Math.hypot(thumb.x - pt.x, thumb.y - pt.y);
          const isPinching = dist < 42;

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = isLeft ? 'rgba(16, 185, 129, 0.35)' : 'rgba(6, 182, 212, 0.35)';
          ctx.fill();

          ctx.font = '24px sans-serif';
          const emoji = isLeft
            ? LEFT_FINGER_PLANTS[finger].emoji
            : finger === 'ring' ? '💧' : finger === 'index' ? '☀️' : finger === 'middle' ? '⚡' : '🌪️';
          ctx.fillText(emoji, pt.x, pt.y);

          // Pinch trigger detection
          const stateObj = isLeft ? touchStateRef.current.left : touchStateRef.current.right;
          if (isPinching) {
            if (!stateObj[finger]) {
              stateObj[finger] = true;
              if (isLeft) {
                handleLeftFingerAction(finger, pt.x, pt.y);
              } else {
                const act = finger === 'ring' ? 'water' : finger === 'index' ? 'sun' : finger === 'middle' ? 'lightning' : 'wind';
                handleRightFingerAction(act, pt.x, pt.y);
              }
            }
          } else {
            stateObj[finger] = false;
          }
        });

        ctx.restore();
      }
    } else {
      setCameraStatus('请在镜头前展示双手...');
    }
  };

  // 60FPS Game Simulation Rendering Loop
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
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

    const loop = () => {
      // Clear overlay canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw lightning if active
      if (lightningLineRef.current) {
        const line = lightningLineRef.current;
        const age = performance.now() - line.createdAt;
        if (age < 280) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(line.startX, line.startY);

          const steps = 10;
          let cx = line.startX;
          let cy = line.startY;
          const dx = (line.endX - line.startX) / steps;
          const dy = (line.endY - line.startY) / steps;

          for (let i = 1; i < steps; i++) {
            cx += dx + (Math.random() - 0.5) * 35;
            cy += dy + (Math.random() - 0.5) * 20;
            ctx.lineTo(cx, cy);
          }
          ctx.lineTo(line.endX, line.endY);
          ctx.strokeStyle = '#93C5FD';
          ctx.lineWidth = 4;
          ctx.globalAlpha = 1 - age / 280;
          ctx.shadowColor = '#60A5FA';
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.restore();
        } else {
          lightningLineRef.current = null;
        }
      }

      // 2. Update and Draw Seeds
      for (let i = activeSeedsRef.current.length - 1; i >= 0; i--) {
        const seed = activeSeedsRef.current[i];
        seed.y += seed.vy;
        seed.x += seed.vx;

        // Draw seed bubble
        ctx.beginPath();
        ctx.arc(seed.x, seed.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seed.emoji, seed.x, seed.y);

        if (seed.y > canvas.height) {
          activeSeedsRef.current.splice(i, 1);
        }
      }

      // 3. Update and Draw Water Drops
      for (let i = activeWaterRef.current.length - 1; i >= 0; i--) {
        const water = activeWaterRef.current[i];
        water.y += water.vy;

        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💧', water.x, water.y);

        if (water.y > canvas.height) {
          activeWaterRef.current.splice(i, 1);
        }
      }

      // 4. Update and Draw Flowers
      for (let i = activeFlowersRef.current.length - 1; i >= 0; i--) {
        const fl = activeFlowersRef.current[i];
        if (fl.state === 'growing') {
          fl.growth += 0.025;
          fl.currentY = fl.startY - (fl.startY - fl.targetY) * Math.min(1, fl.growth);
          if (fl.growth >= 1) {
            fl.state = 'bloomed';
            audioEngine.playBloomSound();
            if (onPlantCompleted) onPlantCompleted();
          }
        } else if (fl.state === 'blowing_away') {
          fl.x += fl.vx;
          fl.currentY += fl.vy;
          fl.rotation += 0.08;
          fl.alpha -= 0.015;
          if (fl.alpha <= 0) {
            activeFlowersRef.current.splice(i, 1);
            continue;
          }
        } else if (fl.state === 'charred') {
          fl.alpha -= 0.02;
          if (fl.alpha <= 0) {
            activeFlowersRef.current.splice(i, 1);
            continue;
          }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, fl.alpha);
        ctx.translate(fl.x, fl.currentY);
        ctx.rotate(fl.rotation);

        if (fl.state !== 'blowing_away') {
          // Stems
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, canvas.height - fl.currentY);
          ctx.strokeStyle = fl.state === 'charred' ? '#1f2937' : '#16a34a';
          ctx.lineWidth = 6;
          ctx.stroke();

          // Leaves
          if (fl.growth > 0.4 && fl.state !== 'charred') {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.ellipse(-14, 20, 12, 6, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(14, 32, 12, 6, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Blossom Head
        const currentSize = Math.max(12, fl.maxSize * Math.min(1, fl.growth));
        ctx.font = `${currentSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (fl.state === 'charred') {
          ctx.fillText('🖤', 0, -10);
        } else {
          ctx.fillText(fl.emoji, 0, -10);
        }

        ctx.restore();
      }

      // 5. Update and Draw Fruits
      for (let i = activeFruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = activeFruitsRef.current[i];
        fruit.y += fruit.vy;

        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, fruit.x, fruit.y);

        if (fruit.y > canvas.height) {
          activeFruitsRef.current.splice(i, 1);
        }
      }

      // 6. Update and Draw Wind
      for (let i = activeWindRef.current.length - 1; i >= 0; i--) {
        const w = activeWindRef.current[i];
        w.x += w.vx;
        w.y += w.vy;
        w.alpha -= 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, w.alpha);
        ctx.font = `${w.size}px sans-serif`;
        ctx.fillText('💨', w.x, w.y);
        ctx.restore();

        if (w.x > canvas.width || w.alpha <= 0) {
          activeWindRef.current.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#FAF9F6] border border-white/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 bg-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <span className="text-xl">🌿</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 flex items-center gap-2">
                指尖生花 · 魔法手势花园
                <span className="text-[11px] font-normal text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  MediaPipe 手势与掌控感
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                {cameraStatus}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (cameraActive ? stopCamera() : startCamera())}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs border ${
                cameraActive
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'
              }`}
            >
              {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              {cameraActive ? '关闭摄像头' : '开启摄像头手势'}
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
              title="手势指南"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Garden Stage: Video background when camera active, canvas on top */}
        <div className="relative flex-1 bg-gradient-to-b from-[#F5F3EF] via-[#EAE6DD] to-[#DDD7CB] overflow-hidden">
          {/* Mirrored Video Stream if camera active */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${
              cameraActive ? 'opacity-30' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Interactive Simulation 2D Canvas */}
          <canvas
            ref={overlayCanvasRef}
            onClick={(e) => {
              // Click to drop water on click position
              const rect = e.currentTarget.getBoundingClientRect();
              handleRightFingerAction('water', e.clientX - rect.left, e.clientY - rect.top);
            }}
            className="absolute inset-0 w-full h-full cursor-pointer z-10"
          />

          {/* Hand Gesture Legend Side Drawer */}
          {showGuide && (
            <div className="absolute top-4 right-4 z-30 w-80 max-h-[calc(100%-2rem)] bg-white/95 border border-stone-200 p-4 rounded-3xl shadow-xl overflow-y-auto space-y-3 animate-fade-in text-xs text-stone-700">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 font-bold text-stone-800">
                <span>魔法手势指南 (参考文件)</span>
                <button onClick={() => setShowGuide(false)} className="text-stone-400 hover:text-stone-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="font-semibold text-emerald-700 block mb-1">左手：植物选择与下种</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">🌻 食指：向日葵</div>
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">🌸 中指：樱花</div>
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">🌹 无名指：玫瑰</div>
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">🌵 小拇指：仙人掌</div>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">💡 大拇指触碰左手对应指尖，种子即飘落土壤</p>
              </div>

              <div>
                <span className="font-semibold text-sky-700 block mb-1">右手：自然元素与魔法催化</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">☀️ 食指：阳光 / 果实</div>
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">⚡ 中指：雷电洗礼</div>
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">💧 无名指：水滴灌溉</div>
                  <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/60">🌪️ 小指：微风吹拂</div>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">💧 大拇指触碰无名指浇水使种子抽芽盛开！</p>
              </div>
            </div>
          )}

          {/* Central Toast */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none z-20">
            <div className="bg-white/90 border border-stone-200/80 px-4 py-2 rounded-full shadow-lg text-xs font-medium text-stone-800 flex items-center gap-2">
              <span>{toastIcon}</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Gesture Dock (Ensures 100% full interaction with or without camera) */}
        <div className="px-6 py-3.5 bg-white/95 border-t border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left Hand Seeds buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-emerald-800 mr-1 flex items-center gap-1">
              <span>🌱</span>
              左手选种:
            </span>
            {(['index', 'middle', 'ring', 'pinky'] as const).map((finger) => {
              const plant = LEFT_FINGER_PLANTS[finger];
              return (
                <button
                  key={finger}
                  onClick={() => handleLeftFingerAction(finger)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                >
                  <span className="text-base">{plant.emoji}</span>
                  <span>{plant.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Hand Elements buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-sky-800 mr-1 flex items-center gap-1">
              <span>✨</span>
              右手元素:
            </span>
            <button
              onClick={() => handleRightFingerAction('water')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 transition-all flex items-center gap-1 active:scale-95"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-600" />
              <span>💧 浇水促开</span>
            </button>
            <button
              onClick={() => handleRightFingerAction('sun')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1 active:scale-95"
            >
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>☀️ 阳光结实</span>
            </button>
            <button
              onClick={() => handleRightFingerAction('lightning')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>⚡ 雷电洗礼</span>
            </button>
            <button
              onClick={() => handleRightFingerAction('wind')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200 transition-all flex items-center gap-1 active:scale-95"
            >
              <Wind className="w-3.5 h-3.5 text-teal-600" />
              <span>🌪️ 微风飘散</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
