export const ICONS = {
  // widget icons
  keyboard: 'ic:outline-keyboard-alt',
  clockDigital: 'fluent-emoji-high-contrast:input-numbers',
  clockAnalog: 'grommet-icons:clock',
  date: 'system-uicons:calendar-date',
  calendar: 'uiw:date',
  yearProgress: 'lets-icons:time-progress',
  search: 'fluent:search-square-24-regular',
  weather: 'mdi:weather-cloudy',
  memo: 'material-symbols:note-alt-outline',
  news: 'majesticons:newspaper-line',
  // setting__label
  calendarHoliday: 'mdi:calendar-star',
  calendarToday: 'mdi:calendar-today',
  calendarRest: 'mdi:bed',
  calendarWork: 'mdi:briefcase-outline',
  yearProgressLeftText: 'mdi:format-text',
  yearProgressRightBlock: 'mdi:view-grid-outline',
  keyboardLabel: 'mdi:keyboard-outline',
  keyboardShellLabel: 'ri:terminal-line',
  keyboardPlateLabel: 'mdi:layers-outline',
  keyboardKeycapLabel: 'mdi:keyboard-variant',
  // common
  loading: 'eos-icons:loading',
  settings: 'ion:settings-outline',
  focus: 'ri:focus-2-line',
  dragDrop: 'tabler:drag-drop',
  fullscreen: 'dashicons:fullscreen-alt',
  sponsor: 'ci:coffee-togo',
  preview: 'fe:picture',
  edit: 'uil:edit',
  check: 'ic:outline-check',
  checkCircle: 'ic:outline-check-circle',
  info: 'ix:about',
  imageSquare: 'ph:image-square',
  zoomIn: 'tdesign:zoom-in',
  downloadFill: 'ri:download-2-fill',
  favorite: 'mi:favorite',
  favoriteLine: 'clarity:favorite-line',
  favoriteSolid: 'clarity:favorite-solid',
  deleteBin: 'ri:delete-bin-6-line',
  dockLeft: 'material-symbols:dock-to-left',
  dockBottom: 'material-symbols:dock-to-bottom',
  selectFinger: 'mingcute:finger-press-line',
  currentLocation: 'tabler:current-location',
  add: 'ic:outline-add',
  ban: 'ion:ban',
  save: 'mingcute:save-2-line',
  questionBold: 'ph:question-bold',
  // about & info
  bookOutline: 'material-symbols:book-2-outline',
  devGuideOutline: 'material-symbols:developer-guide-outline-rounded',
  newReleases: 'ic:outline-new-releases',
  feedbackMsg: 'bx:message-rounded-dots',
  thumbsUp: 'ph:thumbs-up-bold',
  githubLogo: 'carbon:logo-github',
  emailOutline: 'mdi:email-outline',
  // general actions
  importFile: 'uil:import',
  exportFile: 'uil:export',
  clearOutlined: 'ant-design:clear-outlined',
  restoreTwotone: 'ic:twotone-restore',
  // draft tool
  expandLess: 'ic:round-expand-less',
  trash: 'tabler:trash',
  trashX: 'tabler:trash-x',
  // weather widget
  warning: 'vaadin:warning',
  closeCircleLine: 'ri:close-circle-line',
  temp: 'raphael:temp',
  temperatureFeelsLike: 'carbon:temperature-feels-like',
  plusMinusBold: 'ph:plus-minus-bold',
  air: 'entypo:air',
  humidity: 'carbon:humidity',
  windyFill: 'ri:windy-fill',
  // search widget
  searchAction: 'il:search',
  // calendar widget
  angleLeft: 'fa-solid:angle-left',
  angleRight: 'fa-solid:angle-right',
  arrowBackward: 'si-glyph:arrow-backward',
  // bookmark
  resizeHeight: 'cil:resize-height',
  addSolid: 'zondicons:add-solid',
  keyboardCmdKey: 'ic:twotone-keyboard-command-key',
  openInNew: 'material-symbols:open-in-new',
  bookmarkPlus: 'lucide:bookmark-plus',
  folderOutline: 'ic:outline-folder',
  arrowBackRounded: 'material-symbols:arrow-back-rounded',
}

export type WidgetIconMeta = {
  iconName: string
  widgetSize: number
}

export type SettingIconMeta = {
  iconName: string
  settingSize: number
}

export const WIDGET_ICON_META: Record<WidgetCodes, WidgetIconMeta> = {
  keyboard: { iconName: ICONS.keyboard, widgetSize: 33 },
  clockDigital: { iconName: ICONS.clockDigital, widgetSize: 32 },
  clockAnalog: { iconName: ICONS.clockAnalog, widgetSize: 30 },
  date: { iconName: ICONS.date, widgetSize: 35 },
  calendar: { iconName: ICONS.calendar, widgetSize: 28 },
  yearProgress: { iconName: ICONS.yearProgress, widgetSize: 34 },
  search: { iconName: ICONS.search, widgetSize: 40 },
  weather: { iconName: ICONS.weather, widgetSize: 35 },
  memo: { iconName: ICONS.memo, widgetSize: 35 },
  news: { iconName: ICONS.news, widgetSize: 30 },
}

export const SETTING_ICON_META: Record<settingPanes, SettingIconMeta> = {
  general: { iconName: ICONS.settings, settingSize: 18 },
  focusMode: { iconName: ICONS.focus, settingSize: 18 },
  keyboard: { iconName: ICONS.keyboard, settingSize: 18 },
  clockDate: { iconName: ICONS.clockAnalog, settingSize: 17 },
  calendar: { iconName: ICONS.calendar, settingSize: 16 },
  yearProgress: { iconName: ICONS.yearProgress, settingSize: 18 },
  search: { iconName: ICONS.search, settingSize: 19 },
  weather: { iconName: ICONS.weather, settingSize: 19 },
  memo: { iconName: ICONS.memo, settingSize: 18 },
  news: { iconName: ICONS.news, settingSize: 18 },
  aboutSponsor: { iconName: ICONS.sponsor, settingSize: 19 },
  aboutIndex: { iconName: ICONS.info, settingSize: 19 },
}
