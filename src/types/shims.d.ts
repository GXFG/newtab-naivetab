/* eslint-disable @typescript-eslint/no-empty-object-type */
import { DefineComponent } from 'vue'

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.md' {
  const component: DefineComponent<{}, {}, any>
  export default component
}
