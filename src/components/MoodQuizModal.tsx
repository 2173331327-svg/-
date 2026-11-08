/**
 * 晴愈 - 初始心情测试与天气映射
 * 5 道心理投射与觉察选择题，综合得分智能映射至 5 大天气心象
 */

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, Compass, CloudSun } from 'lucide-react';
import { WeatherType, QuizQuestion, WEATHER_CONFIGS } from '../types';

interface MoodQuizModalProps {
  onComplete: (weather: WeatherType) => void;
  onCancel?: () => void;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: '当你独自漫步在晨雾笼罩的森林，你最渴望在林中空地上遇见什么？',
    scenePrompt: '投射你当下最渴望的心灵寄托与内在节律',
    options: [
      { text: '一泓倒映着蓝天与初升晨曦的清澈泉水', weather: 'sunny', hint: '内心向往明朗、确定与温润的喜悦' },
      { text: '一棵在石缝间抽出嫩绿新芽的古老银杏', weather: 'rainbow', hint: '经历过动荡后，渴望新的释怀与生机' },
      { text: '一堵能够遮蔽狂乱呼啸劲风的坚固石墙', weather: 'tornado', hint: '情绪处于积聚与强烈起伏之中' },
      { text: '一间亮着暖黄色灯火、可静听落雨的木屋', weather: 'rainy', hint: '略感疲惫，渴望允许自己安全地低落' },
      { text: '一条能迅速离开未知迷雾的清晰林间小道', weather: 'thunder', hint: '对不确定性警觉，肩负着较高的现实压力' },
    ],
  },
  {
    id: 2,
    question: '如果将你最近几天的思绪比作一种自然水流，它最接近：',
    scenePrompt: '觉察近期的心智负荷与思维流动状态',
    options: [
      { text: '阳光下平缓流淌、泛着金光的浅溪', weather: 'sunny', hint: '思维平和流畅，内在阻力较低' },
      { text: '暴雨后重新恢复清澈、缓缓回落的江河', weather: 'rainbow', hint: '心中的悬石正在落地，重拾松弛' },
      { text: '在狭窄峡谷中湍急碰撞、激起千层浪的激流', weather: 'tornado', hint: '思维急速运转，有积压的情绪冲动' },
      { text: '一片不起波澜、笼罩在薄雾中的深潭', weather: 'rainy', hint: '情绪能量偏低，需要休眠与涵养' },
      { text: '即将来临的海潮前，空气沉闷紧绷的海面', weather: 'thunder', hint: '时刻保持备战状态，神经系统绷紧' },
    ],
  },
  {
    id: 3,
    question: '身体是心灵的晴雨表。此时此刻，你感觉自己身体哪一部分最需要被安抚？',
    scenePrompt: '身体扫描觉察：身心一体的压力投射',
    options: [
      { text: '全身轻松自如，呼吸均匀而深长', weather: 'sunny', hint: '身心处于良性的舒展与平衡' },
      { text: '胸口原本的沉闷正在像化雪般散开', weather: 'rainbow', hint: '身心正处于自愈与复苏阶段' },
      { text: '双拳紧攥或咬肌微绷，胸口有一团热气', weather: 'tornado', hint: '愤怒或不耐受的生理唤醒' },
      { text: '眼眶微涩，四肢略感沉重无力', weather: 'rainy', hint: '悲伤、失落带来的抑郁型能量滞缓' },
      { text: '后颈紧绷、肩背僵硬，心跳较快', weather: 'thunder', hint: '压力应激状态下的战斗-逃跑激活' },
    ],
  },
  {
    id: 4,
    question: '在人际交往中，你最近更倾向于采取哪种相处姿态？',
    scenePrompt: '依恋与社交防御机制观察',
    options: [
      { text: '乐于倾听与分享，感受彼此流动的暖意', weather: 'sunny', hint: '安全而开放的社交心境' },
      { text: '原谅了某件曾纠结的事，愿意重新敞开心扉', weather: 'rainbow', hint: '认知重构与人际和解' },
      { text: '极容易被外界的琐事点燃，渴望发声或抗争', weather: 'tornado', hint: '边界感被侵蚀，防御性外化' },
      { text: '不想社交，只想把自己包裹在安静的壳里', weather: 'rainy', hint: '需要低刺激度的自我关怀空间' },
      { text: '担心事情出错或令他人失望，反复确认细节', weather: 'thunder', hint: '高敏感与过度负责带来的内耗' },
    ],
  },
  {
    id: 5,
    question: '若今天能收到宇宙寄来的一张治愈明信片，你最希望上面写着：',
    scenePrompt: '核心心理渴求与赋能导向',
    options: [
      { text: '“享受今天的美好，你值得世间所有的温柔。”', weather: 'sunny', hint: '肯定与悦纳' },
      { text: '“最难的时刻已经过去，转角即是万里晴空。”', weather: 'rainbow', hint: '希望与释怀' },
      { text: '“你的愤怒有理有据，但请别让烈火灼伤自己。”', weather: 'tornado', hint: '情绪接纳与边界梳理' },
      { text: '“允许自己难过，脆弱也是心灵深沉的力量。”', weather: 'rainy', hint: '无条件的自我慈悲' },
      { text: '“不必事事完美，此时此地你已经做得很好了。”', weather: 'thunder', hint: '安全感与焦虑解除' },
    ],
  },
];

export const MoodQuizModal: React.FC<MoodQuizModalProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<WeatherType[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedWeather, setGeneratedWeather] = useState<WeatherType | null>(null);

  const currentQ = QUIZ_QUESTIONS[currentStep];

  const handleSelectOption = (weather: WeatherType) => {
    const updated = [...selectedAnswers, weather];
    setSelectedAnswers(updated);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete test, calculate dominant weather
      setIsGenerating(true);

      const counts: Record<WeatherType, number> = {
        sunny: 0,
        rainbow: 0,
        tornado: 0,
        rainy: 0,
        thunder: 0,
      };

      updated.forEach((w) => {
        counts[w]++;
      });

      // Find max weather
      let maxWeather: WeatherType = 'sunny';
      let maxCount = -1;
      (Object.keys(counts) as WeatherType[]).forEach((w) => {
        if (counts[w] > maxCount) {
          maxCount = counts[w];
          maxWeather = w;
        }
      });

      setGeneratedWeather(maxWeather);

      // Simulate the breathing generation transition
      setTimeout(() => {
        onComplete(maxWeather);
      }, 2600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#FAF9F6]/95 border border-white/80 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Generating Transition State */}
        {isGenerating && generatedWeather ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-100/70 animate-ping-slow" />
              <div className="relative w-24 h-24 rounded-full bg-white/90 border border-stone-200/80 shadow-lg flex items-center justify-center text-4xl">
                {WEATHER_CONFIGS[generatedWeather].icon}
              </div>
            </div>

            <h3 className="text-xl font-bold text-stone-800 mb-2 font-serif">
              正在生成你的专属心象岛屿…
            </h3>
            <p className="text-sm text-stone-500 max-w-sm mb-6 leading-relaxed">
              心象映射结果：【{WEATHER_CONFIGS[generatedWeather].name} · {WEATHER_CONFIGS[generatedWeather].emotion}】
              <br />
              云雾正在散开，微风正向你的心象小岛吹拂。
            </p>

            <div className="w-48 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-amber-300 via-rose-300 to-sky-300 animate-pulse" />
            </div>
          </div>
        ) : (
          /* Quiz Question Flow */
          <div>
            {/* Header / Progress */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200/60">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-stone-800">
                  心象天气投射测验
                </span>
                <span className="text-xs text-stone-400">
                  ({currentStep + 1} / {QUIZ_QUESTIONS.length})
                </span>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  稍后再测
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-stone-100 rounded-full mb-6 overflow-hidden">
              <div
                style={{ width: `${((currentStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-300"
              />
            </div>

            {/* Question Text */}
            <div className="mb-6">
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full inline-block mb-2">
                {currentQ.scenePrompt}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-stone-800 leading-snug font-serif">
                {currentQ.question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option.weather)}
                  className="w-full text-left p-4 rounded-2xl bg-white/70 hover:bg-white border border-stone-200/70 hover:border-amber-300 shadow-xs hover:shadow-md transition-all group flex items-start gap-3.5"
                >
                  <div className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center text-xs font-medium text-stone-400 group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0 mt-0.5">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800 group-hover:text-stone-900 transition-colors">
                      {option.text}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1 group-hover:text-amber-800/80 transition-colors">
                      {option.hint}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
