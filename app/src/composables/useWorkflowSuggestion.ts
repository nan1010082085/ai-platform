/**
 * useWorkflowSuggestion - 根据用户消息匹配已发布工作流
 *
 * Phase S + V-2：workflow 作为可路由技能被 chat 唤起。
 * - 强匹配（score >= 2）：自动切换（autoSwitch），用户无感
 * - 弱匹配（score === 1）：显示建议条供用户点选
 */
import { ref } from 'vue'
import { matchWorkflowByMessage, type WorkflowRouteMatch } from '@/api/agentWorkflowApi'

/** score >= 2 视为强匹配，自动切换 */
const AUTO_SWITCH_SCORE = 2

export function useWorkflowSuggestion() {
  const suggestedWorkflow = ref<WorkflowRouteMatch | null>(null)
  const autoSwitchReady = ref(false)
  const checking = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 输入变化时防抖匹配。
   * 匹配结果根据 score 分两档：
   * - score >= 2 → autoSwitchReady = true（调用方应自动设 agentWorkflowId）
   * - score === 1 → suggestedWorkflow 有值（调用方应显示建议条）
   */
  function checkOnInput(message: string) {
    if (debounceTimer) clearTimeout(debounceTimer)
    autoSwitchReady.value = false
    const trimmed = message.trim()
    if (trimmed.length < 4) {
      suggestedWorkflow.value = null
      return
    }
    debounceTimer = setTimeout(async () => {
      checking.value = true
      try {
        const { matched } = await matchWorkflowByMessage(trimmed)
        const top = matched[0] ?? null
        suggestedWorkflow.value = top
        autoSwitchReady.value = top !== null && top.score >= AUTO_SWITCH_SCORE
      } catch {
        suggestedWorkflow.value = null
        autoSwitchReady.value = false
      } finally {
        checking.value = false
      }
    }, 600)
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer)
    suggestedWorkflow.value = null
    autoSwitchReady.value = false
  }

  return { suggestedWorkflow, autoSwitchReady, checking, checkOnInput, clear }
}
