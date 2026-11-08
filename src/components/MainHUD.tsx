/**
 * 晴愈 - 主界面 HUD 控制台
 * 纯净全屏 3D 悬浮小岛之上的半透明毛玻璃微控制器与 4 大疗愈入口
 */

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Gauge,
  Sprout,
  Music2,
  Wind,
  Moon,
  BookOpen,
  Users,
  Compass,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { WeatherType, WEATHER_CONFIGS, ActiveMiniGame } from '../types';
import { audioEngine } from '../services/audioEngine';
import { ecosystemService } from '../services/ecosystemService';

interface MainHUDProps {
  currentWeather: WeatherType;
  onSelectWeather: (weather: WeatherType) => void;
  onOpenMiniGame: (game: ActiveMiniGame) => void;
  onOpenDiary: () => void;
  onOpenSocial: () => void;
  onRetakeQuiz: () => void;
}

export const MainHUD: React.FC<MainHUDProps> = ({
  currentWeather,
  onSelectWeather,
  onOpenMiniGame,
  onOpenDiary,
  onOpenSocial,
  onRetakeQuiz,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [tempoRate, setTempoRate] = useState<number>(1.0);
  const [showMusicControls, setShowMusicControls] = useState<boolean>(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState<boolean>(false);
  const [showEcosystemMenu, setShowEcosystemMenu] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [ecosystemProfile, setEcosystemProfile] = useState(() => ecosystemService.getProfile());

  useEffect(() => {
    const unsub = ecosystemService.subscribe((p) => setEcosystemProfile(p));
    return unsub;
  }, []);

  const growthLevel = ecosystemService.getGrowthLevel();
  const unlockedFlora = ecosystemService.getUnlockedFlora();
  const allFlora = ecosystemService.getFloraRegistry();

  const currentWeatherInfo = WEATHER_CONFIGS[currentWeather];

  const handleToggleMute = () => {
    const nextMute = !isAudioMuted;
    setIsAudioMuted(nextMute);
    audioEngine.setMute(nextMute);
  };

  const handleTempoChange = (val: number) => {
    setTempoRate(val);
    audioEngine.setTempoMultiplier(val);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* 1. TOP BAR: Brand Badge, Weather Status & Music Controller */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Brand Wordmark, Current Weather & Ecosystem Badge */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Brand Wordmark & Weather Status */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <span className="font-serif font-extrabold text-stone-800 tracking-wider text-sm">
              晴 愈
            </span>
            <span className="text-stone-300 font-light">|</span>

            {/* Clickable Weather Badge with dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowWeatherMenu(!showWeatherMenu)}
                className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 transition-colors"
                title="切换当前心象天气"
              >
                <span className="text-base">{currentWeatherInfo.icon}</span>
                <span>{currentWeatherInfo.name}</span>
                <span className="hidden sm:inline text-[11px] text-stone-400 font-normal">
                  ({currentWeatherInfo.emotion})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {/* Weather Quick Selector Dropdown */}
              {showWeatherMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 p-1.5 rounded-2xl bg-white/95 border border-stone-200/80 shadow-xl z-30 animate-fade-in">
                  <div className="px-2 py-1 text-[10px] text-stone-400 font-medium">
                    调控心象天气 (音乐与生态实时联动):
                  </div>
                  {(Object.keys(WEATHER_CONFIGS) as WeatherType[]).map((wKey) => {
                    const info = WEATHER_CONFIGS[wKey];
                    return (
                      <button
                        key={wKey}
                        onClick={() => {
                          onSelectWeather(wKey);
                          setShowWeatherMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentWeather === wKey
                            ? 'bg-amber-50 text-amber-900 font-bold'
                            : 'text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{info.name}</span>
                        </div>
                        <span className="text-[10px] text-stone-400">{info.emotion}</span>
                      </button>
                    );
                  })}
                  <div className="border-t border-stone-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowWeatherMenu(false);
                        onRetakeQuiz();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-1.5 font-medium"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>重新进行心象测验</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ecosystem Growth Chip with popover */}
          <div className="relative">
            <button
              onClick={() => setShowEcosystemMenu(!showEcosystemMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 hover:bg-white border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-xs font-semibold text-emerald-800 transition-all hover:scale-102 active:scale-98"
              title="查看岛屿生态与长期心象成长"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Sprout className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1 leading-none">
                  <span className="font-bold text-[11px] text-emerald-900">Lv.{growthLevel.level} {growthLevel.title}</span>
                  <span className="text-[10px] text-emerald-600/80 font-normal">({unlockedFlora.length}/{allFlora.length} 植被)</span>
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-emerald-600/60" />
            </button>

            {/* Ecosystem Details Dropdown */}
            {showEcosystemMenu && (
              <div className="absolute top-full left-0 mt-2 w-80 p-4 rounded-3xl bg-white/95 border border-emerald-100 shadow-2xl z-30 animate-fade-in space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Sprout className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">岛屿心象生态成长</h4>
                      <p className="text-[10px] text-stone-400">日常陪伴与疗愈，让小岛郁葱繁盛</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Lv.{growthLevel.level}
                  </span>
                </div>

                {/* Growth Stats Overview */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100/60">
                    <div className="text-[10px] text-stone-400">连续陪伴</div>
                    <div className="text-xs font-bold text-amber-900 mt-0.5">
                      {ecosystemProfile.loginStreakDays} 天
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100/60">
                    <div className="text-[10px] text-stone-400">已生植被</div>
                    <div className="text-xs font-bold text-emerald-900 mt-0.5">
                      {unlockedFlora.length} 株
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-100/60">
                    <div className="text-[10px] text-stone-400">疗愈次数</div>
                    <div className="text-xs font-bold text-sky-900 mt-0.5">
                      {ecosystemProfile.totalActivitiesCount} 次
                    </div>
                  </div>
                </div>

                {/* Progress to Next Growth Level */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-stone-500 font-medium">
                    <span>生机蓄积进度: {ecosystemProfile.growthPoints} pt</span>
                    <span>目标 {growthLevel.nextThreshold} pt</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, growthLevel.progress * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Unlocked Flora Showcase */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-stone-600 flex items-center justify-between">
                    <span>岛屿当前繁茂生态 ({unlockedFlora.length}):</span>
                    <span className="text-[9px] text-stone-400">随长期疗愈持续解锁</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {unlockedFlora.map((flora) => (
                      <div
                        key={flora.id}
                        className="p-2 rounded-xl bg-stone-50 hover:bg-emerald-50/50 border border-stone-100 transition-colors flex items-start gap-2 text-left"
                      >
                        <span className="text-sm shrink-0 mt-0.5">
                          {flora.type === 'moss' ? '🟢' : flora.type === 'shrub' ? '🌳' : flora.type === 'wildflower' ? '🌸' : flora.type === 'succulent' ? '🪴' : flora.type === 'mushroom' ? '🍄' : '🌿'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-800">{flora.name}</span>
                            <span className="text-[9px] text-emerald-700 bg-emerald-100/70 px-1 rounded">{flora.stageName}</span>
                          </div>
                          <p className="text-[10px] text-stone-500 leading-tight mt-0.5">{flora.storyHint}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-stone-400 text-center border-t border-stone-100 pt-2">
                  每日登录、指尖种花或记录日记，小岛都会抽出新的生机 🌿
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Music HUD & Zen Mode Switcher */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Zen Viewport Mode (Cinema View) Toggle */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className="p-2.5 rounded-2xl bg-white/90 hover:bg-white text-stone-600 hover:text-stone-900 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all"
            title={isZenMode ? '退出沉浸静赏模式' : '开启全屏静赏小岛'}
          >
            {isZenMode ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Music Controller Button */}
          <div className="relative">
            <button
              onClick={() => setShowMusicControls(!showMusicControls)}
              className="px-3 py-2 rounded-2xl bg-white/90 hover:bg-white text-stone-700 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex items-center gap-2 text-xs font-medium transition-all"
            >
              {isAudioMuted ? (
                <VolumeX className="w-4 h-4 text-stone-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-600 animate-pulse" />
              )}
              <span className="hidden sm:inline">
                {isAudioMuted ? '已静音' : '心象音律'}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                {tempoRate.toFixed(1)}x
              </span>
            </button>

            {/* Music Controls Panel */}
            {showMusicControls && (
              <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-2xl bg-white/95 border border-stone-200/80 shadow-xl z-30 animate-fade-in space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    天气联动 BGM 速率
                  </span>
                  <button
                    onClick={handleToggleMute}
                    className="text-[11px] text-stone-500 hover:text-stone-900"
                  >
                    {isAudioMuted ? '取消静音' : '静音'}
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <span>节奏速率 (BPM Multiplier)</span>
                    <span className="font-mono font-bold text-amber-700">{tempoRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={tempoRate}
                    onChange={(e) => handleTempoChange(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 mt-0.5">
                    <span>0.5x 慢板冥想</span>
                    <span>1.0x 标准</span>
                    <span>1.5x 轻快流转</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-stone-50 border border-stone-100 text-[10px] text-stone-500 leading-relaxed">
                  当前配器: <strong>{currentWeatherInfo.bgmType}</strong>。
                  切换天气时，配器音色与和弦会自动平滑呼吸过渡。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BOTTOM CONTROLS: 4 Round Healing Mini-Game Portals + Corner Entrances */}
      {!isZenMode && (
        <div className="flex flex-col items-center w-full animate-fade-in">
          {/* Main 4 Healing Portals Dock */}
          <div className="pointer-events-auto flex items-center justify-between w-full max-w-4xl px-2">
            {/* Left Corner: 温暖社交入口 */}
            <button
              onClick={onOpenSocial}
              className="px-3.5 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Users className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">温暖社交</span>
            </button>

            {/* Center 4 Round Frosted Healing Game Buttons */}
            <div className="flex items-center gap-3 sm:gap-5 px-4 py-2.5 rounded-3xl bg-white/85 border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              {/* Portal 1: 指尖生花 */}
              <button
                onClick={() => onOpenMiniGame('flower')}
                className="group flex flex-col items-center gap-1 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-100 to-green-50 border border-emerald-200/60 shadow-xs flex items-center justify-center text-emerald-700 group-hover:scale-110 group-hover:shadow-md transition-all">
                  <Sprout className="w-6 h-6 stroke-[1.75]" />
                </div>
                <span className="text-[11px] font-medium text-stone-700 group-hover:text-emerald-800 transition-colors">
                  指尖生花
                </span>
              </button>

              {/* Portal 2: 空灵音律 */}
              <button
                onClick={() => onOpenMiniGame('melody')}
                className="group flex flex-col items-center gap-1 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-100 to-sky-50 border border-indigo-200/60 shadow-xs flex items-center justify-center text-indigo-700 group-hover:scale-110 group-hover:shadow-md transition-all">
                  <Music2 className="w-6 h-6 stroke-[1.75]" />
                </div>
                <span className="text-[11px] font-medium text-stone-700 group-hover:text-indigo-800 transition-colors">
                  空灵音律
                </span>
              </button>

              {/* Portal 3: 呼吸疗愈 */}
              <button
                onClick={() => onOpenMiniGame('breathe')}
                className="group flex flex-col items-center gap-1 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-sky-100 to-cyan-50 border border-sky-200/60 shadow-xs flex items-center justify-center text-sky-700 group-hover:scale-110 group-hover:shadow-md transition-all">
                  <Wind className="w-6 h-6 stroke-[1.75]" />
                </div>
                <span className="text-[11px] font-medium text-stone-700 group-hover:text-sky-800 transition-colors">
                  呼吸疗愈
                </span>
              </button>

              {/* Portal 4: 白噪音冥想 */}
              <button
                onClick={() => onOpenMiniGame('whitenoise')}
                className="group flex flex-col items-center gap-1 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-100 to-yellow-50 border border-amber-200/60 shadow-xs flex items-center justify-center text-amber-700 group-hover:scale-110 group-hover:shadow-md transition-all">
                  <Moon className="w-6 h-6 stroke-[1.75]" />
                </div>
                <span className="text-[11px] font-medium text-stone-700 group-hover:text-amber-800 transition-colors">
                  白噪音冥想
                </span>
              </button>
            </div>

            {/* Right Corner: 日记与看板入口 */}
            <button
              onClick={onOpenDiary}
              className="px-3.5 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">心象日记</span>
            </button>
          </div>

          <div className="text-[10px] text-stone-400 mt-2 pointer-events-none">
            按住鼠标左键可 360° 旋转心象岛屿 · 滚轮缩放景深
          </div>
        </div>
      )}
    </div>
  );
};
