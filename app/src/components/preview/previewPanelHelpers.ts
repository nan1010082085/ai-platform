import type { Widget } from '@/types'
import type { usePreviewInteraction } from '@/composables/usePreviewInteraction'

type Interaction = ReturnType<typeof usePreviewInteraction>

export type SchemaBuildStep = 'layout' | 'components' | 'validation' | 'styling'

export const DEFAULT_BUILD_STEPS: SchemaBuildStep[] = ['layout', 'components', 'validation', 'styling']

export const STEP_LABELS: Record<SchemaBuildStep, string> = {
  layout: '布局结构',
  components: '表单组件',
  validation: '验证规则',
  styling: '样式配置',
}

export const STEP_ICONS: Record<SchemaBuildStep, string> = {
  layout: '&#x1F9E9;',
  components: '&#x1F4E6;',
  validation: '&#x2705;',
  styling: '&#x1F3A8;',
}

const CONTAINER_TYPES = new Set([
  'form', 'card', 'tabs', 'dialog', 'single-col', 'double-col', 'triple-col',
  'quad-col', 'toolbar-buttons', 'divider', 'spacer', 'title',
])

export function filterFormWidgets(widgets: Widget[] | undefined): Widget[] {
  return (widgets ?? []).filter((w) => !CONTAINER_TYPES.has(w.type))
}

export function createPreviewFieldHandlers(
  interaction: Interaction,
  emit: {
    (e: 'field-click', fieldId: string, fieldData: Record<string, unknown>): void
    (e: 'field-edit', fieldId: string, data: Record<string, unknown>): void
    (e: 'field-update', fieldId: string, changes: Record<string, unknown>): void
    (e: 'apply-to-editor', widgetIds?: string[]): void
  },
) {
  return {
    handleFieldClick(widget: Widget) {
      interaction.selectField(widget)
      emit('field-click', widget.id, {
        type: widget.type,
        label: widget.label,
        field: widget.field,
        ...widget.props,
      })
    },
    handleFieldEdit(widget: Widget) {
      interaction.openFieldEdit(widget)
    },
    handleFieldSave(id: string, data: Record<string, unknown>) {
      emit('field-edit', id, data)
      interaction.closeEditDialog()
    },
    handleStartInlineEdit(widget: Widget) {
      interaction.startInlineEdit(widget)
    },
    handleInlineEditChange(key: string, value: unknown) {
      interaction.updateInlineEdit(key, value)
    },
    handleCommitInlineEdit() {
      const patch = interaction.commitInlineEdit()
      if (patch) emit('field-update', patch.widgetId, patch.changes)
    },
    handleCancelInlineEdit() {
      interaction.cancelInlineEdit()
    },
    handleApplyToEditor() {
      if (interaction.hasSelection.value) {
        emit('apply-to-editor', Array.from(interaction.selectedWidgetIds.value))
      } else {
        emit('apply-to-editor')
      }
    },
    handleToggleSelection(widgetId: string) {
      interaction.toggleWidgetSelection(widgetId)
    },
    handleSelectAll(widgets: Widget[]) {
      interaction.selectAllWidgets(widgets)
    },
  }
}
