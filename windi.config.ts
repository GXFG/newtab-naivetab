import { resolve } from 'path'
import { defineConfig } from 'windicss/helpers'
import colors from 'windicss/colors'

export default defineConfig({
  darkMode: 'media', // class
  // https://windicss.org/posts/v30.html#attributify-mode
  attributify: true,
  extract: {
    include: [
      resolve(__dirname, 'src/**/*.{vue,html}'),
    ],
  },
  theme: {
    colors: {
      ...colors,
      // light
      bgMainlight: '#fff',
      textMainLight: '#2c3e50',
      bgBookmarkDefaultLight: '#ccc',
      bgBookmarkActiveLight: '#ecf0f1',
      textBookmarkLight: '#000',
      textWatchLight: '#2c3e50',
      // dark
      bgMainDrak: '#35363a',
      textMainDrak: '#fff',
      bgBookmarkDefaultDark: '#bdc3c7',
      bgBookmarkActiveDark: '#ecf0f1',
      textBookmarkDark: '#000',
      textWatchDark: '#ecf0f1',
    },
  },
})
