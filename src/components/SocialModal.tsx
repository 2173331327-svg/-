/**
 * 晴愈 - 温暖社交系统 (Social Modal)
 * 好友心象岛屿、互送心意礼物 (遮阳伞/暖心抱抱/千纸鹤)、
 * 雨天抱团同频互助区与全晴大社区
 */

import React, { useState } from 'react';
import { X, Users, Heart, Send, Umbrella, Gift, Feather, MessageCircle, Sparkles, Plus } from 'lucide-react';
import { FriendIsland, CommunityPost, WeatherType, WEATHER_CONFIGS } from '../types';
import { audioEngine } from '../services/audioEngine';

interface SocialModalProps {
  onClose: () => void;
  userWeather: WeatherType;
}

const INITIAL_FRIENDS: FriendIsland[] = [
  {
    id: 'f1',
    name: '林微凉',
    avatar: '🍃',
    weather: 'rainy',
    islandStatus: 'TA的岛屿今天有微雨，溪流静静流淌',
    lastActive: '10分钟前',
    receivedGifts: 12,
  },
  {
    id: 'f2',
    name: '云舒',
    avatar: '☁️',
    weather: 'thunder',
    islandStatus: '岛屿上空有积压的雷云，正在做4-7-8深呼吸',
    lastActive: '刚刚',
    receivedGifts: 8,
  },
  {
    id: 'f3',
    name: '知白',
    avatar: '🕊️',
    weather: 'rainbow',
    islandStatus: '经历了昨天的暴风雨，天边升起了澄净的双彩虹',
    lastActive: '1小时前',
    receivedGifts: 24,
  },
  {
    id: 'f4',
    name: '安生',
    avatar: '🌸',
    weather: 'sunny',
    islandStatus: '心象小岛阳光灿烂，樱花树下落英缤纷',
    lastActive: '30分钟前',
    receivedGifts: 31,
  },
  {
    id: 'f5',
    name: '木心',
    avatar: '🪵',
    weather: 'tornado',
    islandStatus: '有些事情打破了原定计划，正在海边散步理清思绪',
    lastActive: '2小时前',
    receivedGifts: 15,
  },
];

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    author: '云舒',
    avatar: '☁️',
    weatherTag: 'thunder',
    category: 'rainy_empathy',
    content: '今天周一早会任务排得特别满，心跳从起床开始就砰砰直跳。刚才在岛上做了三组呼吸练习，后颈的酸胀稍微松开了些。在这里给自己留一个不用逞强的角落。',
    timestamp: '25分钟前',
    likes: 18,
    replies: [
      { id: 'r1', author: '林微凉', content: '给你寄了一柄遮阳伞，先把今天拆成一件件最小的事慢慢做。', timestamp: '18分钟前' },
      { id: 'r2', author: '知白', content: '抱抱你，焦虑也是身体在保护我们，慢慢来。', timestamp: '10分钟前' },
    ],
  },
  {
    id: 'p2',
    author: '小鹿斑比',
    avatar: '🦌',
    weatherTag: 'rainy',
    category: 'rainy_empathy',
    content: '考研二战模拟考成绩不理想，一个人在自习室走廊吹了很久的风。眼泪忍不住流下来，但哭完之后感觉心里轻快了一点点。',
    timestamp: '2小时前',
    likes: 34,
    replies: [
      { id: 'r3', author: '安生', content: '哭泣是心灵在排毒，你走过的每一步都不会白费。', timestamp: '1小时前' },
    ],
  },
  {
    id: 'p3',
    author: '安生',
    avatar: '🌸',
    weatherTag: 'sunny',
    category: 'sunny_share',
    content: '今天在岛屿种出了三朵“青岫风铃”，窗外恰好也有一阵凉爽的微风吹过。生活里很多小确幸，不需要盛大，只需要此刻驻足看见。',
    timestamp: '3小时前',
    likes: 42,
    replies: [
      { id: 'r4', author: '木心', content: '被你的文字治愈了，我也要去给小树浇水了！', timestamp: '2小时前' },
    ],
  },
];

export const SocialModal: React.FC<SocialModalProps> = ({ onClose, userWeather }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'rainy_community' | 'sunny_community'>('friends');
  const [friends, setFriends] = useState<FriendIsland[]>(INITIAL_FRIENDS);
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [giftFeedback, setGiftFeedback] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const handleSendGift = (friendId: string, giftName: '遮阳伞' | '暖心抱抱' | '千纸鹤') => {
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, receivedGifts: f.receivedGifts + 1 } : f))
    );
    audioEngine.playGiftSentSound();
    setGiftFeedback(`已成功向好友赠送【${giftName}】，温暖已抵达 TA 的岛屿。`);
    setTimeout(() => setGiftFeedback(null), 3000);
  };

  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const isLiked = p.isLiked;
        return {
          ...p,
          isLiked: !isLiked,
          likes: isLiked ? p.likes - 1 : p.likes + 1,
        };
      })
    );
    audioEngine.playBloomSound();
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const category = activeTab === 'rainy_community' ? 'rainy_empathy' : 'sunny_share';
    const newPost: CommunityPost = {
      id: 'p_' + Date.now(),
      author: '我 (心象旅人)',
      avatar: '🌿',
      weatherTag: userWeather,
      category,
      content: newPostContent,
      timestamp: '刚刚',
      likes: 1,
      isLiked: true,
      replies: [],
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
    audioEngine.playPlantSeedSound();
  };

  const handleAddReply = (postId: string) => {
    const text = replyInputs[postId];
    if (!text || !text.trim()) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          replies: [
            ...p.replies,
            {
              id: 'r_' + Date.now(),
              author: '我',
              content: text.trim(),
              timestamp: '刚刚',
            },
          ],
        };
      })
    );

    setReplyInputs({ ...replyInputs, [postId]: '' });
    audioEngine.playEtherealNote(2);
  };

  const filteredPosts = posts.filter((p) =>
    activeTab === 'rainy_community'
      ? p.category === 'rainy_empathy'
      : p.category === 'sunny_share'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[88vh] bg-[#FAF9F6]/95 border border-white/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/60 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                温情同频社区与好友岛屿
              </h2>
              <p className="text-xs text-stone-500">
                互相守望天气阴晴，互赠微光与心意，没有负能量审判，只有真诚陪伴
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl">
              <button
                onClick={() => setActiveTab('friends')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'friends' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                好友小岛
              </button>
              <button
                onClick={() => setActiveTab('rainy_community')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'rainy_community' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                雨天抱团区
              </button>
              <button
                onClick={() => setActiveTab('sunny_community')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'sunny_community' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                全晴大社区
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

        {/* Gift feedback banner */}
        {giftFeedback && (
          <div className="bg-emerald-50 text-emerald-800 px-6 py-2 text-xs flex items-center justify-between border-b border-emerald-100 animate-fade-in">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              {giftFeedback}
            </span>
            <button onClick={() => setGiftFeedback(null)} className="text-stone-400 hover:text-stone-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Friends Island List */}
        {activeTab === 'friends' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="text-xs text-stone-500 mb-2">
              看看好友的岛屿今天在下雨还是放晴，送一份心意安抚 TA 的心象：
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((friend) => {
                const wConfig = WEATHER_CONFIGS[friend.weather];
                return (
                  <div
                    key={friend.id}
                    className="p-4 bg-white/80 hover:bg-white border border-stone-200/80 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-xl">
                            {friend.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-stone-800">{friend.name}</span>
                              <span className="text-sm">{wConfig.icon}</span>
                            </div>
                            <span className="text-[11px] text-stone-400">活跃于 {friend.lastActive}</span>
                          </div>
                        </div>

                        <span
                          style={{ color: wConfig.color }}
                          className="text-[11px] font-semibold bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100"
                        >
                          {wConfig.name}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 bg-stone-50/70 p-2.5 rounded-xl border border-stone-100 mb-3">
                        {friend.islandStatus}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">
                        收到礼物: {friend.receivedGifts} 件
                      </span>

                      {/* Gift Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendGift(friend.id, '遮阳伞')}
                          title="赠送遮阳伞"
                          className="px-2 py-1 text-[11px] bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg flex items-center gap-1 border border-sky-200/60 transition-colors"
                        >
                          <Umbrella className="w-3 h-3 text-sky-600" />
                          <span>遮阳伞</span>
                        </button>
                        <button
                          onClick={() => handleSendGift(friend.id, '暖心抱抱')}
                          title="赠送暖心抱抱"
                          className="px-2 py-1 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1 border border-rose-200/60 transition-colors"
                        >
                          <Heart className="w-3 h-3 text-rose-500" />
                          <span>抱抱</span>
                        </button>
                        <button
                          onClick={() => handleSendGift(friend.id, '千纸鹤')}
                          title="放飞千纸鹤"
                          className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1 border border-amber-200/60 transition-colors"
                        >
                          <Feather className="w-3 h-3 text-amber-600" />
                          <span>千纸鹤</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2 & 3: Community Boards */}
        {(activeTab === 'rainy_community' || activeTab === 'sunny_community') && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Community description banner */}
            <div className="p-3.5 rounded-2xl bg-stone-100/70 border border-stone-200/60 text-xs text-stone-600 flex items-center justify-between">
              <div>
                {activeTab === 'rainy_community' ? (
                  <span>
                    🌧️ <strong>雨天抱团区</strong>：同频倾诉与接纳空间。不必强装坚强，允许低落与困惑在此安全着陆。
                  </span>
                ) : (
                  <span>
                    ☀️ <strong>全晴大社区</strong>：记录与分享生活的微光、盛开的花朵与小确幸，让温暖彼此照亮。
                  </span>
                )}
              </div>
            </div>

            {/* Post Creation Box */}
            <form
              onSubmit={handleCreatePost}
              className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-2.5"
            >
              <textarea
                rows={2}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={
                  activeTab === 'rainy_community'
                    ? '写下心中的重负或阴霾，这里没有任何人会苛责你...'
                    : '分享今天遇见的温暖片段、刚刚盛开的花朵或晴空心情...'
                }
                className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-stone-400">
                  发帖将携带当前心象天气: {WEATHER_CONFIGS[userWeather].icon} {WEATHER_CONFIGS[userWeather].name}
                </span>
                <button
                  type="submit"
                  disabled={!newPostContent.trim()}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  发布动态
                </button>
              </div>
            </form>

            {/* Posts List */}
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const wConfig = WEATHER_CONFIGS[post.weatherTag];
                return (
                  <div
                    key={post.id}
                    className="p-5 bg-white/80 border border-stone-200/70 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-lg border border-stone-200/60">
                          {post.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-800">{post.author}</span>
                            <span className="text-xs">{wConfig.icon}</span>
                            <span className="text-[10px] text-stone-400 bg-stone-50 px-1.5 py-0.2 rounded border border-stone-100">
                              {wConfig.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400">{post.timestamp}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl border transition-all ${
                          post.isLiked
                            ? 'bg-rose-50 text-rose-600 border-rose-200 font-bold'
                            : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-rose-50/50'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{post.likes}</span>
                      </button>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed pl-1">
                      {post.content}
                    </p>

                    {/* Replies */}
                    {post.replies.length > 0 && (
                      <div className="pl-4 border-l-2 border-stone-100 space-y-1.5 py-1">
                        {post.replies.map((reply) => (
                          <div key={reply.id} className="text-[11px] text-stone-600 bg-stone-50/80 p-2 rounded-xl">
                            <span className="font-semibold text-stone-800 mr-1.5">{reply.author}:</span>
                            {reply.content}
                            <span className="text-[9px] text-stone-400 ml-2">{reply.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                      <input
                        type="text"
                        value={replyInputs[post.id] || ''}
                        onChange={(e) =>
                          setReplyInputs({ ...replyInputs, [post.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddReply(post.id);
                          }
                        }}
                        placeholder="写一句温暖的留言..."
                        className="flex-1 text-xs px-3 py-1.5 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:bg-white"
                      />
                      <button
                        onClick={() => handleAddReply(post.id)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-600 rounded-xl text-xs font-medium transition-colors"
                      >
                        回复
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
