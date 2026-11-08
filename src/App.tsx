/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeatherType, ActiveMiniGame, WEATHER_CONFIGS, IslandFloraItem } from './types';
import { audioEngine } from './services/audioEngine';
import { ecosystemService } from './services/ecosystemService';
import { IslandCanvas } from './components/IslandCanvas';
import { MainHUD } from './components/MainHUD';
import { WelcomeView } from './components/WelcomeView';
import { MoodQuizModal } from './components/MoodQuizModal';
import { FlowerBloomGame } from './components/minigames/FlowerBloomGame';
import { EtherealMelodyGame } from './components/minigames/EtherealMelodyGame';
import { BreathingGame } from './components/minigames/BreathingGame';
import { WhiteNoiseEmdrGame } from './components/minigames/WhiteNoiseEmdrGame';
import { DiaryDashboardModal } from './components/DiaryDashboardModal';
import { SocialModal } from './components/SocialModal';

export default function App() {
  const [hasEntered, setHasEntered] = useState<boolean>(() => {
    return localStorage.getItem('qingyu_has_entered') === 'true';
  });

  const [currentWeather, setCurrentWeather] = useState<WeatherType>(() => {
    return (localStorage.getItem('qingyu_current_weather') as WeatherType) || 'sunny';
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('qingyu_user_name') || '心象旅人';
  });

  const [activeMiniGame, setActiveMiniGame] = useState<ActiveMiniGame>(null);
  const [isQuizOpen, setIsQuizOpen] = useState<boolean>(false);
  const [isDiaryOpen, setIsDiaryOpen] = useState<boolean>(false);
  const [isSocialOpen, setIsSocialOpen] = useState<boolean>(false);
  const [sproutedNotification, setSproutedNotification] = useState<IslandFloraItem | null>(null);

  // Auto-dismiss sprouted notification toast
  useEffect(() => {
    if (sproutedNotification) {
      const timer = window.setTimeout(() => {
        setSproutedNotification(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [sproutedNotification]);

  // Synchronize weather changes with audio engine & storage
  useEffect(() => {
    if (hasEntered) {
      audioEngine.setWeather(currentWeather);
      localStorage.setItem('qingyu_current_weather', currentWeather);
    }
  }, [currentWeather, hasEntered]);

  const handleStartQuiz = () => {
    audioEngine.init();
    setIsQuizOpen(true);
  };

  const handleGuestEnter = () => {
    audioEngine.init();
    setHasEntered(true);
    localStorage.setItem('qingyu_has_entered', 'true');
    audioEngine.setWeather(currentWeather);
  };

  const handleLoginEnter = (name: string) => {
    audioEngine.init();
    setUserName(name);
    setHasEntered(true);
    localStorage.setItem('qingyu_has_entered', 'true');
    audioEngine.setWeather(currentWeather);
  };

  const handleQuizComplete = (weather: WeatherType) => {
    setCurrentWeather(weather);
    setIsQuizOpen(false);
    setHasEntered(true);
    localStorage.setItem('qingyu_has_entered', 'true');
    localStorage.setItem('qingyu_current_weather', weather);
    audioEngine.setWeather(weather);
  };

  const handleWeatherSelect = (weather: WeatherType) => {
    setCurrentWeather(weather);
    audioEngine.setWeather(weather);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#FAF9F6] font-sans antialiased">
      {/* 1. Welcome / Auth Screen if not entered */}
      {!hasEntered ? (
        <>
          <WelcomeView
            onGuestEnter={handleGuestEnter}
            onLoginEnter={handleLoginEnter}
            onStartQuiz={handleStartQuiz}
          />
          {isQuizOpen && (
            <MoodQuizModal
              onComplete={handleQuizComplete}
              onCancel={() => setIsQuizOpen(false)}
            />
          )}
        </>
      ) : (
        /* 2. Main 3D Island & Floating HUD Interface */
        <div className="relative w-full h-full overflow-hidden">
          {/* 3D Full-Bleed Floating Island Canvas */}
          <IslandCanvas
            weather={currentWeather}
            onIslandClick={() => {
              // Gentle audio interaction when touching island directly
              audioEngine.playEtherealNote(0);
            }}
            onFloraSprouted={(flora) => {
              setSproutedNotification(flora);
              audioEngine.playEtherealNote(2);
            }}
          />

          {/* Sprouted Flora Celebration Toast */}
          {sproutedNotification && (
            <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] p-3.5 rounded-2xl bg-white/95 border border-emerald-200/90 shadow-[0_10px_35px_rgba(16,185,129,0.15)] flex items-center gap-3 animate-fade-in transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-100 to-green-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 text-xl shadow-xs">
                🌿
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <span>心象生态长出新植被:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-semibold">
                    {sproutedNotification.name}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate mt-0.5">
                  {sproutedNotification.storyHint}
                </p>
              </div>
              <button
                onClick={() => setSproutedNotification(null)}
                className="text-stone-400 hover:text-stone-700 p-1 text-xs transition-colors"
                title="关闭提示"
              >
                ✕
              </button>
            </div>
          )}

          {/* Frosted Glass HUD Controls */}
          <MainHUD
            currentWeather={currentWeather}
            onSelectWeather={handleWeatherSelect}
            onOpenMiniGame={(game) => setActiveMiniGame(game)}
            onOpenDiary={() => setIsDiaryOpen(true)}
            onOpenSocial={() => setIsSocialOpen(true)}
            onRetakeQuiz={() => setIsQuizOpen(true)}
          />

          {/* 3. Four Healing Mini-Game Overlays */}
          {activeMiniGame === 'flower' && (
            <FlowerBloomGame
              onClose={() => setActiveMiniGame(null)}
              onPlantCompleted={() => {
                ecosystemService.recordHealingActivity('指尖生花播种', 15);
                // If in thunderstorm/rain, suggest brightening to rainbow/sunny
                if (currentWeather === 'thunder' || currentWeather === 'rainy') {
                  // Keep or gently brighten
                }
              }}
            />
          )}

          {activeMiniGame === 'melody' && (
            <EtherealMelodyGame
              onClose={() => {
                setActiveMiniGame(null);
                ecosystemService.recordHealingActivity('空灵音律水琴', 10);
              }}
            />
          )}

          {activeMiniGame === 'breathe' && (
            <BreathingGame
              onClose={() => setActiveMiniGame(null)}
              onCycleCompleted={() => {
                ecosystemService.recordHealingActivity('4-7-8 呼吸疗愈', 12);
                // Breathing calms storm into clearing sky
                if (currentWeather === 'thunder') {
                  handleWeatherSelect('rainy');
                } else if (currentWeather === 'tornado') {
                  handleWeatherSelect('rainbow');
                }
              }}
            />
          )}

          {activeMiniGame === 'whitenoise' && (
            <WhiteNoiseEmdrGame
              onClose={() => {
                setActiveMiniGame(null);
                ecosystemService.recordHealingActivity('白噪音冥想', 10);
              }}
            />
          )}

          {/* 4. Mood Quiz Modal (can be triggered from HUD anytime) */}
          {isQuizOpen && (
            <MoodQuizModal
              onComplete={handleQuizComplete}
              onCancel={() => setIsQuizOpen(false)}
            />
          )}

          {/* 5. Diary & Dashboard Modal */}
          {isDiaryOpen && (
            <DiaryDashboardModal
              currentWeather={currentWeather}
              onClose={() => setIsDiaryOpen(false)}
              onSelectWeather={handleWeatherSelect}
            />
          )}

          {/* 6. Warm Social Modal */}
          {isSocialOpen && (
            <SocialModal
              userWeather={currentWeather}
              onClose={() => setIsSocialOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
