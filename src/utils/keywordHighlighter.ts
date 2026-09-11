import { Caption } from '../types';

/**
 * High-impact emphasis words used by top short-form video editors (Opus Clip / CapCut)
 */
const POWER_WORDS = new Set([
  'SUCCESS', 'LIFE', 'FUTURE', 'NEVER', 'MONEY', 'GOAL', 'WIN', 'SECRET', 'POWER',
  'NOW', 'ALWAYS', 'FREE', 'RICH', 'BUILD', 'STOP', 'BEST', 'MINDSET', 'TRUTH',
  'CREATE', 'GREAT', 'BEST', 'FOCUS', 'CHANGE', 'ACTION', 'IMPORTANT', 'KEY', 'REAL',
  'IMPORTANT', 'IMPOSSIBLE', 'MAGIC', 'FREEDOM', 'HUSTLE', 'DISCIPLINE', 'HABIT'
]);

/**
 * Word-to-emoji mapping dictionary for context-aware emoji injection
 */
const EMOJI_MAP: Record<string, string> = {
  life: '✨',
  success: '🚀',
  future: '🔮',
  money: '💰',
  rich: '💵',
  win: '🏆',
  winner: '🥇',
  goal: '🎯',
  target: '🎯',
  secret: '🔑',
  key: '🔑',
  power: '⚡',
  fire: '🔥',
  flame: '🔥',
  hot: '🔥',
  great: '🌟',
  star: '⭐',
  build: '🛠️',
  work: '💼',
  hustle: '💪',
  strong: '💪',
  focus: '👁️',
  mindset: '🧠',
  brain: '🧠',
  idea: '💡',
  truth: '💯',
  love: '❤️',
  heart: '❤️',
  time: '⏳',
  clock: '⏰',
  speed: '⚡',
  fast: '🚀',
  stop: '🛑',
  warning: '⚠️',
  danger: '🚨',
  growth: '📈',
  market: '📊',
  king: '👑',
  queen: '👑',
  sparkle: '✨',
  light: '💡',
};

export interface HighlightStats {
  highlightedCount: number;
  emojisAddedCount: number;
}

/**
 * Automatically bolds high-impact emphasis words and injects context-relevant emojis into captions
 */
export function autoHighlightKeywordsAndEmojis(captions: Caption[]): {
  captions: Caption[];
  stats: HighlightStats;
} {
  let highlightedCount = 0;
  let emojisAddedCount = 0;

  const updated = captions.map((cap) => {
    let text = cap.text;
    const words = cap.words ? [...cap.words] : [];

    // Process individual words for power capitalization & emoji injection
    const textTokens = text.split(/(\s+)/);
    const newTokens = textTokens.map((token) => {
      const cleanToken = token.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
      const lowerToken = cleanToken.toLowerCase();

      let resultToken = token;

      // Check for power word accent capitalization
      if (POWER_WORDS.has(cleanToken) && token !== token.toUpperCase()) {
        resultToken = token.toUpperCase();
        highlightedCount++;
      }

      // Check for contextual emoji attachment
      if (EMOJI_MAP[lowerToken] && !token.includes(EMOJI_MAP[lowerToken])) {
        const emoji = EMOJI_MAP[lowerToken];
        resultToken = `${resultToken} ${emoji}`;
        emojisAddedCount++;
      }

      return resultToken;
    });

    const newText = newTokens.join('');

    return {
      ...cap,
      text: newText,
      words: words.length > 0 ? words : undefined,
    };
  });

  return {
    captions: updated,
    stats: { highlightedCount, emojisAddedCount },
  };
}
