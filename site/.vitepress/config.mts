import { defineConfig } from 'vitepress'

const siteUrl = 'https://gxfg.github.io/newtab-naivetab'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/newtab-naivetab/",
  lang: 'zh-CN',
  title: "NaiveTab 新标签页",
  description: "可视化键盘展示书签和浏览器指令，肌肉记忆一键直达。支持自由拖拽、深度自定义外观、专注模式、云同步",
  head: [
    ['link', { rel: 'icon', size: 'any', href: '/newtab-naivetab/images/logo.svg' }],
    // 规范网址，防止 Google 报重复网页警告
    ['link', { rel: 'canonical', href: siteUrl }],
    ['meta', { name: 'google-site-verification', content: 'bd1267a4ec2bd851' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/images/logo.svg',
    nav: [
      { text: '首页', link: '/', },
      { text: '说明指南', link: '/guide/introduce.md' },
      { text: '安装教程', link: '/install/webstore.md' },
      {
        text: '更新日志',
        link: 'https://github.com/GXFG/newtab-naivetab/blob/main/CHANGELOG.md',
      },
      {
        text: '买杯咖啡',
        link: 'https://github.com/GXFG/newtab-naivetab/blob/main/sponsor.md',
      },
      {
        text: '反馈建议',
        items: [
          {
            text: 'Issue',
            link: 'https://github.com/GXFG/newtab-naivetab/issues',
          },
          {
            text: 'Email',
            link: 'mailto:gxfgim@outlook.com?subject=NaiveTab Feedback Translation',
          },
        ]
      },
    ],

    sidebar: [
      {
        text: '说明指南',
        items: [
          {
            text: '入门指南',
            items: [
              { text: '介绍', link: '/guide/introduce.md' },
              { text: '快速上手', link: '/guide/getting-started.md' },
              { text: '基础功能', link: '/guide/general.md' },
              { text: '编辑布局', link: '/guide/edit-layout.md' },
              { text: '自定义背景', link: '/guide/background.md' },
              { text: '同步与备份', link: '/guide/sync-backup.md' },
            ]
          },
          {
            text: '特色功能',
            items: [
              { text: '键盘书签', link: '/guide/keyboard-bookmark.md' },
              { text: '指令键盘', link: '/guide/command-shortcut.md' },
              { text: '书签文件夹', link: '/guide/bookmark-folder.md' },
              { text: '专注模式', link: '/guide/focus-mode.md' },
            ]
          },
          {
            text: '时间 & 日期',
            items: [
              { text: '时钟', link: '/guide/clock.md' },
              { text: '日期', link: '/guide/date.md' },
              { text: '万年历', link: '/guide/calendar.md' },
              { text: '今年进度', link: '/guide/year-progress.md' },
              { text: '倒计时', link: '/guide/countdown.md' },
            ]
          },
          {
            text: '效率工具',
            items: [
              { text: '搜索栏', link: '/guide/search.md' },
              { text: '备忘录', link: '/guide/memo.md' },
              { text: '天气', link: '/guide/weather.md' },
              { text: '资讯', link: '/guide/news.md' },
            ]
          },
          {
            text: '其他',
            items: [
              { text: 'FAQ', link: '/guide/faq.md' },
              { text: '贡献指南', link: '/guide/help-translation.md' },
            ]
          },
        ]
      },
      {
        text: '安装教程',
        items: [
          { text: '官方商店安装', link: '/install/webstore.md' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/GXFG/newtab-naivetab' }
    ],

    footer: {
      copyright: 'Copyright © 2026 GXFG'
    }
  }
})
