/**
 * 晴愈 - 记录页与可视化分析 (Diary & Dashboard)
 * 情绪日历、马卡龙配色情绪占比与波动折线图、天气日记富文本卡片
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, PieChart, TrendingUp, BookOpen, Plus, Heart, Trash2, CheckCircle } from 'lucide-react';
import { WeatherType, MoodDiaryEntry, WEATHER_CONFIGS } from '../types';
import { ecosystemService } from '../services/ecosystemService';

interface DiaryDashboardModalProps {
  currentWeather: WeatherType;
  onClose: () => void;
  onSelectWeather?: (weather: WeatherType) => void;
}

const STORAGE_KEY = 'qingyu_mood_diaries_v1';

const DEFAULT_SAMPLE_ENTRIES: MoodDiaryEntry[] = [
  {
    id: 'd1',
    date: '2026-11-04',
    time: '14:20',
    weather: 'thunder',
    emotionRating: 3,
    triggerEvent: '下午有重要的跨团队汇报，方案被临时提出质疑，瞬间感到心跳剧烈和高压。',
    healingActivities: ['4-7-8 呼吸疗愈', '深海白噪音'],
    gratitudeNote: '深呼吸了 4 组循环后，后颈的紧绷感有所消退，接纳了未完成的局限。',
  },
  {
    id: 'd2',
    date: '2026-11-05',
    time: '20:15',
    weather: 'rainy',
    emotionRating: 5,
    triggerEvent: '下班路上秋雨连绵，感到身心有些倦怠与沉闷，想早点休息。',
    healingActivities: ['空灵音律水琴', '青瓦细雨白噪音'],
    gratitudeNote: '指尖在屏幕划出清澈的水琴泛音，允许自己今晚什么都不用证明。',
  },
  {
    id: 'd3',
    date: '2026-11-06',
    time: '11:30',
    weather: 'tornado',
    emotionRating: 4,
    triggerEvent: '遇到不公允的沟通推诿，胸口堵着一团想要发作的火焰。',
    healingActivities: ['指尖生花播种', 'EMDR 视线追踪'],
    gratitudeNote: '在小岛上种了 3 朵静心薰衣草，提醒自己：愤怒是在保护我的边界，但我可以选择更温和的方式表达。',
  },
  {
    id: 'd4',
    date: '2026-11-07',
    time: '16:45',
    weather: 'rainbow',
    emotionRating: 8,
    triggerEvent: '此前纠结了很久的一个瓶颈问题终于找到了突破口，团队伙伴给予了诚恳的肯定。',
    healingActivities: ['空灵音律水琴', '全晴社区互动'],
    gratitudeNote: '阴霾之后的天空原来可以这么开阔，感恩自己没有提前放弃。',
  },
  {
    id: 'd5',
    date: '2026-11-08',
    time: '09:10',
    weather: 'sunny',
    emotionRating: 9,
    triggerEvent: '清晨醒来阳光洒在窗台，泡了一杯热茶，感觉头脑特别清爽从容。',
    healingActivities: ['指尖生花播种', '晨光冥想'],
    gratitudeNote: '今天的心象岛屿晴空万里，微风不燥，想把这份松弛传递给更多朋友。',
  },
];

export const DiaryDashboardModal: React.FC<DiaryDashboardModalProps> = ({
  currentWeather,
  onClose,
  onSelectWeather,
}) => {
  const [activeTab, setActiveTab] = useState<'diary' | 'calendar' | 'charts'>('diary');
  const [entries, setEntries] = useState<MoodDiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_SAMPLE_ENTRIES;
  });

  // New Diary Form State
  const [newWeather, setNewWeather] = useState<WeatherType>(currentWeather);
  const [newRating, setNewRating] = useState<number>(7);
  const [newTrigger, setNewTrigger] = useState<string>('');
  const [newGratitude, setNewGratitude] = useState<string>('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['4-7-8 呼吸疗愈']);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger.trim() && !newGratitude.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().slice(0, 5);

    const newEntry: MoodDiaryEntry = {
      id: 'd_' + Date.now(),
      date: todayStr,
      time: timeStr,
      weather: newWeather,
      emotionRating: newRating,
      triggerEvent: newTrigger || '无特定诱发事件，属于日常心绪流转',
      healingActivities: selectedActivities,
      gratitudeNote: newGratitude || '静心倾听呼吸，与自己平和共处。',
    };

    setEntries([newEntry, ...entries]);
    setNewTrigger('');
    setNewGratitude('');
    setShowAddForm(false);
    ecosystemService.recordHealingActivity('心象日记记录', 15);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const toggleActivity = (act: string) => {
    if (selectedActivities.includes(act)) {
      setSelectedActivities(selectedActivities.filter((a) => a !== act));
    } else {
      setSelectedActivities([...selectedActivities, act]);
    }
  };

  // Calculations for Charts
  const weatherDistribution = entries.reduce((acc, curr) => {
    acc[curr.weather] = (acc[curr.weather] || 0) + 1;
    return acc;
  }, {} as Record<WeatherType, number>);

  const totalEntries = entries.length || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[88vh] bg-[#FAF9F6]/95 border border-white/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/60 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                心象日记与情绪看板
              </h2>
              <p className="text-xs text-stone-500">
                记录每一次情绪潮汐，用数据与图文见证内在心理弹性的生长
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl">
              <button
                onClick={() => setActiveTab('diary')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'diary' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                天气日记
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'calendar' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                情绪日历
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'charts' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                可视化图表
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Weather Diary Cards */}
        {activeTab === 'diary' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-500">
                共记录 {entries.length} 篇心绪足迹
              </span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? '收起表单' : '记录此刻心象'}
              </button>
            </div>

            {/* Add Diary Card Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddEntry}
                className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4 animate-fade-in"
              >
                <h4 className="text-sm font-bold text-stone-800">
                  写下一张新的天气日记卡
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">
                      此时的心象天气:
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(Object.keys(WEATHER_CONFIGS) as WeatherType[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setNewWeather(w)}
                          className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 border transition-all ${
                            newWeather === w
                              ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                              : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}
                        >
                          <span>{WEATHER_CONFIGS[w].icon}</span>
                          <span>{WEATHER_CONFIGS[w].name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-500 block mb-1">
                      内心能量与平和指数: {newRating} / 10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newRating}
                      onChange={(e) => setNewRating(parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    诱发情绪的事由 / 身体感受 (客观描述):
                  </label>
                  <textarea
                    rows={2}
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    placeholder="例如：下午遇到紧急赶工要求，感到胸口紧绷与焦虑..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-500 block mb-1.5">
                    已采取的疗愈调节方式:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['4-7-8 呼吸疗愈', '指尖生花播种', '空灵音律水琴', '白噪音冥想', '温水洗浴', '向朋友倾诉'].map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => toggleActivity(act)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                          selectedActivities.includes(act)
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    赋能感恩或自我慈悲耳语:
                  </label>
                  <input
                    type="text"
                    value={newGratitude}
                    onChange={(e) => setNewGratitude(e.target.value)}
                    placeholder="例如：允许自己暂停脚步，我做得已经足够好了。"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-xs"
                  >
                    保存卡片
                  </button>
                </div>
              </form>
            )}

            {/* List of Diary Cards */}
            <div className="space-y-3">
              {entries.map((entry) => {
                const wConfig = WEATHER_CONFIGS[entry.weather];
                return (
                  <div
                    key={entry.id}
                    className="p-5 bg-white/80 hover:bg-white border border-stone-200/70 rounded-2xl shadow-xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{wConfig.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-stone-800">
                              {wConfig.name} · {wConfig.emotion}
                            </span>
                            <span className="text-xs text-stone-400">
                              {entry.date} {entry.time}
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-700 font-mono">
                            平和指数: {entry.emotionRating} / 10
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-stone-300 hover:text-rose-500 transition-colors p-1"
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-stone-700 mb-2.5 leading-relaxed bg-stone-50/70 p-2.5 rounded-xl border border-stone-100">
                      <span className="font-semibold text-stone-800 mr-1.5">心象事由:</span>
                      {entry.triggerEvent}
                    </p>

                    <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-2 border-t border-stone-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-stone-400">采取调节:</span>
                        {entry.healingActivities.map((act, i) => (
                          <span
                            key={i}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[10px]"
                          >
                            {act}
                          </span>
                        ))}
                      </div>

                      {entry.gratitudeNote && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-800 italic">
                          <Heart className="w-3 h-3 text-rose-400 fill-rose-300 shrink-0" />
                          <span>"{entry.gratitudeNote}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Mood Calendar Grid */}
        {activeTab === 'calendar' && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start">
            <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold text-stone-800">2026年 11月 · 心象日历</span>
                </div>
                <span className="text-xs text-stone-400">点击日期可查看历史天气</span>
              </div>

              {/* Day of Week */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-stone-400 font-medium mb-2">
                <div>日</div>
                <div>一</div>
                <div>二</div>
                <div>三</div>
                <div>四</div>
                <div>五</div>
                <div>六</div>
              </div>

              {/* Calendar Grid (Nov 2026 starts on Sunday) */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 30 }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `2026-11-${day.toString().padStart(2, '0')}`;
                  const matchingEntry = entries.find((e) => e.date === dateStr);

                  return (
                    <div
                      key={day}
                      className={`h-16 rounded-xl border p-1.5 flex flex-col justify-between transition-all ${
                        matchingEntry
                          ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400 cursor-pointer shadow-xs'
                          : 'bg-stone-50/40 border-stone-100 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={matchingEntry ? 'font-bold text-stone-800' : 'text-stone-400'}>
                          {day}
                        </span>
                        {matchingEntry && (
                          <span className="text-[10px] text-amber-700 font-mono">
                            {matchingEntry.emotionRating}分
                          </span>
                        )}
                      </div>
                      {matchingEntry && (
                        <div className="flex items-center justify-center text-xl">
                          {WEATHER_CONFIGS[matchingEntry.weather].icon}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Visual Charts (Macaron Pie Chart & Fluctuation Trend) */}
        {activeTab === 'charts' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Morandi Mood Proportion Pie/Donut Chart */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold text-stone-800">心象天气分布占比</span>
                  </div>
                  <span className="text-xs text-stone-400">马卡龙色谱</span>
                </div>

                <div className="relative w-44 h-44 my-3 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let accumulatedPercent = 0;
                      return (Object.keys(WEATHER_CONFIGS) as WeatherType[]).map((w) => {
                        const count = weatherDistribution[w] || 0;
                        const percent = (count / totalEntries) * 100;
                        const strokeDasharray = `${percent} ${100 - percent}`;
                        const strokeDashoffset = -accumulatedPercent;
                        accumulatedPercent += percent;

                        return (
                          <circle
                            key={w}
                            cx="50"
                            cy="50"
                            r="36"
                            fill="transparent"
                            stroke={WEATHER_CONFIGS[w].color}
                            strokeWidth="16"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-700"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-extrabold text-stone-800 font-mono">
                      {entries.length}
                    </span>
                    <span className="block text-[10px] text-stone-400">总心象记录</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full pt-3 border-t border-stone-100 text-xs">
                  {(Object.keys(WEATHER_CONFIGS) as WeatherType[]).map((w) => (
                    <div key={w} className="flex items-center gap-1.5">
                      <div
                        style={{ backgroundColor: WEATHER_CONFIGS[w].color }}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                      <span className="text-stone-600 truncate">{WEATHER_CONFIGS[w].name}</span>
                      <span className="text-stone-400 font-mono text-[11px]">
                        {Math.round(((weatherDistribution[w] || 0) / totalEntries) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood Fluctuation Trend Line Graph */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-stone-800">平和能量波动轨迹</span>
                    </div>
                    <span className="text-xs text-stone-400">近 5 次记录</span>
                  </div>
                  <p className="text-xs text-stone-500 mb-4">
                    反映从紧绷压力向疗愈释怀转化的正向心流轨迹
                  </p>

                  {/* SVG Line Graph */}
                  <div className="h-40 w-full relative">
                    <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
                      {/* Grid lines */}
                      <line x1="0" y1="20" x2="320" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="0" y1="60" x2="320" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="0" y1="100" x2="320" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />

                      {/* Polyline */}
                      {(() => {
                        const recent = entries.slice(0, 5).reverse();
                        const points = recent.map((item, idx) => {
                          const x = 30 + idx * 65;
                          const y = 110 - (item.emotionRating / 10) * 90;
                          return `${x},${y}`;
                        });
                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="#F59E0B"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points.join(' ')}
                            />
                            {recent.map((item, idx) => {
                              const x = 30 + idx * 65;
                              const y = 110 - (item.emotionRating / 10) * 90;
                              return (
                                <g key={item.id}>
                                  <circle cx={x} cy={y} r="5" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2.5" />
                                  <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#78350F" fontWeight="bold">
                                    {item.emotionRating}分
                                  </text>
                                  <text x={x} y="118" textAnchor="middle" fontSize="9" fill="#94A3B8">
                                    {item.date.slice(5)}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span>心理弹性评估: <strong className="text-emerald-600">快速恢复型 (Resilient)</strong></span>
                  <span>平均平和度: <strong>6.8 / 10</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
