// lib/rewards.js
export const surpriseRewards = [
  {
    id: 'sunshine-title',
    type: 'title',
    label: '☀️ Sunshine Soul',
    description: 'You radiate warmth and light!',
  },
  {
    id: 'lucky-sticker',
    type: 'sticker',
    label: '🍀 Lucky Clover',
    description: 'A symbol of pure fortune.',
  },
  {
    id: 'heart-badge',
    type: 'badge',
    label: '❤️ Big Heart',
    description: 'For showing kindness and care.',
  },
  {
    id: 'rainbow-gift',
    type: 'gift',
    label: '🌈 Rainbow Gift',
    description: 'You bring colors to others’ days!',
  },
  {
    id: 'silent-supporter',
    type: 'title',
    label: '🌙 Silent Supporter',
    description: 'Quietly cheering from the shadows.',
  },
];

export const getRandomReward = () => {
  return surpriseRewards[Math.floor(Math.random() * surpriseRewards.length)];
};
