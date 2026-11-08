/**
 * 晴愈 (QingYu) - 岛屿生态系统与长期心象成长管理服务
 * 记录用户日常登录、情绪记录与疗愈活动，驱动岛屿自动生长低多边形植被（灌木、苔藓、多肉、野花、夜光蕈）
 */

import { IslandFloraItem, EcosystemProfile } from '../types';

const STORAGE_KEY = 'qingyu_ecosystem_profile';

// 12 组分布在悬浮岛上的低多边形生态植被配置
export const ISLAND_FLORA_REGISTRY: IslandFloraItem[] = [
  {
    id: 'moss_stepping_stones',
    name: '青茵绒苔',
    type: 'moss',
    unlockThreshold: 0, // 初始生长
    position: [-1.4, 1.92, 1.8],
    scale: 1.0,
    rotationY: 0.3,
    color: 0x22c55e,
    accentColor: 0x86efac,
    stageName: '生命萌动',
    storyHint: '当心绪停泊于此刻，生命的青绿已在微细处静静蔓延。',
  },
  {
    id: 'shrub_mint_plateau',
    name: '青岚薄荷灌木',
    type: 'shrub',
    unlockThreshold: 10,
    position: [2.2, 1.92, -2.4],
    scale: 0.95,
    rotationY: 1.1,
    color: 0x6ee7b7,
    accentColor: 0xfde047,
    stageName: '清风初抚',
    storyHint: '每一次有意识的深呼吸，都是灌木抽出的第一片嫩芽。',
  },
  {
    id: 'wildflower_sakura',
    name: '朝露粉樱野花',
    type: 'wildflower',
    unlockThreshold: 20,
    position: [-2.6, 1.95, 1.4],
    scale: 1.1,
    rotationY: 0.6,
    color: 0xfbcfe8,
    accentColor: 0xf472b6,
    stageName: '柔光绽放',
    storyHint: '接纳脆弱时的微光，在低多边形的棱角间开出最柔软的花。',
  },
  {
    id: 'moss_water_edge',
    name: '水湄青茸苔藓',
    type: 'moss',
    unlockThreshold: 30,
    position: [1.6, 1.90, 0.4],
    scale: 1.25,
    rotationY: 2.2,
    color: 0x16a34a,
    accentColor: 0x4ade80,
    stageName: '润泽相伴',
    storyHint: '流水不争先，争的是滔滔不绝；心念如水，浸润心象之岛。',
  },
  {
    id: 'succulent_stone_rosette',
    name: '碧玉多肉石莲',
    type: 'succulent',
    unlockThreshold: 45,
    position: [-4.2, 1.94, -0.6],
    scale: 1.05,
    rotationY: 0.8,
    color: 0x5eead4,
    accentColor: 0x2dd4bf,
    stageName: '坚韧守护',
    storyHint: '在岩石坚硬的边缘，生出饱满温润的自我防御与包容。',
  },
  {
    id: 'shrub_lilac_haven',
    name: '薰衣草莫兰迪灌木',
    type: 'shrub',
    unlockThreshold: 60,
    position: [3.4, 1.98, 1.2],
    scale: 1.15,
    rotationY: 2.7,
    color: 0xc4b5fd,
    accentColor: 0x8b5cf6,
    stageName: '宁静芳香',
    storyHint: '薰衣草的色调让焦虑的神经逐渐沉静入梦。',
  },
  {
    id: 'fern_cliff_cascade',
    name: '垂泉翠羽水蕨',
    type: 'fern',
    unlockThreshold: 80,
    position: [-3.6, 1.92, 0.9],
    scale: 1.1,
    rotationY: 1.5,
    color: 0x10b981,
    accentColor: 0x34d399,
    stageName: '顺势而生',
    storyHint: '瀑布跌宕处生长的蕨类，懂得顺应每一次起伏并借势舒展。',
  },
  {
    id: 'mushroom_crystal_glow',
    name: '夜光幽兰幻蕈',
    type: 'mushroom',
    unlockThreshold: 100,
    position: [-3.8, 2.45, -2.8],
    scale: 1.0,
    rotationY: 0.4,
    color: 0x93c5fd,
    accentColor: 0x60a5fa,
    stageName: '暗夜微光',
    storyHint: '即便在暴风雨与暗夜之中，心底也有悄然自愈的荧光菌落。',
  },
  {
    id: 'wildflower_buttercup',
    name: '金盏暖阳丛花',
    type: 'wildflower',
    unlockThreshold: 125,
    position: [2.4, 1.92, -1.8],
    scale: 1.15,
    rotationY: 1.9,
    color: 0xfef08a,
    accentColor: 0xfacc15,
    stageName: '晴暖丰盈',
    storyHint: '积累的每一个感恩瞬间，都在向阳的一侧化作金黄的小花。',
  },
  {
    id: 'shrub_coral_blossom',
    name: '珊瑚桃粉繁花灌木',
    type: 'shrub',
    unlockThreshold: 150,
    position: [2.6, 2.2, 2.6],
    scale: 1.2,
    rotationY: 0.9,
    color: 0xfca5a5,
    accentColor: 0xef4444,
    stageName: '繁花似锦',
    storyHint: '持续的心理觉察让心象岛屿逐渐演化为自给自足的心灵绿洲。',
  },
  {
    id: 'succulent_cliff_amethyst',
    name: '紫晶崖壁长生草',
    type: 'succulent',
    unlockThreshold: 180,
    position: [4.6, 1.6, 0.4],
    scale: 1.1,
    rotationY: 2.1,
    color: 0xa855f7,
    accentColor: 0xd8b4fe,
    stageName: '超然豁达',
    storyHint: '险峻断崖也是景致，心中的边界正蜕变为探索世界的开阔视界。',
  },
  {
    id: 'sacred_tree_sprout',
    name: '心象守护生命树幼株',
    type: 'shrub',
    unlockThreshold: 220,
    position: [0.3, 2.0, -1.8],
    scale: 1.35,
    rotationY: 0.1,
    color: 0x34d399,
    accentColor: 0xfef08a,
    stageName: '生态大成 · 庇佑之心',
    storyHint: '参天之木必有其根；历经风雨的心象岛屿，已生长出坚不可摧的本真自我。',
  },
];

type EcosystemListener = (profile: EcosystemProfile, newlyUnlocked?: IslandFloraItem) => void;

class EcosystemService {
  private listeners: Set<EcosystemListener> = new Set();
  private profile: EcosystemProfile;

  constructor() {
    this.profile = this.loadProfile();
    this.checkDailyLogin();
  }

  private loadProfile(): EcosystemProfile {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          growthPoints: parsed.growthPoints ?? 35, // 初始带有适度生机 (Lv.1~2 基础植被)
          loginStreakDays: parsed.loginStreakDays ?? 1,
          totalActivitiesCount: parsed.totalActivitiesCount ?? 3,
          lastActiveDate: parsed.lastActiveDate ?? new Date().toISOString().split('T')[0],
          unlockedFloraIds: parsed.unlockedFloraIds ?? ['moss_stepping_stones', 'shrub_mint_plateau', 'wildflower_sakura'],
        };
      }
    } catch {
      // ignore
    }

    // 默认新用户预设生态配置：带有 3 丛基础植被，激发探索欲
    const initialPoints = 35;
    const initialFloraIds = ISLAND_FLORA_REGISTRY
      .filter((f) => f.unlockThreshold <= initialPoints)
      .map((f) => f.id);

    return {
      growthPoints: initialPoints,
      loginStreakDays: 1,
      totalActivitiesCount: 3,
      lastActiveDate: new Date().toISOString().split('T')[0],
      unlockedFloraIds: initialFloraIds,
    };
  }

  private saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // ignore
    }
  }

  public getProfile(): EcosystemProfile {
    return { ...this.profile };
  }

  public getFloraRegistry(): IslandFloraItem[] {
    return ISLAND_FLORA_REGISTRY;
  }

  public getUnlockedFlora(): IslandFloraItem[] {
    return ISLAND_FLORA_REGISTRY.filter((f) => f.unlockThreshold <= this.profile.growthPoints);
  }

  public getGrowthLevel(): { level: number; title: string; nextThreshold: number; progress: number } {
    const points = this.profile.growthPoints;
    if (points < 20) {
      return { level: 1, title: '初萌荒丘', nextThreshold: 20, progress: points / 20 };
    } else if (points < 60) {
      return { level: 2, title: '青苔微茵', nextThreshold: 60, progress: (points - 20) / 40 };
    } else if (points < 120) {
      return { level: 3, title: '郁葱灌木', nextThreshold: 120, progress: (points - 60) / 60 };
    } else if (points < 180) {
      return { level: 4, title: '繁花清溪', nextThreshold: 180, progress: (points - 120) / 60 };
    } else {
      return { level: 5, title: '生命丰茂之境', nextThreshold: 250, progress: Math.min(1, (points - 180) / 70) };
    }
  }

  /**
   * 记录每日连续登录成长
   */
  public checkDailyLogin(): { pointsAwarded: number; streak: number } {
    const today = new Date().toISOString().split('T')[0];
    let pointsAwarded = 0;

    if (this.profile.lastActiveDate !== today) {
      const last = new Date(this.profile.lastActiveDate);
      const now = new Date(today);
      const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        this.profile.loginStreakDays += 1;
      } else if (diffDays > 1) {
        this.profile.loginStreakDays = 1;
      }

      // 每日登录奖励 15 点心象成长点
      pointsAwarded = 15;
      this.profile.growthPoints += pointsAwarded;
      this.profile.lastActiveDate = today;

      this.evaluateUnlocks();
      this.saveProfile();
      this.notifyListeners();
    }

    return { pointsAwarded, streak: this.profile.loginStreakDays };
  }

  /**
   * 记录疗愈小游戏或心象日记完成
   */
  public recordHealingActivity(activityName: string, points = 12): { newFlora?: IslandFloraItem } {
    this.profile.totalActivitiesCount += 1;
    this.profile.growthPoints += points;

    const newlyUnlocked = this.evaluateUnlocks();
    this.saveProfile();
    this.notifyListeners(newlyUnlocked[0]);

    return { newFlora: newlyUnlocked[0] };
  }

  private evaluateUnlocks(): IslandFloraItem[] {
    const newlyUnlocked: IslandFloraItem[] = [];
    ISLAND_FLORA_REGISTRY.forEach((flora) => {
      if (
        flora.unlockThreshold <= this.profile.growthPoints &&
        !this.profile.unlockedFloraIds.includes(flora.id)
      ) {
        this.profile.unlockedFloraIds.push(flora.id);
        newlyUnlocked.push(flora);
      }
    });
    return newlyUnlocked;
  }

  public subscribe(listener: EcosystemListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(newlyUnlocked?: IslandFloraItem) {
    const snapshot = this.getProfile();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot, newlyUnlocked);
      } catch (err) {
        console.error('Ecosystem listener error:', err);
      }
    });
  }
}

export const ecosystemService = new EcosystemService();
