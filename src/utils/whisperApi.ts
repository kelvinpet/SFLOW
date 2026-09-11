import { Caption, WordTimestamp } from '../types';
import { generateWordTimestampsForText } from './srtParser';

export interface TranscriptionRequestOptions {
  provider: 'groq' | 'deepgram' | 'openai' | 'demo';
  apiKey: string;
  groqKey?: string;
  deepgramKey?: string;
  openaiKey?: string;
  model?: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

export interface WhisperOptions {
  apiKey: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

interface WhisperVerboseResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  words?: WhisperWord[];
  segments?: WhisperSegment[];
}

/**
 * Universal STT Dispatcher: Routes to Groq Whisper, Deepgram Nova, OpenAI Whisper, or Demo
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionRequestOptions,
  onStatusUpdate?: (step: string) => void
): Promise<{ captions: Caption[]; detectedLanguage?: string; providerUsed: string }> {
  const provider = options.provider || 'groq';

  if (provider === 'groq') {
    const key = options.groqKey || options.apiKey;
    const model = options.model || 'whisper-large-v3';
    const result = await transcribeWithGroq(audioBlob, { apiKey: key, model, language: options.language, prompt: options.prompt }, onStatusUpdate);
    return { ...result, providerUsed: `Groq Cloud (${model})` };
  }

  if (provider === 'deepgram') {
    const key = options.deepgramKey || options.apiKey;
    const model = options.model || 'nova-2';
    const result = await transcribeWithDeepgram(audioBlob, { apiKey: key, model, language: options.language }, onStatusUpdate);
    return { ...result, providerUsed: `Deepgram (${model})` };
  }

  if (provider === 'openai') {
    const key = options.openaiKey || options.apiKey;
    const result = await transcribeWithWhisper(audioBlob, { apiKey: key, language: options.language, prompt: options.prompt, temperature: options.temperature }, onStatusUpdate);
    return { ...result, providerUsed: 'OpenAI Whisper-1' };
  }

  // Demo Fallback
  onStatusUpdate?.('Generating smart aligned captions in Demo mode...');
  const demoCaps = generateDemoCaptions(18);
  return { captions: demoCaps, detectedLanguage: 'en', providerUsed: 'Studio High-Precision Demo' };
}

/**
 * Calls Groq Cloud Whisper API (ultra-fast transcription with whisper-large-v3 or whisper-large-v3-turbo)
 */
export async function transcribeWithGroq(
  audioBlob: Blob,
  options: { apiKey: string; model?: string; language?: string; prompt?: string },
  onStatusUpdate?: (step: string) => void
): Promise<{ captions: Caption[]; detectedLanguage?: string }> {
  if (!options.apiKey) {
    throw new Error('Groq API Key is missing. Please add your Groq API key in Settings or the AI Transcription dialog.');
  }

  onStatusUpdate?.('Preparing audio payload for Groq Cloud Whisper...');

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', options.model || 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  if (options.language && options.language !== 'auto') {
    formData.append('language', options.language);
  }

  if (options.prompt) {
    formData.append('prompt', options.prompt);
  }

  onStatusUpdate?.('Sending audio to Groq Whisper API (ultra-fast inference)...');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey.trim()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Groq transcription request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || response.statusText;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(`Groq Whisper Error: ${errorDetail}`);
  }

  onStatusUpdate?.('Parsing Groq word timestamps & sentence boundaries...');
  const data: WhisperVerboseResponse = await response.json();
  const captions = parseWhisperVerboseToCaptions(data);

  return {
    captions,
    detectedLanguage: data.language,
  };
}

/**
 * Calls Deepgram Nova Speech-To-Text API
 */
export async function transcribeWithDeepgram(
  audioBlob: Blob,
  options: { apiKey: string; model?: string; language?: string },
  onStatusUpdate?: (step: string) => void
): Promise<{ captions: Caption[]; detectedLanguage?: string }> {
  if (!options.apiKey) {
    throw new Error('Deepgram API Key is missing. Please add your Deepgram key in Settings or the transcription dialog.');
  }

  onStatusUpdate?.('Sending audio stream to Deepgram Nova STT API...');

  const model = options.model || 'nova-2';
  let queryParams = `model=${encodeURIComponent(model)}&smart_format=true&punctuate=true&utterances=true`;
  if (options.language && options.language !== 'auto') {
    queryParams += `&language=${encodeURIComponent(options.language)}`;
  }

  const response = await fetch(`https://api.deepgram.com/v1/listen?${queryParams}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${options.apiKey.trim()}`,
      'Content-Type': 'audio/wav',
    },
    body: audioBlob,
  });

  if (!response.ok) {
    let errorDetail = 'Deepgram request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.err_msg || errJson.error || response.statusText;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(`Deepgram Error: ${errorDetail}`);
  }

  onStatusUpdate?.('Formatting Deepgram Nova word timestamps & utterances...');
  const data = await response.json();

  const alt = data.results?.channels?.[0]?.alternatives?.[0];
  if (!alt || !alt.words || alt.words.length === 0) {
    if (alt?.transcript) {
      // Fallback if transcript has no words
      const text = alt.transcript.trim();
      const cap: Caption = {
        id: `dg-cap-0-${Date.now()}`,
        start: 0,
        end: 5,
        text,
        words: generateWordTimestampsForText(text, 0, 5),
      };
      return { captions: [cap], detectedLanguage: alt.detected_language || options.language };
    }
    throw new Error('Deepgram did not detect spoken words in this audio stream.');
  }

  const rawWords: Array<{ word: string; punctuated_word?: string; start: number; end: number }> = alt.words;
  const captions: Caption[] = [];
  let currentWords: WordTimestamp[] = [];
  let segStart = rawWords[0].start;

  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    const cleanWord = (w.punctuated_word || w.word || '').trim();
    if (!cleanWord) continue;

    currentWords.push({
      id: `w-${i}-${Math.random().toString(36).substring(2, 6)}`,
      word: cleanWord,
      start: Number(w.start.toFixed(2)),
      end: Number(w.end.toFixed(2)),
    });

    const isLast = i === rawWords.length - 1;
    const exceedsDuration = w.end - segStart >= 2.8;
    const isPunctuationBreak = /[.!?]$/.test(cleanWord) || (/[,\-:;]$/.test(cleanWord) && currentWords.length >= 4);

    if (isLast || (exceedsDuration && isPunctuationBreak) || currentWords.length >= 7) {
      const segEnd = w.end;
      const text = currentWords.map((cw) => cw.word).join(' ');
      captions.push({
        id: `cap-${captions.length}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        start: Number(segStart.toFixed(2)),
        end: Number(segEnd.toFixed(2)),
        text,
        words: [...currentWords],
      });
      currentWords = [];
      if (!isLast && rawWords[i + 1]) {
        segStart = rawWords[i + 1].start;
      }
    }
  }

  return {
    captions,
    detectedLanguage: alt.detected_language || options.language,
  };
}

/**
 * Helper to parse verbose_json structure from OpenAI or Groq into Caption[]
 */
function parseWhisperVerboseToCaptions(data: WhisperVerboseResponse): Caption[] {
  const captions: Caption[] = [];

  if (data.segments && data.segments.length > 0) {
    for (const seg of data.segments) {
      const segText = seg.text.trim();
      if (!segText) continue;

      let words: WordTimestamp[] = [];
      if (seg.words && seg.words.length > 0) {
        words = seg.words
          .map((w, idx) => ({
            id: `w-${seg.id}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            word: w.word.trim(),
            start: Number(w.start.toFixed(2)),
            end: Number(w.end.toFixed(2)),
          }))
          .filter((w) => w.word.length > 0);
      } else {
        words = generateWordTimestampsForText(segText, seg.start, seg.end);
      }

      captions.push({
        id: `cap-${seg.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        start: Number(seg.start.toFixed(2)),
        end: Number(seg.end.toFixed(2)),
        text: segText,
        words,
      });
    }
  } else if (data.words && data.words.length > 0) {
    let currentWords: WordTimestamp[] = [];
    let segStart = data.words[0].start;

    for (let i = 0; i < data.words.length; i++) {
      const w = data.words[i];
      currentWords.push({
        id: `w-${i}-${Math.random().toString(36).substring(2, 6)}`,
        word: w.word.trim(),
        start: Number(w.start.toFixed(2)),
        end: Number(w.end.toFixed(2)),
      });

      const isLast = i === data.words.length - 1;
      const exceedsDuration = w.end - segStart >= 3.0;
      const isSentenceEnd = /[.!?]$/.test(w.word.trim());

      if (isLast || (exceedsDuration && isSentenceEnd) || currentWords.length >= 8) {
        const segEnd = w.end;
        const text = currentWords.map((cw) => cw.word).join(' ');
        captions.push({
          id: `cap-${captions.length}-${Date.now()}`,
          start: Number(segStart.toFixed(2)),
          end: Number(segEnd.toFixed(2)),
          text,
          words: [...currentWords],
        });
        currentWords = [];
        if (!isLast && data.words[i + 1]) {
          segStart = data.words[i + 1].start;
        }
      }
    }
  } else if (data.text) {
    const sentences = data.text.match(/[^.!?]+[.!?]+/g) || [data.text];
    const totalDuration = data.duration || 10;
    const durPerSent = totalDuration / sentences.length;

    sentences.forEach((sent, idx) => {
      const sStart = Number((idx * durPerSent).toFixed(2));
      const sEnd = Number(((idx + 1) * durPerSent).toFixed(2));
      const text = sent.trim();
      captions.push({
        id: `cap-${idx}-${Date.now()}`,
        start: sStart,
        end: sEnd,
        text,
        words: generateWordTimestampsForText(text, sStart, sEnd),
      });
    });
  }

  return captions;
}

/**
 * Calls OpenAI Whisper API with verbose_json to get word-level and segment-level timestamps
 */
export async function transcribeWithWhisper(
  audioBlob: Blob,
  options: WhisperOptions,
  onStatusUpdate?: (step: string) => void
): Promise<{ captions: Caption[]; detectedLanguage?: string }> {
  if (!options.apiKey) {
    throw new Error('OpenAI API Key is missing. Please add your API key in Settings.');
  }

  onStatusUpdate?.('Preparing audio payload for OpenAI Whisper...');

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  if (options.language && options.language !== 'auto') {
    formData.append('language', options.language);
  }

  if (options.prompt) {
    formData.append('prompt', options.prompt);
  }

  if (options.temperature !== undefined) {
    formData.append('temperature', String(options.temperature));
  }

  onStatusUpdate?.('Sending audio to Whisper API (word timestamp mode)...');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey.trim()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Transcription request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || response.statusText;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(`OpenAI Whisper Error: ${errorDetail}`);
  }

  onStatusUpdate?.('Parsing word-level timestamps & segments...');
  const data: WhisperVerboseResponse = await response.json();
  const captions = parseWhisperVerboseToCaptions(data);

  return {
    captions,
    detectedLanguage: data.language,
  };
}

/**
 * Generate smart demo captions for sample or uploaded video when testing offline or without key
 */
export function generateDemoCaptions(duration: number = 15): Caption[] {
  const phrases = [
    { text: "Welcome to the ultimate Subtitle Studio and Video Caption Generator!", dur: 3.5, sec: "¡Bienvenido al mejor estudio de subtítulos y generador de videos!" },
    { text: "You can create viral TikTok and Instagram Reels subtitles with one click.", dur: 4.0, sec: "Crea subtítulos virales para TikTok y Reels con un solo clic." },
    { text: "Dynamic word-by-word karaoke animations keep your viewers hooked.", dur: 3.8, sec: "Las animaciones dinámicas palabra por palabra enganchan a tu audiencia." },
    { text: "Easily export to SRT, WebVTT, styled PNG frames, or burned-in video.", dur: 3.7, sec: "Exporta fácilmente a SRT, WebVTT, fotogramas PNG o video procesado." },
  ];

  let currentTime = 0.5;
  const result: Caption[] = [];

  for (let i = 0; i < phrases.length; i++) {
    const item = phrases[i];
    const start = Number(currentTime.toFixed(2));
    const end = Number(Math.min(duration, currentTime + item.dur).toFixed(2));
    if (start >= duration) break;

    const words = generateWordTimestampsForText(item.text, start, end);
    result.push({
      id: `demo-cap-${i}-${Date.now()}`,
      start,
      end,
      text: item.text,
      secondaryText: item.sec,
      words,
    });

    currentTime = end + 0.3;
  }

  return result;
}

