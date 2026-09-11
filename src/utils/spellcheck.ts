import { Caption } from '../types';
import { generateWordTimestampsForText } from './srtParser';

// Comprehensive dictionary of common transcription typos, homophones & contractions
export const COMMON_TYPOS: Record<string, string> = {
  // Common misspellings & ASR artifacts
  teh: 'the',
  taht: 'that',
  waht: 'what',
  nad: 'and',
  adn: 'and',
  wiht: 'with',
  becuase: 'because',
  beacuse: 'because',
  definately: 'definitely',
  definitly: 'definitely',
  seperate: 'separate',
  untill: 'until',
  recieve: 'receive',
  recieved: 'received',
  occured: 'occurred',
  truely: 'truly',
  tommorow: 'tomorrow',
  tomorow: 'tomorrow',
  wierd: 'weird',
  neccessary: 'necessary',
  acheive: 'achieve',
  arguement: 'argument',
  calender: 'calendar',
  embarass: 'embarrass',
  enviroment: 'environment',
  goverment: 'government',
  pronounciation: 'pronunciation',
  suprise: 'surprise',
  thier: 'their',
  untilll: 'until',
  writting: 'writing',
  allways: 'always',
  alot: 'a lot',
  alright: 'all right',
  
  // Contractions without apostrophes
  dont: "don't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  hasnt: "hasn't",
  havent: "haven't",
  hadnt: "hadn't",
  doesnt: "doesn't",
  im: "I'm",
  youre: "you're",
  theyre: "they're",
  weve: "we've",
  theyve: "they've",
  youve: "you've",
  ive: "I've",
  youll: "you'll",
  theyll: "they'll",
  shell: "she'll",
  thats: "that's",
  whats: "what's",
  wheres: "where's",
  hows: "how's",
  theres: "there's",
  lets: "let's",
  
  // Common grammatical / transcription speech slips
  'should of': 'should have',
  'could of': 'could have',
  'would of': 'would have',
  'must of': 'must have',
};

export interface FixItem {
  captionIndex: number;
  captionId: string;
  original: string;
  corrected: string;
  reason: string;
}

export interface SpellcheckOptions {
  fixCapitalization?: boolean;
  fixContractions?: boolean;
  fixCommonTypos?: boolean;
  removeStutters?: boolean;
  formatNumbers?: boolean;
}

/**
 * Checks a single piece of text and returns corrected string + detected fixes
 */
export function cleanAndCorrectText(
  text: string,
  options: SpellcheckOptions = {
    fixCapitalization: true,
    fixContractions: true,
    fixCommonTypos: true,
    removeStutters: true,
  }
): { cleanedText: string; fixes: { from: string; to: string; reason: string }[] } {
  let result = text;
  const fixes: { from: string; to: string; reason: string }[] = [];

  // 1. Remove duplicate stutter words (e.g., "the the" -> "the", "and and" -> "and")
  if (options.removeStutters) {
    const stutterRegex = /\b(\w+)\s+\1\b/gi;
    let stutterMatch;
    while ((stutterMatch = stutterRegex.exec(result)) !== null) {
      const full = stutterMatch[0];
      const single = stutterMatch[1];
      fixes.push({ from: full, to: single, reason: 'Duplicate repeated word' });
    }
    result = result.replace(/\b(\w+)\s+\1\b/gi, '$1');
  }

  // 2. Fix multi-word idioms like "should of" -> "should have"
  if (options.fixCommonTypos) {
    const multiWordRules: [RegExp, string, string][] = [
      [/\bshould of\b/gi, 'should have', 'Grammar correction'],
      [/\bcould of\b/gi, 'could have', 'Grammar correction'],
      [/\bwould of\b/gi, 'would have', 'Grammar correction'],
      [/\bmust of\b/gi, 'must have', 'Grammar correction'],
    ];

    for (const [regex, replacement, reason] of multiWordRules) {
      if (regex.test(result)) {
        fixes.push({ from: regex.source, to: replacement, reason });
        result = result.replace(regex, replacement);
      }
    }
  }

  // 3. Fix single word typos, contractions, and capitalization of "I"
  const words = result.split(/(\s+|[.,!?;:"'()[\]{}])/);
  const correctedWords = words.map((token) => {
    // Check if token is standalone word
    const cleanWord = token.trim();
    if (!cleanWord) return token;

    // Fix standalone lowercase 'i'
    if (cleanWord === 'i') {
      fixes.push({ from: 'i', to: 'I', reason: 'Capitalize pronoun I' });
      return 'I';
    }

    const lower = cleanWord.toLowerCase();

    // Check typo dictionary
    if (options.fixCommonTypos || options.fixContractions) {
      if (COMMON_TYPOS[lower]) {
        let replacement = COMMON_TYPOS[lower];
        // Preserve title case if original was Title Cased
        if (cleanWord[0] === cleanWord[0].toUpperCase() && cleanWord.length > 1) {
          replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        fixes.push({ from: cleanWord, to: replacement, reason: 'Spelling/Contraction' });
        return replacement;
      }
    }

    return token;
  });

  result = correctedWords.join('');

  // 4. Fix Sentence Capitalization (First letter of sentence / after . ! ?)
  if (options.fixCapitalization && result.length > 0) {
    // Trim leading whitespace
    const trimmed = result.trimStart();
    const leadingSpace = result.slice(0, result.length - trimmed.length);
    if (trimmed.length > 0) {
      const firstChar = trimmed.charAt(0);
      if (firstChar >= 'a' && firstChar <= 'z') {
        const capitalizedFirst = firstChar.toUpperCase() + trimmed.slice(1);
        fixes.push({ from: firstChar, to: firstChar.toUpperCase(), reason: 'Sentence Capitalization' });
        result = leadingSpace + capitalizedFirst;
      }
    }

    // Capitalize after period, exclamation, question mark + space
    result = result.replace(/([.!?]\s+)([a-z])/g, (_match, prefix, char) => {
      fixes.push({ from: char, to: char.toUpperCase(), reason: 'Capitalize after punctuation' });
      return prefix + char.toUpperCase();
    });
  }

  // 5. Clean up rogue double spaces
  result = result.replace(/ {2,}/g, ' ');

  return { cleanedText: result, fixes };
}

/**
 * Bulk fixes all captions across the project
 */
export function autoFixAllCaptions(
  captions: Caption[],
  options: SpellcheckOptions = {
    fixCapitalization: true,
    fixContractions: true,
    fixCommonTypos: true,
    removeStutters: true,
  }
): {
  updatedCaptions: Caption[];
  totalFixesCount: number;
  affectedCaptionsCount: number;
  fixSummary: FixItem[];
} {
  const fixSummary: FixItem[] = [];
  let totalFixesCount = 0;
  let affectedCaptionsCount = 0;

  const updatedCaptions = captions.map((cap, index) => {
    const { cleanedText, fixes } = cleanAndCorrectText(cap.text, options);
    if (fixes.length > 0 && cleanedText !== cap.text) {
      totalFixesCount += fixes.length;
      affectedCaptionsCount += 1;
      fixes.forEach((f) => {
        fixSummary.push({
          captionIndex: index + 1,
          captionId: cap.id,
          original: f.from,
          corrected: f.to,
          reason: f.reason,
        });
      });

      const updatedWords = generateWordTimestampsForText(cleanedText, cap.start, cap.end);
      return {
        ...cap,
        text: cleanedText,
        words: updatedWords,
      };
    }
    return cap;
  });

  return {
    updatedCaptions,
    totalFixesCount,
    affectedCaptionsCount,
    fixSummary,
  };
}
