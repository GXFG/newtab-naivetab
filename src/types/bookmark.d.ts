type KeyLabel =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '0'
  | '-'
  | '+'
  | 'BS'
  | 'q'
  | 'w'
  | 'e'
  | 'r'
  | 't'
  | 'y'
  | 'u'
  | 'i'
  | 'o'
  | 'p'
  | '{'
  | '}'
  | 'a'
  | 's'
  | 'd'
  | 'f'
  | 'g'
  | 'h'
  | 'j'
  | 'k'
  | 'l'
  | ':'
  | '"'
  | 'z'
  | 'x'
  | 'c'
  | 'v'
  | 'b'
  | 'n'
  | 'm'
  | '<'
  | '>'
  | '?'

type KeycapType = 'none' | 'mark' | 'folder' | 'back'

interface KeyboardConfigItem {
  label?: string
  textAlign?: 'left' | 'center' | 'right'
  size: number
  alias?: string // LShift
  marginLeft?: number // default 0
  marginRight?: number // default 0
  marginBottom?: number // default 0
}

interface ChromeBookmarkItem {
  dateAdded: number // 1618456881151
  id: string // "130"
  index: number // 1
  parentId: string // "106"
  title: string // "StackBlitz"
  url?: string // "https://stackblitz.com/"
  children: ChromeBookmarkItem[]
}

interface BookmarkItem {
  key: string
  url: string
  name?: string
}
