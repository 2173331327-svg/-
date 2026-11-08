export type WeatherType = 'sunny' | 'rainbow' | 'tornado' | 'rainy' | 'thunder';

export interface WeatherInfo {
  type: WeatherType;
  name: string;
  emotion: string;
  icon: string;
  description: string;
  color: string;
  skyColor: string;
  bgmType: string;
  baseBpm: number;
}

export const WEATHER_CONFIGS: Record<WeatherType, WeatherInfo> = {
  sunny: {
    type: 'sunny',
    name: '晴天',
    emotion: '喜悦 · 宁静',
    icon: '☀️',
    description: '阳光穿透云层洒落岛屿，微风拂动花瓣，心中是一片宽广与安宁。',
    color: '#FBBF24',
    skyColor: '#E0F2FE',
    bgmType: 'piano_soothing',
    baseBpm: 68,
  },
  rainbow: {
    type: 'rainbow',
    name: '雨过天晴',
    emotion: '释怀 · 希冀',
    icon: '🌈',
    description: '暴风雨后的天际横跨着温润的七彩虹桥，曾经沉重的心绪正在轻盈化解。',
    color: '#F472B6',
    skyColor: '#F3E8FF',
    bgmType: 'arpeggio_uplift',
    baseBpm: 76,
  },
  tornado: {
    type: 'tornado',
    name: '龙卷风',
    emotion: '愤怒 · 失控',
    icon: '🌪️',
    description: '呼啸的气流卷动尘土与落叶，强烈的波澜需要被安全地看见与温和引导。',
    color: '#FB923C',
    skyColor: '#F1F5F9',
    bgmType: 'turbulent_wind',
    baseBpm: 104,
  },
  rainy: {
    type: 'rainy',
    name: '阴雨天',
    emotion: '悲伤 · 沉闷',
    icon: '🌧️',
    description: '绵绵细雨浸润青苔，天空低垂如烟。允许自己在此刻安稳地难过与停泊。',
    color: '#60A5FA',
    skyColor: '#E2E8F0',
    bgmType: 'rain_minor',
    baseBpm: 60,
  },
  thunder: {
    type: 'thunder',
    name: '雷暴天',
    emotion: '恐惧 · 高压',
    icon: '🌩️',
    description: '乌云翻滚伴随电闪雷鸣，紧绷的神经正在警觉。深呼吸，这只是路过的云层。',
    color: '#818CF8',
    skyColor: '#CBD5E1',
    bgmType: 'storm_tension',
    baseBpm: 92,
  },
};

export interface QuizQuestion {
  id: number;
  question: string;
  scenePrompt: string;
  options: {
    text: string;
    weather: WeatherType;
    hint: string;
  }[];
}

export interface MoodDiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  weather: WeatherType;
  emotionRating: number; // 1-10
  triggerEvent: string;
  healingActivities: string[];
  gratitudeNote: string;
}

export interface FriendIsland {
  id: string;
  name: string;
  avatar: string;
  weather: WeatherType;
  islandStatus: string;
  lastActive: string;
  receivedGifts: number;
}

export interface CommunityPost {
  id: string;
  author: string;
  avatar: string;
  weatherTag: WeatherType;
  category: 'rainy_empathy' | 'sunny_share';
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
  replies: {
    id: string;
    author: string;
    content: string;
    timestamp: string;
  }[];
}

export type ActiveMiniGame = 'flower' | 'melody' | 'breathe' | 'whitenoise' | null;

export type FloraCategory = 'shrub' | 'moss' | 'wildflower' | 'succulent' | 'mushroom' | 'fern';

export interface IslandFloraItem {
  id: string;
  name: string;
  type: FloraCategory;
  unlockThreshold: number;
  position: [number, number, number];
  scale: number;
  rotationY: number;
  color: number;
  accentColor?: number;
  stageName: string;
  storyHint: string;
}

export interface EcosystemProfile {
  growthPoints: number;
  loginStreakDays: number;
  totalActivitiesCount: number;
  lastActiveDate: string;
  unlockedFloraIds: string[];
}
