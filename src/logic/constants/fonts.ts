/**
 * 字体常量 — 系统字体栈 + 候选字体检测池。
 *
 * SYSTEM_FONT_STACK 作为 CSS font-family 回退链，用于 App 根元素。
 * FONT_LIST 用于运行时检测用户本地已安装字体（document.fonts.check），
 * 检测到的可用字体会出现在设置面板的字体选择器中。
 *
 * FONT_LIST 按用途分类，新增字体时加入对应分组，避免跨平台重复。
 */
export const SYSTEM_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Noto Sans SC", "DengXian", "HarmonyOS Sans SC", "Microsoft YaHei", Arial, sans-serif'

export const FONT_LIST = [
  // ============================================================
  // 特殊
  // ============================================================
  'system',

  // ============================================================
  // 等宽 / 编程字体
  // ============================================================
  'Cascadia Code',
  'Cascadia Mono',
  'Consolas',
  'Courier',
  'Courier New',
  'Droid Sans Mono',
  'Fira Code',
  'Hack',
  'IBM Plex Mono',
  'Inconsolata',
  'Iosevka',
  'JetBrains Mono',
  'Liberation Mono',
  'LXGW WenKai',
  'LXGW WenKai Mono',
  'Maple Mono',
  'Menlo',
  'Monaco',
  'Sarasa Mono SC',
  'SF Mono',
  'Source Code Pro',
  'Ubuntu Mono',
  'Andale Mono',
  'Lucida Console',

  // ============================================================
  // UI 无衬线体
  // ============================================================
  'Inter',
  'Roboto',
  'Open Sans',
  'Noto Sans',
  'HarmonyOS Sans',
  'HarmonyOS Sans SC',
  'HarmonyOS Sans TC',
  'Sarasa Gothic SC',
  'Arial',
  'Helvetica',
  'Helvetica Neue',
  'Segoe UI',
  'Tahoma',
  'Verdana',
  'Trebuchet MS',
  'Geneva',
  'Gill Sans',
  'Futura',
  'Optima',
  'Avenir',
  'Avenir Next',
  'Avenir Next Condensed',
  'Arial Narrow',
  'Calibri',
  'Candara',
  'Corbel',
  'Bahnschrift',
  'Cantarell',
  'DejaVu Sans',
  'Franklin Gothic Medium',
  'Lucida Sans Unicode',
  'Microsoft Sans Serif',
  'Leelawadee UI',
  'Liberation Sans',
  'Nirmala UI',
  'Malgun Gothic',
  'Apple SD Gothic Neo',
  'Ubuntu',
  'Yu Gothic',

  // ============================================================
  // 衬线体
  // ============================================================
  'Noto Serif',
  'New York',
  'Georgia',
  'Times New Roman',
  'Times',
  'Baskerville',
  'Big Caslon',
  'Bodoni 72',
  'Bodoni 72 Oldstyle',
  'Cambria',
  'Charter',
  'Cochin',
  'Constantia',
  'Didot',
  'Hoefler Text',
  'Lucida Grande',
  'Luminari',
  'Palatino',
  'Palatino Linotype',
  'Rockwell',
  'Sitka',
  'Sylfaen',
  'American Typewriter',
  'DejaVu Serif',
  'Garamond',
  'Liberation Serif',

  // ============================================================
  // 中文无衬线体
  // ============================================================
  'PingFang SC',
  'Hiragino Sans GB',
  'Heiti SC',
  'STHeiti',
  'Microsoft YaHei',
  'Microsoft JhengHei',
  'SimHei',
  'DengXian',
  'Noto Sans SC',
  'Noto Sans TC',
  'Noto Sans HK',
  'Source Han Sans SC',
  'MS Gothic',

  // ============================================================
  // 中文宋体 / 楷体 / 仿宋
  // ============================================================
  'STSong',
  'SimSun',
  'NSimSun',
  'Noto Serif SC',
  'Noto Serif TC',
  'Source Han Serif SC',
  'STKaiti',
  'KaiTi',
  'STFangsong',
  'FangSong',
  'YouYuan',
  'MingLiU-ExtB',

  // ============================================================
  // 手写 / 书法体
  // ============================================================
  'Bradley Hand',
  'Brush Script MT',
  'Chalkboard',
  'Chalkboard SE',
  'Chalkduster',
  'Comic Sans MS',
  'Herculanum',
  'Marker Felt',
  'Noteworthy',
  'Papyrus',
  'Savoye LET',
  'SignPainter',
  'Snell Roundhand',
  'Trattatello',
  'Zapfino',
  'Segoe Print',
  'Segoe Script',
  'Ink Free',
  'Gabriola',

  // ============================================================
  // 展示 / 标题体
  // ============================================================
  'Impact',
  'Arial Black',
  'Copperplate',
  'DIN Alternate',
  'DIN Condensed',
  'Bodoni 72 Smallcaps',
  'Phosphate',
  'Skia',
  'Arial Unicode MS',
  'Cambria Math',
  'SF Pro Display',
  'SF Pro Text',

  // ============================================================
  // 本地字体（assets/fonts/ 打包的字体文件，无需系统安装即可使用）
  // ============================================================
  'Arial Rounded MT Bold',
  'OpenCherry',
  'KBD',
  'LED7',
  'Advanced Led Board-7',
  'KBSkittled',
  'LESLIEB',
  'The Led Display St',
  'LCDMono2',
  'LCD',
  'Pixel Lcd Machine',

  // ============================================================
  // 符号 / Emoji
  // ============================================================
  'Symbol',
  'Webdings',
  'Wingdings',
  'Segoe MDL2 Assets',
  'Segoe UI Emoji',
  'Segoe UI Symbol',
  'Segoe UI Historic',
  'HoloLens MDL2 Assets',
  'Apple Color Emoji',
  'Marlett',

  // ============================================================
  // 非拉丁语系
  // ============================================================
  'Ebrima',
  'Gadugi',
  'Javanese Text',
  'Microsoft Himalaya',
  'Microsoft New Tai Lue',
  'Microsoft PhagsPa',
  'Microsoft Tai Le',
  'Microsoft Yi Baiti',
  'Mongolian Baiti',
  'MV Boli',
  'Myanmar Text',
]
