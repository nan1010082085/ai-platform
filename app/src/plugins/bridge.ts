/**
 * Vue 桥接：Cordis 服务状态 -> Vue 响应式 ref。
 * 约定：订阅归属调用方作用域；组件 setup 内调用随组件销毁自动退订，
 * 模块级调用为长生命周期订阅（宿主 dispose 时统一释放）。
 */

import { ref, getCurrentScope, onScopeDispose, type Ref } from 'vue'
import type { Context } from '@deepseek-ai/cordis'

export function serviceState<T>(ctx: Context, event: string, get: () => T): Ref<T> {
  const state = ref(get()) as Ref<T>
  const dispose = ctx.on(event, () => {
    state.value = get()
  })
  if (getCurrentScope()) {
    onScopeDispose(() => {
      dispose()
    })
  }
  return state
}
