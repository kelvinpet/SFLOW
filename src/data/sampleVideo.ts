import { Caption } from '../types';

export interface SampleVideoItem {
  id: string;
  name: string;
  url: string;
  aspect: '9:16' | '16:9';
  captions: Caption[];
}

export const SAMPLE_VIDEOS: SampleVideoItem[] = [
  {
    id: 'sample-vertical-tech',
    name: '📱 Tech Creator Reel (Vertical 9:16)',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    aspect: '9:16',
    captions: [
      {
        id: 'cap-1',
        start: 0.2,
        end: 2.8,
        text: 'Stop scrolling and watch this right now!',
        words: [
          { id: 'w-1-1', word: 'Stop', start: 0.2, end: 0.6 },
          { id: 'w-1-2', word: 'scrolling', start: 0.6, end: 1.1 },
          { id: 'w-1-3', word: 'and', start: 1.1, end: 1.4 },
          { id: 'w-1-4', word: 'watch', start: 1.4, end: 1.8 },
          { id: 'w-1-5', word: 'this', start: 1.8, end: 2.2 },
          { id: 'w-1-6', word: 'right', start: 2.2, end: 2.5 },
          { id: 'w-1-7', word: 'now!', start: 2.5, end: 2.8 },
        ],
      },
      {
        id: 'cap-2',
        start: 3.0,
        end: 6.2,
        text: 'This one AI tool automatically generates viral captions for your videos.',
        words: [
          { id: 'w-2-1', word: 'This', start: 3.0, end: 3.3 },
          { id: 'w-2-2', word: 'one', start: 3.3, end: 3.6 },
          { id: 'w-2-3', word: 'AI', start: 3.6, end: 4.0 },
          { id: 'w-2-4', word: 'tool', start: 4.0, end: 4.4 },
          { id: 'w-2-5', word: 'automatically', start: 4.4, end: 5.0 },
          { id: 'w-2-6', word: 'generates', start: 5.0, end: 5.4 },
          { id: 'w-2-7', word: 'viral', start: 5.4, end: 5.7 },
          { id: 'w-2-8', word: 'captions', start: 5.7, end: 6.0 },
          { id: 'w-2-9', word: 'for', start: 6.0, end: 6.1 },
          { id: 'w-2-10', word: 'your', start: 6.1, end: 6.15 },
          { id: 'w-2-11', word: 'videos.', start: 6.15, end: 6.2 },
        ],
      },
      {
        id: 'cap-3',
        start: 6.5,
        end: 9.8,
        text: 'Notice how each word pops to keep viewers totally engaged.',
        words: [
          { id: 'w-3-1', word: 'Notice', start: 6.5, end: 7.0 },
          { id: 'w-3-2', word: 'how', start: 7.0, end: 7.3 },
          { id: 'w-3-3', word: 'each', start: 7.3, end: 7.7 },
          { id: 'w-3-4', word: 'word', start: 7.7, end: 8.1 },
          { id: 'w-3-5', word: 'pops', start: 8.1, end: 8.5 },
          { id: 'w-3-6', word: 'to', start: 8.5, end: 8.8 },
          { id: 'w-3-7', word: 'keep', start: 8.8, end: 9.1 },
          { id: 'w-3-8', word: 'viewers', start: 9.1, end: 9.4 },
          { id: 'w-3-9', word: 'totally', start: 9.4, end: 9.6 },
          { id: 'w-3-10', word: 'engaged.', start: 9.6, end: 9.8 },
        ],
      },
      {
        id: 'cap-4',
        start: 10.1,
        end: 14.5,
        text: 'Export directly to SRT or download your styled video in seconds!',
        words: [
          { id: 'w-4-1', word: 'Export', start: 10.1, end: 10.7 },
          { id: 'w-4-2', word: 'directly', start: 10.7, end: 11.3 },
          { id: 'w-4-3', word: 'to', start: 11.3, end: 11.6 },
          { id: 'w-4-4', word: 'SRT', start: 11.6, end: 12.1 },
          { id: 'w-4-5', word: 'or', start: 12.1, end: 12.4 },
          { id: 'w-4-6', word: 'download', start: 12.4, end: 13.0 },
          { id: 'w-4-7', word: 'your', start: 13.0, end: 13.3 },
          { id: 'w-4-8', word: 'styled', start: 13.3, end: 13.7 },
          { id: 'w-4-9', word: 'video', start: 13.7, end: 14.0 },
          { id: 'w-4-10', word: 'in', start: 14.0, end: 14.2 },
          { id: 'w-4-11', word: 'seconds!', start: 14.2, end: 14.5 },
        ],
      },
    ],
  },
  {
    id: 'sample-landscape-nature',
    name: '🌲 Cinematic Nature (Landscape 16:9)',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    aspect: '16:9',
    captions: [
      {
        id: 'cap-nature-1',
        start: 1.0,
        end: 4.5,
        text: 'Deep in the serene forest, morning sunlight breaks through the canopy.',
        words: [
          { id: 'w-n1', word: 'Deep', start: 1.0, end: 1.5 },
          { id: 'w-n2', word: 'in', start: 1.5, end: 1.8 },
          { id: 'w-n3', word: 'the', start: 1.8, end: 2.1 },
          { id: 'w-n4', word: 'serene', start: 2.1, end: 2.6 },
          { id: 'w-n5', word: 'forest,', start: 2.6, end: 3.1 },
          { id: 'w-n6', word: 'morning', start: 3.1, end: 3.6 },
          { id: 'w-n7', word: 'sunlight', start: 3.6, end: 4.0 },
          { id: 'w-n8', word: 'breaks', start: 4.0, end: 4.3 },
          { id: 'w-n9', word: 'through.', start: 4.3, end: 4.5 },
        ],
      },
      {
        id: 'cap-nature-2',
        start: 5.0,
        end: 8.5,
        text: 'Captions enhance accessibility and storytelling across all digital platforms.',
        words: [
          { id: 'w-n10', word: 'Captions', start: 5.0, end: 5.5 },
          { id: 'w-n11', word: 'enhance', start: 5.5, end: 6.0 },
          { id: 'w-n12', word: 'accessibility', start: 6.0, end: 6.8 },
          { id: 'w-n13', word: 'and', start: 6.8, end: 7.1 },
          { id: 'w-n14', word: 'storytelling', start: 7.1, end: 7.8 },
          { id: 'w-n15', word: 'across', start: 7.8, end: 8.1 },
          { id: 'w-n16', word: 'platforms.', start: 8.1, end: 8.5 },
        ],
      },
    ],
  },
];
