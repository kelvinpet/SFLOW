import { Caption } from '../types';
import { generateWordTimestampsForText } from './srtParser';

export interface TargetLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_TRANSLATION_LANGUAGES: TargetLanguage[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

/**
 * Translates a single text using free MyMemory Translation API endpoint with fallback
 */
async function translateViaPublicApi(text: string, targetLang: string, sourceLang = 'auto'): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  const pair = sourceLang === 'auto' ? `en|${targetLang}` : `${sourceLang}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(pair)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.responseData?.translatedText) {
      // MyMemory sometimes returns warnings or HTML entities
      const decoded = data.responseData.translatedText
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      if (!decoded.startsWith('MYMEMORY WARNING')) {
        return decoded;
      }
    }
  } catch (err) {
    console.warn('MyMemory translation fallback failed:', err);
  }

  // Backup Google client free translate endpoint
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const gRes = await fetch(googleUrl);
    if (gRes.ok) {
      const gData = await gRes.json();
      if (Array.isArray(gData) && Array.isArray(gData[0])) {
        return gData[0].map((item: unknown[]) => item[0]).join('');
      }
    }
  } catch (err) {
    console.warn('Google client translate fallback failed:', err);
  }

  return cleanText;
}

/**
 * Translates all caption texts using OpenAI GPT with structured json output
 */
async function translateViaOpenAI(
  captions: Caption[],
  targetLanguageName: string,
  apiKey: string
): Promise<string[]> {
  const texts = captions.map((c) => c.text);
  
  const systemPrompt = `You are a professional video subtitle translator specialized in viral TikTok/Reels short-form content. 
Translate the provided array of video subtitle lines into ${targetLanguageName}.
Guidelines:
1. Keep the translations concise, punchy, natural, and accurately timed for spoken video cadence.
2. Match the tone and conversational energy of the original.
3. Return ONLY a valid JSON array of strings containing the translated lines in the exact same order and length as input.`;

  const userPrompt = JSON.stringify(texts);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI translation error: HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  // Support either { translations: [...] } or { result: [...] } or direct array
  const list = Array.isArray(parsed)
    ? parsed
    : parsed.translations || parsed.subtitles || parsed.lines || Object.values(parsed)[0];

  if (!Array.isArray(list) || list.length !== captions.length) {
    throw new Error('Translated item count mismatch');
  }

  return list.map((item) => String(item).trim());
}

/**
 * Main translation handler: bulk-translates captions with fallback, regenerating word timestamps
 */
export async function bulkTranslateCaptions(
  captions: Caption[],
  targetLangCode: string,
  apiKey?: string,
  onProgress?: (percent: number, status: string) => void
): Promise<Caption[]> {
  if (captions.length === 0) return [];

  const targetLang = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLangCode);
  const targetLangName = targetLang ? `${targetLang.name} (${targetLang.nativeName})` : targetLangCode;

  onProgress?.(10, `Starting translation to ${targetLang?.name || targetLangCode}...`);

  let translatedTexts: string[] = [];

  if (apiKey && apiKey.trim().startsWith('sk-')) {
    try {
      onProgress?.(30, `Using AI model to translate ${captions.length} captions...`);
      translatedTexts = await translateViaOpenAI(captions, targetLangName, apiKey);
      onProgress?.(80, 'Regenerating synchronized word timestamps...');
    } catch (openAiErr) {
      console.warn('OpenAI translation failed, falling back to instant translation engine:', openAiErr);
      onProgress?.(35, 'Switching to high-speed translation pipeline...');
      translatedTexts = [];
    }
  }

  // Fallback if OpenAI key not provided or request failed
  if (translatedTexts.length === 0) {
    const results: string[] = [];
    const total = captions.length;

    for (let i = 0; i < total; i++) {
      const cap = captions[i];
      const progressPercent = Math.round(20 + ((i + 1) / total) * 65);
      onProgress?.(
        progressPercent,
        `Translating subtitle block ${i + 1}/${total}...`
      );

      const translated = await translateViaPublicApi(cap.text, targetLangCode);
      results.push(translated || cap.text);
      // Small pause to prevent rate limiting
      if (total > 5) {
        await new Promise((r) => setTimeout(r, 60));
      }
    }
    translatedTexts = results;
  }

  onProgress?.(90, 'Applying translations & aligning audio tracks...');

  // Map translations to captions and regenerate proportional word timestamps
  const updatedCaptions: Caption[] = captions.map((cap, index) => {
    const newText = translatedTexts[index] || cap.text;
    const words = generateWordTimestampsForText(newText, cap.start, cap.end);
    return {
      ...cap,
      text: newText,
      words,
    };
  });

  onProgress?.(100, 'Translation complete!');
  return updatedCaptions;
}

/**
 * Translates a single text line into target language
 */
export async function translateSingleLine(
  text: string,
  targetLangCode: string
): Promise<string> {
  return await translateViaPublicApi(text, targetLangCode);
}

/**
 * Populates secondaryText for dual captions without altering the primary text or timing
 */
export async function bulkGenerateDualCaptions(
  captions: Caption[],
  targetLangCode: string,
  apiKey?: string,
  onProgress?: (percent: number, status: string) => void
): Promise<Caption[]> {
  if (captions.length === 0) return [];

  const targetLang = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLangCode);
  const targetLangName = targetLang ? `${targetLang.name} (${targetLang.nativeName})` : targetLangCode;

  onProgress?.(10, `Generating dual subtitles in ${targetLang?.name || targetLangCode}...`);

  let translatedTexts: string[] = [];

  if (apiKey && apiKey.trim().startsWith('sk-')) {
    try {
      onProgress?.(30, `Using AI to translate secondary captions...`);
      translatedTexts = await translateViaOpenAI(captions, targetLangName, apiKey);
    } catch (err) {
      console.warn('AI translation failed for dual captions, using fallback API:', err);
      translatedTexts = [];
    }
  }

  if (translatedTexts.length === 0) {
    const results: string[] = [];
    const total = captions.length;

    for (let i = 0; i < total; i++) {
      const cap = captions[i];
      const progressPercent = Math.round(20 + ((i + 1) / total) * 75);
      onProgress?.(progressPercent, `Translating secondary line ${i + 1}/${total}...`);

      const translated = await translateViaPublicApi(cap.text, targetLangCode);
      results.push(translated || cap.text);
      if (total > 5) {
        await new Promise((r) => setTimeout(r, 60));
      }
    }
    translatedTexts = results;
  }

  onProgress?.(95, 'Attaching secondary language tracks...');

  const updatedCaptions: Caption[] = captions.map((cap, index) => {
    const secondary = translatedTexts[index] || cap.text;
    return {
      ...cap,
      secondaryText: secondary,
    };
  });

  onProgress?.(100, 'Dual subtitles generated!');
  return updatedCaptions;
}

