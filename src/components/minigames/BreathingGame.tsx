/**
 * 晴愈 - 核心疗愈玩法 3: 🫁 呼吸疗愈 (多频率节律调节与动态身心神经反馈)
 * 支持 4-7-8 深度助眠、4-4-4-4 箱式专注呼吸、4-6 迷走神经舒缓、5-5 心脏共振
 * 视觉效果：呼吸柔光脉动环、吸气聚能星轨、呼气云雾消散为金辉、实时节律波形曲线
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Wind, Heart, RotateCcw, Sliders, CheckCircle2, Sparkles, Activity } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface BreathingGameProps {
  onClose: () => void;
  onCycleCompleted?: () => void;
}

interface BreathingPattern {
  id: string;
  name: string;
  subtitle: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  effectDesc: string;
}

const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: '4-7-8',
    name: '4-7-8 深度安眠',
    subtitle: '激活副交感神经 · 阻断焦虑应激',
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0,
    effectDesc: '哈佛大学医学博士 Andrew Weil 推荐，适合睡前与极度紧绷时释放',
  },
  {
    id: 'box',
    name: '4-4-4-4 箱式呼吸',
    subtitle: '海豹突击队专注法 · 平衡脑电波',
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4,
    effectDesc: '四等节律使心智恢复清晰笃定，适合重要工作与考试前稳定心神',
  },
  {
    id: '4-6',
    name: '4-6 舒缓平息',
    subtitle: '迷走神经温和调理 · 缓和心率',
    inhale: 4,
    holdIn: 0,
    exhale: 6,
    holdOut: 0,
    effectDesc: '延长吐气时间，使心率自然减慢，适合日常情绪低落或轻度烦躁',
  },
  {
    id: 'coherent',
    name: '5-5 心率变异共振 (0.1Hz)',
    subtitle: '心脏数智谐振 · 神经平衡',
    inhale: 5,
    holdIn: 0,
    exhale: 5,
    holdOut: 0,
    effectDesc: '每分钟 6 次完美共振节律，让心脑神经系统步入最大相干态',
  },
];

type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export const BreathingGame: React.FC<BreathingGameProps> = ({ onClose, onCycleCompleted }) => {
  const [activePattern, setActivePattern] = useState<BreathingPattern>(BREATHING_PATTERNS[0]);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState<number>(activePattern.inhale);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [cloudDensity, setCloudDensity] = useState<number>(100);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [customSpeedMultiplier, setCustomSpeedMultiplier] = useState<number>(1.0);

  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; angle: number; radius: number; speed: number; size: number; alpha: number }[]>([]);

  // Initialize swirling aura particles
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 48; i++) {
      particles.push({
        x: 0,
        y: 0,
        angle: Math.random() * Math.PI * 2,
        radius: 120 + Math.random() * 80,
        speed: 0.015 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.6,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Switch pattern resets timer
  const handleSelectPattern = (pattern: BreathingPattern) => {
    setActivePattern(pattern);
    setPhase('inhale');
    setSecondsLeft(pattern.inhale);
    audioEngine.playBreathCue('inhale', pattern.inhale);
  };

  // Timer Tick
  useEffect(() => {
    if (!isRunning) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Phase advance logic
        if (phase === 'inhale') {
          if (activePattern.holdIn > 0) {
            setPhase('holdIn');
            audioEngine.playBreathCue('hold', activePattern.holdIn);
            return activePattern.holdIn;
          } else {
            setPhase('exhale');
            audioEngine.playBreathCue('exhale', activePattern.exhale);
            return activePattern.exhale;
          }
        } else if (phase === 'holdIn') {
          setPhase('exhale');
          audioEngine.playBreathCue('exhale', activePattern.exhale);
          return activePattern.exhale;
        } else if (phase === 'exhale') {
          if (activePattern.holdOut > 0) {
            setPhase('holdOut');
            audioEngine.playBreathCue('hold', activePattern.holdOut);
            return activePattern.holdOut;
          } else {
            // Cycle finished
            setCompletedCycles((c) => {
              const nextC = c + 1;
              setCloudDensity((d) => Math.max(0, d - 20));
              if (onCycleCompleted) onCycleCompleted();
              return nextC;
            });
            setPhase('inhale');
            audioEngine.playBreathCue('inhale', activePattern.inhale);
            return activePattern.inhale;
          }
        } else {
          // holdOut finished
          setCompletedCycles((c) => {
            const nextC = c + 1;
            setCloudDensity((d) => Math.max(0, d - 20));
            if (onCycleCompleted) onCycleCompleted();
            return nextC;
          });
          setPhase('inhale');
          audioEngine.playBreathCue('inhale', activePattern.inhale);
          return activePattern.inhale;
        }
      });
    }, 1000 / customSpeedMultiplier);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isRunning, activePattern, customSpeedMultiplier]);

  // Visual Wave Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw Swirling Starlight Particles (Inhale draws in, Exhale radiates out)
      const particles = particlesRef.current;
      particles.forEach((p) => {
        p.angle += p.speed;

        let targetRadius = 150;
        if (phase === 'inhale') {
          targetRadius = 110 + Math.sin(time + p.angle) * 30; // Spiral inward
        } else if (phase === 'holdIn') {
          targetRadius = 175; // Expanded hold
        } else if (phase === 'exhale') {
          targetRadius = 220 + Math.sin(time * 2) * 40; // Expand outward
        }

        p.radius += (targetRadius - p.radius) * 0.05;
        const px = centerX + Math.cos(p.angle) * p.radius;
        const py = centerY + Math.sin(p.angle) * p.radius;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = phase === 'exhale' ? '#FDE68A' : '#BAE6FD';
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = '#BAE6FD';
        ctx.shadowBlur = 8;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [phase]);

  // Current stage description & colors
  const getPhaseInfo = () => {
    switch (phase) {
      case 'inhale':
        return {
          title: '深长吸气 (Inhale)',
          desc: '用鼻腔缓缓吸入清凉空气，将专注力汇聚于胸腹起伏',
          color: 'text-sky-700',
          bgGradient: 'from-sky-200 via-teal-100 to-emerald-100',
        };
      case 'holdIn':
        return {
          title: '屏息静心 (Hold)',
          desc: '感受身体充满生命氧能，安住于万籁俱寂的当下',
          color: 'text-indigo-800',
          bgGradient: 'from-indigo-200 via-purple-100 to-sky-100',
        };
      case 'exhale':
        return {
          title: '缓慢呼气 (Exhale)',
          desc: '微张双唇平稳呼出，带走肌肉酸胀与心绪重荷',
          color: 'text-amber-800',
          bgGradient: 'from-amber-200 via-rose-100 to-amber-100',
        };
      case 'holdOut':
        return {
          title: '呼毕驻留 (Rest)',
          desc: '在空气清空的虚怀中，体验无念由心的松弛与轻盈',
          color: 'text-stone-700',
          bgGradient: 'from-stone-200 via-amber-50 to-stone-100',
        };
    }
  };

  const currentInfo = getPhaseInfo();

  // Calculate dynamic bubble expansion factor
  let orbScale = 1.0;
  if (phase === 'inhale') {
    const elapsedPhase = activePattern.inhale - secondsLeft;
    orbScale = 1.0 + (elapsedPhase / activePattern.inhale) * 0.75;
  } else if (phase === 'holdIn') {
    orbScale = 1.75;
  } else if (phase === 'exhale') {
    const elapsedPhase = activePattern.exhale - secondsLeft;
    orbScale = 1.75 - (elapsedPhase / activePattern.exhale) * 0.75;
  } else {
    orbScale = 1.0;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl h-[88vh] bg-[#FAF9F6] border border-white/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 bg-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 flex items-center gap-2">
                身心呼吸疗愈 · 节律神经调控
                <span className="text-[11px] font-normal text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  {activePattern.name}
                </span>
              </h2>
              <p className="text-xs text-stone-500">{activePattern.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPhase('inhale');
                setSecondsLeft(activePattern.inhale);
                setCompletedCycles(0);
                setCloudDensity(100);
              }}
              title="重置练习"
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Breathing Visual Arena */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          {/* Background Atmospheric Cloud Dissolution */}
          <div
            style={{ opacity: cloudDensity / 100 }}
            className="absolute inset-0 pointer-events-none transition-opacity duration-1000 flex items-center justify-center"
          >
            <div className="w-[500px] h-[500px] rounded-full bg-stone-300/35 blur-3xl" />
          </div>

          {/* Golden Starlight Dawn emerging as stress clouds clear */}
          <div
            style={{ opacity: (100 - cloudDensity) / 100 }}
            className="absolute inset-0 pointer-events-none transition-opacity duration-1000 flex items-center justify-center"
          >
            <div className="w-[550px] h-[550px] rounded-full bg-amber-200/30 blur-3xl" />
          </div>

          {/* Background Canvas for Swirling Starlight Aura Particles */}
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
          />

          {/* Center Breathing Light Sphere */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Expansion Target Outer Ring */}
            <div className="w-80 h-80 rounded-full border border-dashed border-stone-300/80 flex items-center justify-center pointer-events-none" />

            {/* Glowing Responsive Respiratory Orb */}
            <div
              style={{
                transform: `scale(${orbScale})`,
                transition: 'transform 1s linear',
              }}
              className={`absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center shadow-[0_0_60px_rgba(186,230,253,0.7)] bg-gradient-to-tr ${currentInfo.bgGradient} border border-white/95 text-center`}
            >
              <span className="text-4xl font-extrabold text-stone-800 tracking-tight font-mono">
                {secondsLeft}s
              </span>
              <span className="text-xs font-semibold text-stone-700 mt-1 uppercase tracking-wider">
                {phase === 'inhale' ? '吸 气' : phase === 'holdIn' ? '屏 息' : phase === 'exhale' ? '呼 气' : '静 止'}
              </span>
            </div>
          </div>

          {/* Real-time Guidance Message */}
          <div className="mt-12 text-center max-w-md z-10">
            <h3 className={`text-xl font-bold mb-1.5 ${currentInfo.color}`}>{currentInfo.title}</h3>
            <p className="text-xs text-stone-500 leading-relaxed">{currentInfo.desc}</p>
          </div>
        </div>

        {/* Bottom Pattern Switcher & Bio-Feedback Dock */}
        <div className="px-6 py-4 bg-white/95 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Pattern Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-stone-600 mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-stone-500" />
              调整频率:
            </span>
            {BREATHING_PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPattern(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  activePattern.id === p.id
                    ? 'bg-sky-100 text-sky-900 border-sky-300 font-bold shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Cycle Stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-stone-600">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span>已完成:</span>
              <span className="font-bold text-stone-800 font-mono text-sm">{completedCycles} 组</span>
            </div>

            <div className="flex items-center gap-1 text-stone-500">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>压力清空:</span>
              <span className="font-bold text-emerald-700">{100 - cloudDensity}%</span>
            </div>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
            >
              {isRunning ? '暂停' : '继续'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
