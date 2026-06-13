/**
 * @module shimmer-bg/presets
 * @description 幻彩配色预设方案，每套包含浅色/深色各 6 色 + 推荐效果。
 * 预设选择是 UI 快捷操作：选中后颜色写入 shimmerBackgroundColors，效果写入 shimmerBackgroundEffect。
 * 预设 ID 不持久化，用户可基于预设自由编辑颜色。
 * @consumers BackgroundDrawer.vue
 */

import type { TShimmerEffect } from './constants'

export interface ShimmerPreset {
  id: string
  nameKey: string
  recommendedEffect: TShimmerEffect
  lightColors: [string, string, string, string, string, string]
  darkColors: [string, string, string, string, string, string]
}

export const SHIMMER_BG_PRESETS: ShimmerPreset[] = [
  {
    id: 'aurora',
    nameKey: 'shimmerBackground.presets.aurora',
    recommendedEffect: 'aurora',
    lightColors: [
      '#D1ADFF',
      '#98D69B',
      '#FAE390',
      '#FFACD8',
      '#7DD5FF',
      '#C8E6C9',
    ],
    darkColors: [
      '#6B4FAE',
      '#4A7A4D',
      '#B8A050',
      '#B06080',
      '#4080A0',
      '#4A6F5A',
    ],
  },
  {
    id: 'sunset',
    nameKey: 'shimmerBackground.presets.sunset',
    recommendedEffect: 'fluid',
    lightColors: [
      '#FF6B6B',
      '#FFD93D',
      '#FF9F43',
      '#EE5A24',
      '#C44569',
      '#FF6B6B',
    ],
    darkColors: [
      '#C0392B',
      '#F39C12',
      '#D35400',
      '#A93226',
      '#8E44AD',
      '#C0392B',
    ],
  },
  {
    id: 'ocean',
    nameKey: 'shimmerBackground.presets.ocean',
    recommendedEffect: 'waves',
    lightColors: [
      '#48DBFB',
      '#0ABDE3',
      '#1B9CFC',
      '#0A79DF',
      '#3B3B98',
      '#48DBFB',
    ],
    darkColors: [
      '#0ABDE3',
      '#1B9CFC',
      '#0A79DF',
      '#0652DD',
      '#1B1464',
      '#0ABDE3',
    ],
  },
  {
    id: 'neon',
    nameKey: 'shimmerBackground.presets.neon',
    recommendedEffect: 'drift',
    lightColors: [
      '#FF007F',
      '#00E5FF',
      '#FFEA00',
      '#00FF88',
      '#B400FF',
      '#FF007F',
    ],
    darkColors: [
      '#CC0066',
      '#00B3CC',
      '#CCBB00',
      '#00CC6E',
      '#9000CC',
      '#CC0066',
    ],
  },
  {
    id: 'forest',
    nameKey: 'shimmerBackground.presets.forest',
    recommendedEffect: 'mesh',
    lightColors: [
      '#2ECC71',
      '#27AE60',
      '#F39C12',
      '#E67E22',
      '#8E44AD',
      '#A6E3A1',
    ],
    darkColors: [
      '#1E8449',
      '#1A6B3C',
      '#C07B0E',
      '#C06A1C',
      '#6C3483',
      '#6B8E63',
    ],
  },
  {
    id: 'galaxy',
    nameKey: 'shimmerBackground.presets.galaxy',
    recommendedEffect: 'blobs',
    lightColors: [
      '#6C5CE7',
      '#A29BFE',
      '#FD79A8',
      '#00CEC9',
      '#DFE6E9',
      '#6C5CE7',
    ],
    darkColors: [
      '#4834D4',
      '#6C5CE7',
      '#B71540',
      '#00B894',
      '#2D3436',
      '#4834D4',
    ],
  },
  {
    id: 'spring',
    nameKey: 'shimmerBackground.presets.spring',
    recommendedEffect: 'ripple',
    lightColors: [
      '#F8BBD0',
      '#E1BEE7',
      '#C8E6C9',
      '#FFF9C4',
      '#BBDEFB',
      '#F0F4C3',
    ],
    darkColors: [
      '#C2185B',
      '#7B1FA2',
      '#388E3C',
      '#F9A825',
      '#1565C0',
      '#827717',
    ],
  },
  {
    id: 'midnight',
    nameKey: 'shimmerBackground.presets.midnight',
    recommendedEffect: 'noise',
    lightColors: [
      '#37474F',
      '#455A64',
      '#546E7A',
      '#607D8B',
      '#78909C',
      '#90A4AE',
    ],
    darkColors: [
      '#1A237E',
      '#283593',
      '#3949AB',
      '#3F51B5',
      '#5C6BC0',
      '#7986CB',
    ],
  },
]
