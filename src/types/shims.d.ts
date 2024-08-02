import { DefineComponent } from 'vue'

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.md' {
  const Component: DefineComponent<{}, {}, any>
  export default Component
}
