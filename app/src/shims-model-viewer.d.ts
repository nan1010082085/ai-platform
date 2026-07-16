/**
 * Type shim for @google/model-viewer Web Component.
 * model-viewer registers a custom element <model-viewer>.
 */
declare module '@google/model-viewer' {
  // model-viewer auto-registers the custom element on import
  const _: undefined
  export default _
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': {
        src?: string
        poster?: string
        alt?: string
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'shadow-intensity'?: number | string
        style?: string | Record<string, string>
        onLoad?: () => void
        onError?: (e: Event) => void
        children?: unknown
      }
    }
  }
}
