/**
 * 晴愈 - 欢迎页与登录 (Welcome & Entry)
 * 极简居中设计、云朵与小岛结合的 Low-poly 风格 Logo、极致毛玻璃质感、访客体验与免责声明
 */

import React, { useState } from 'react';
import { Cloud, Sparkles, User, ShieldCheck, HeartHandshake, Compass } from 'lucide-react';

interface WelcomeViewProps {
  onGuestEnter: () => void;
  onLoginEnter: (username: string) => void;
  onStartQuiz: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onGuestEnter,
  onLoginEnter,
  onStartQuiz,
}) => {
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = username.trim() || '心象旅人';
    localStorage.setItem('qingyu_user_name', finalName);
    onLoginEnter(finalName);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-6 select-none bg-gradient-to-b from-[#FAF9F6] via-[#FDFBF7] to-[#F5F2EB] overflow-hidden">
      {/* Background Soft Floating Ambient Orbs (Macaron Morandi tones) */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-rose-100/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-sky-100/45 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-1/3 w-80 h-80 rounded-full bg-amber-100/35 blur-3xl pointer-events-none" />

      {/* Top Quiet Brand Kicker */}
      <div className="w-full max-w-4xl flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>严肃向心理疗愈与心象游戏化空间</span>
        </div>
        <div className="text-xs text-stone-400">
          心流 · 掌控 · 释怀
        </div>
      </div>

      {/* Center Hero Card: Floating Island & Cloud Logo Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-lg z-10 animate-fade-in">
        {/* Game Insignia: Stylized Cloud + Low-Poly Floating Island SVG Badge */}
        <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
          {/* Breathing Frosted Glow ring */}
          <div className="absolute inset-0 rounded-full bg-white/60 shadow-[0_12px_40px_rgba(230,220,200,0.45)] border border-white/80" />

          {/* SVG Low-Poly Island & Cloud Artwork */}
          <svg viewBox="0 0 120 120" className="w-24 h-24 relative z-10 drop-shadow-sm">
            {/* Puffy Low-Poly Cloud Base */}
            <path
              d="M30 65 Q22 65 20 54 Q18 42 32 40 Q38 30 52 30 Q68 30 74 42 Q86 40 88 52 Q92 65 78 65 Z"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            {/* Floating Inverted Low-Poly Island Base */}
            <polygon points="35,62 85,62 60,95" fill="#8B7B6B" opacity="0.9" />
            <polygon points="45,62 75,62 60,86" fill="#A49280" />
            {/* Grass Top Layer */}
            <rect x="32" y="58" width="56" height="7" rx="3.5" fill="#86EFAC" />
            {/* Sakura tree / Little flower on top */}
            <circle cx="50" cy="48" r="7" fill="#FBCFE8" />
            <circle cx="58" cy="46" r="6" fill="#F472B6" opacity="0.8" />
            <rect x="53" y="53" width="2.5" height="6" rx="1" fill="#78350F" />
            {/* Warm sunlight spark */}
            <circle cx="78" cy="34" r="5" fill="#FDE047" opacity="0.9" />
          </svg>
        </div>

        {/* Title & Philosophy */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-800 tracking-tight font-serif mb-3">
          晴 愈
        </h1>
        <p className="text-sm sm:text-base font-medium text-stone-600 mb-2">
          心 象 岛 屿 · 心 理 疗 愈 游 戏
        </p>
        <p className="text-xs text-stone-500 leading-relaxed max-w-sm mb-8">
          以天气投射情绪，以微光抚慰起伏。在属于你的云中小岛上，练习深呼吸、听风看花、重获生活的掌控感。
        </p>

        {/* Interactive Frosted Glassmorphism CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-xs">
          <button
            onClick={onStartQuiz}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-semibold text-sm shadow-[0_8px_24px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 transition-all"
          >
            <Compass className="w-4 h-4" />
            测验心象 · 开启岛屿
          </button>

          <button
            onClick={onGuestEnter}
            className="w-full py-3 px-6 rounded-2xl bg-white/70 hover:bg-white active:scale-98 border border-white/80 text-stone-700 font-medium text-sm shadow-xs backdrop-blur-md flex items-center justify-center gap-2 transition-all"
          >
            <span>直接以访客进入</span>
          </button>
        </div>

        <button
          onClick={() => setShowLoginModal(true)}
          className="mt-4 text-xs text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1"
        >
          <User className="w-3.5 h-3.5" />
          登录 / 注册专属心象账号
        </button>
      </div>

      {/* Bottom Mandatory Disclaimer (Extremely Small & Crisp) */}
      <div className="w-full max-w-2xl text-center py-2 z-10">
        <p className="text-[10px] text-stone-400 leading-normal tracking-wide">
          免责声明：本游戏用于日常情绪觉察、压力舒缓与积极心理韧性建设，不能替代专业临床精神医学或心理障碍的诊断与治疗。如遇严重心理困扰，请寻求专业医疗支持。
        </p>
      </div>

      {/* Login / Register Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#FAF9F6] border border-white/90 rounded-3xl shadow-2xl p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-stone-800 mb-1">登录你的心象小岛</h3>
            <p className="text-xs text-stone-500 mb-5">
              记录将永久沉淀在你的专属心象星轨中
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-stone-600 block mb-1">岛主昵称 / 账号</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如：云间漫游者"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-stone-600 block mb-1">心语密码 (可选)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-xs"
                >
                  登入岛屿
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
