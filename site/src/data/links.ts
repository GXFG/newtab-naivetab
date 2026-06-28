/**
 * @module site/data/links
 * 站点共享的外部链接数据，Navbar 和 Footer 共用，确保一致性。
 */

export interface SiteLink {
  textKey: string // i18n key
  url: string
}

export const changelogLink: SiteLink = {
  textKey: 'links.changelog',
  url: 'https://github.com/GXFG/newtab-naivetab/blob/main/CHANGELOG.md',
}

export const sponsorLink: SiteLink = {
  textKey: 'links.sponsor',
  url: 'https://github.com/GXFG/newtab-naivetab/blob/main/sponsor.md',
}

export const issuesLink: SiteLink = {
  textKey: 'links.issues',
  url: 'https://github.com/GXFG/newtab-naivetab/issues',
}

export const emailLink: SiteLink = {
  textKey: 'links.email',
  url: `mailto:gxfgim@outlook.com?subject=NaiveTab%20Feedback&body=Hi%20GXFG,%0A%0A`,
}

export const githubLink: SiteLink = {
  textKey: 'links.github',
  url: 'https://github.com/GXFG/newtab-naivetab',
}

export const licenseLink: SiteLink = {
  textKey: 'links.license',
  url: 'https://github.com/GXFG/newtab-naivetab/blob/main/LICENSE',
}

/** 原型演示地址 */
export const prototypeUrl = 'https://gxfg.github.io/newtab/'
