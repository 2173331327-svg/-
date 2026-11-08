/**
 * 晴愈 - 核心疗愈玩法 4: 🌌 白噪音与动态光点图冥想
 * 灵感汲取自梦幻童话心象意境 (参考附图)，结合多轨天然白噪音与动态光点星象图
 * 包含：双侧眼动脱敏 (EMDR)、曼陀罗星轨呼吸图 (Mandala Constellation)、深海荧火流光
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Moon, Volume2, Play, Pause, Clock, Sparkles, Eye, Compass, Layers } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface WhiteNoiseEmdrGameProps {
  onClose: () => void;
}

interface SoundTrack {
  id: string;
  name: string;
  icon: string;
  volume: number;
}

type VisualMode = 'emdr_bilateral' | 'constellation_map' | 'firefly_flow';

interface StarlightNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  phase: number;
}

const DREAMY_PASTEL_COLORS = [
  '#BAE6FD', // Cloud blue
  '#FBCFE8', // Sakura rose
  '#DDD6FE', // Dreamy violet
  '#FEF08A', // Starlight yellow
  '#A7F3D0', // Mint glow
  '#FED7AA', // Warm peach
];

export const WhiteNoiseEmdrGame: React.FC<WhiteNoiseEmdrGameProps> = ({ onClose }) => {
  const [tracks, setTracks] = useState<SoundTrack[]>([
    { id: 'rain', name: '青瓦细雨', icon: '🌧️', volume: 0.55 },
    { id: 'ocean', name: '夜幕海潮', icon: '🌊', volume: 0.35 },
    { id: 'wind', name: '幽谷清风', icon: '🍃', volume: 0.25 },
    { id: 'bowl', name: '静心颂钵', icon: '🔔', volume: 0.4 },
    { id: 'fire', name: '暖心篝火', icon: '🪵', volume: 0.0 },
  ]);

  const [visualMode, setVisualMode] = useState<VisualMode>('constellation_map');
  const [emdrSpeed, setEmdrSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [meditationDuration, setMeditationDuration] = useState<number>(300);
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [isMeditating, setIsMeditating] = useState<boolean>(true);

  // EMDR Tracking ball
  const [ballX, setBallX] = useState<number>(50);
  const directionRef = useRef<number>(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starlightNodesRef = useRef<StarlightNode[]>([]);

  // Initialize Constellation Light Points
  useEffect(() => {
    const nodes: StarlightNode[] = [];
    const count = 72;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 60 + (i % 6) * 45;
      nodes.push({
        x: 0,
        y: 0,
        baseX: Math.cos(angle) * dist,
        baseY: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 2 + Math.random() * 3.5,
        color: DREAMY_PASTEL_COLORS[i % DREAMY_PASTEL_COLORS.length],
        alpha: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    starlightNodesRef.current = nodes;
  }, []);

  // Sync white noise audio with audio engine
  useEffect(() => {
    tracks.forEach((t) => {
      audioEngine.setTrackVolume(t.id, isMeditating ? t.volume : 0);
    });

    return () => {
      audioEngine.stopAllTracks();
    };
  }, [isMeditating]);

  const handleVolumeChange = (trackId: string, val: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: val } : t))
    );
    if (isMeditating) {
      audioEngine.setTrackVolume(trackId, val);
    }
  };

  // EMDR Horizontal Movement Tick
  useEffect(() => {
    if (visualMode !== 'emdr_bilateral' || !isMeditating) return;

    const speedStep = emdrSpeed === 'slow' ? 0.38 : emdrSpeed === 'medium' ? 0.65 : 0.98;
    let frameId = 0;

    const step = () => {
      setBallX((prev) => {
        let next = prev + directionRef.current * speedStep;
        if (next >= 92) {
          next = 92;
          directionRef.current = -1;
          audioEngine.playEmdrPulse(0.9);
        } else if (next <= 8) {
          next = 8;
          directionRef.current = 1;
          audioEngine.playEmdrPulse(-0.9);
        }
        return next;
      });
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [visualMode, emdrSpeed, isMeditating]);

  // Dynamic Starlight Point Map & Bioluminescent Firefly Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      time += 0.015;

      // Deep tranquil space gradient clear
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const nodes = starlightNodesRef.current;

      if (visualMode === 'constellation_map') {
        // Draw Sacred Geometry Constellation Point Map with harmonic breathing expansion
        const breathScale = 1.0 + Math.sin(time * 0.8) * 0.18;

        // Draw connecting constellation lines
        ctx.save();
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          const x1 = cx + (n1.baseX + Math.sin(time + n1.phase) * 15) * breathScale;
          const y1 = cy + (n1.baseY + Math.cos(time + n1.phase) * 15) * breathScale;
          n1.x = x1;
          n1.y = y1;

          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
            if (dist < 85) {
              ctx.beginPath();
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.strokeStyle = '#BAE6FD';
              ctx.globalAlpha = (1 - dist / 85) * 0.25;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }

          // Draw Glowing Starlight Node
          ctx.beginPath();
          ctx.arc(n1.x, n1.y, n1.radius * (1 + Math.sin(time * 2 + n1.phase) * 0.3), 0, Math.PI * 2);
          ctx.fillStyle = n1.color;
          ctx.globalAlpha = n1.alpha * (0.7 + Math.sin(time + n1.phase) * 0.3);
          ctx.shadowColor = n1.color;
          ctx.shadowBlur = 14;
          ctx.fill();
        }
        ctx.restore();
      } else if (visualMode === 'firefly_flow') {
        // Deep bioluminescent fireflies roaming smoothly
        ctx.save();
        nodes.forEach((n) => {
          n.baseX += n.vx;
          n.baseY += n.vy;

          if (Math.abs(n.baseX) > cx * 0.9) n.vx *= -1;
          if (Math.abs(n.baseY) > cy * 0.8) n.vy *= -1;

          const px = cx + n.baseX;
          const py = cy + n.baseY;

          ctx.beginPath();
          ctx.arc(px, py, n.radius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.globalAlpha = 0.65 + Math.sin(time * 2 + n.phase) * 0.3;
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 18;
          ctx.fill();
        });
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [visualMode]);

  // Timer countdown
  useEffect(() => {
    if (!isMeditating) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          audioEngine.playBloomSound();
          setIsMeditating(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMeditating]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#FAF9F6] border border-white/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 bg-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 flex items-center gap-2">
                白噪音与动态光点图冥想
                <span className="text-[11px] font-normal text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  星象微光 · 脑波谐振
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                双耳水木白噪音立体环绕 · 视线跟随动态光点舒缓起伏，卸除心智超载
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMeditating(!isMeditating)}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isMeditating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isMeditating ? '暂停' : '开始'}
            </button>
            <button
              onClick={() => {
                audioEngine.stopAllTracks();
                onClose();
              }}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Visual Starlight Point Map & EMDR Arena */}
        <div className="relative flex-1 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] flex flex-col items-center justify-between p-6 overflow-hidden">
          {/* Visual Mode Selector Tabs */}
          <div className="z-20 flex items-center gap-1.5 p-1 bg-stone-800/80 border border-stone-700 rounded-2xl shadow-lg">
            <button
              onClick={() => setVisualMode('constellation_map')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                visualMode === 'constellation_map'
                  ? 'bg-amber-400 text-stone-900 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>动态星象图 (Constellation)</span>
            </button>

            <button
              onClick={() => setVisualMode('emdr_bilateral')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                visualMode === 'emdr_bilateral'
                  ? 'bg-amber-400 text-stone-900 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>双侧眼动追踪 (EMDR)</span>
            </button>

            <button
              onClick={() => setVisualMode('firefly_flow')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                visualMode === 'firefly_flow'
                  ? 'bg-amber-400 text-stone-900 font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>深海萤光流 (Firefly Flow)</span>
            </button>
          </div>

          {/* Starlight Point Map Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

          {/* EMDR Overlay (active only in emdr_bilateral mode) */}
          {visualMode === 'emdr_bilateral' && (
            <div className="w-full max-w-2xl relative my-auto py-8 z-10">
              <div className="w-full h-1 bg-stone-700/60 rounded-full" />
              <div
                style={{
                  left: `${ballX}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute top-1/2 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-100 shadow-[0_0_35px_12px_rgba(251,191,36,0.7)] flex items-center justify-center transition-all duration-75"
              >
                <div className="w-3 h-3 rounded-full bg-white shadow-inner" />
              </div>
            </div>
          )}

          {/* Bottom Guidance & Countdown */}
          <div className="z-10 flex items-center justify-between w-full max-w-xl bg-stone-900/75 border border-stone-700/80 px-5 py-2.5 rounded-2xl text-stone-300 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-sm font-bold text-white tracking-wider">
                {formatTime(timeRemaining)}
              </span>
            </div>

            <span className="text-[11px] text-stone-400 truncate max-w-xs">
              {visualMode === 'constellation_map'
                ? '凝视星象光点图随深呼吸收缩绽放，感受身心安详'
                : visualMode === 'emdr_bilateral'
                ? '保持头部固定，双眼追踪微光球水平移动'
                : '漫步深海荧火微光，任思绪如尘埃落定'}
            </span>
          </div>
        </div>

        {/* Bottom Multi-Track Nature Sound Mixer */}
        <div className="px-6 py-3.5 bg-white/95 border-t border-stone-200/80">
          <div className="text-xs font-semibold text-stone-700 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-600" />
              多轨自然白噪音声境
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400">冥想计时:</span>
              {[3, 5, 10].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setMeditationDuration(mins * 60);
                    setTimeRemaining(mins * 60);
                    setIsMeditating(true);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border transition-colors ${
                    meditationDuration === mins * 60
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  {mins} 分钟
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-medium text-stone-700">
                    <span>{track.icon}</span>
                    <span>{track.name}</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.volume}
                  onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
