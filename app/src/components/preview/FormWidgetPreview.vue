<script setup lang="ts">
import type { Widget } from '@/types'

const props = defineProps<{
  widgets: Widget[]
  selectedIds: Set<string>
  highlightedIds: string[]
  inlineEditWidgetId: string | null
  inlineEditData: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  'field-click': [widget: Widget]
  'toggle-selection': [widgetId: string]
  'start-inline-edit': [widget: Widget]
  'commit-inline-edit': []
  'cancel-inline-edit': []
  'inline-edit-change': [key: string, value: unknown]
  'field-edit': [widget: Widget]
}>()

function getWidgetPlaceholder(w: Widget): string {
  const p = w.props as Record<string, unknown> | undefined
  return (p?.placeholder as string) ?? `请输入${w.label ?? w.field ?? ''}`
}

function getWidgetOptions(w: Widget): Array<{ label: string; value: string }> {
  const p = w.props as Record<string, unknown> | undefined
  const opts = p?.options as Array<{ label: string; value: string }> | undefined
  return opts ?? []
}

function getWidgetEditableProps(w: Widget): Array<{ key: string; label: string; type: 'input' | 'switch' }> {
  const base: Array<{ key: string; label: string; type: 'input' | 'switch' }> = [
    { key: 'label', label: '标签', type: 'input' },
    { key: 'field', label: '字段名', type: 'input' },
  ]
  if (['input', 'textarea', 'number', 'date', 'richtext'].includes(w.type)) {
    base.push({ key: 'placeholder', label: '占位符', type: 'input' })
  }
  base.push({ key: 'required', label: '必填', type: 'switch' })
  return base
}

function isHighlighted(id: string): boolean {
  return props.highlightedIds.includes(id)
}
</script>

<template>
  <el-form label-position="top" size="default">
    <template v-for="w in widgets" :key="w.id">
      <div
        :class="[
          $style.fieldWrapper,
          {
            [$style.fieldHighlighted]: isHighlighted(w.id),
            [$style.fieldSelected]: selectedIds.has(w.id),
            [$style.fieldInlineEditing]: inlineEditWidgetId === w.id,
          },
        ]"
        @click="emit('field-click', w)"
      >
        <el-checkbox
          :model-value="selectedIds.has(w.id)"
          :class="$style.fieldCheckbox"
          @click.stop
          @change="emit('toggle-selection', w.id)"
        />

        <div :class="$style.fieldContent">
          <template v-if="inlineEditWidgetId === w.id && inlineEditData">
            <div :class="$style.inlineEditHeader">
              <span :class="$style.inlineEditTitle">编辑组件</span>
              <div :class="$style.inlineEditActions">
                <el-button :class="$style.inlineEditConfirm" title="确认" link size="small" @click.stop="emit('commit-inline-edit')">&#x2713;</el-button>
                <el-button :class="$style.inlineEditCancel" title="取消" link size="small" @click.stop="emit('cancel-inline-edit')">&times;</el-button>
              </div>
            </div>
            <div :class="$style.inlineEditFields">
              <div
                v-for="prop in getWidgetEditableProps(w)"
                :key="prop.key"
                :class="$style.inlineEditRow"
              >
                <label :class="$style.inlineEditLabel">{{ prop.label }}</label>
                <el-input
                  v-if="prop.type === 'input'"
                  :model-value="(inlineEditData[prop.key] as string) ?? ''"
                  size="small"
                  @update:model-value="emit('inline-edit-change', prop.key, $event)"
                />
                <el-switch
                  v-else-if="prop.type === 'switch'"
                  :model-value="inlineEditData[prop.key] as boolean"
                  size="small"
                  @update:model-value="emit('inline-edit-change', prop.key, $event)"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <el-form-item
              v-if="['input', 'number', 'date', 'textarea', 'richtext'].includes(w.type)"
              :label="w.label ?? w.field ?? w.type"
            >
              <el-input
                :type="w.type === 'textarea' ? 'textarea' : 'text'"
                :placeholder="getWidgetPlaceholder(w)"
                :rows="w.type === 'textarea' ? 3 : undefined"
                disabled
              />
            </el-form-item>

            <el-form-item v-else-if="w.type === 'select'" :label="w.label ?? w.field ?? 'select'">
              <el-select placeholder="请选择" disabled style="width: 100%">
                <el-option
                  v-for="opt in getWidgetOptions(w)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item v-else-if="w.type === 'radio'" :label="w.label ?? w.field ?? 'radio'">
              <el-radio-group disabled>
                <el-radio v-for="opt in getWidgetOptions(w)" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-else-if="w.type === 'checkbox'" :label="w.label ?? w.field ?? 'checkbox'">
              <el-checkbox-group disabled>
                <el-checkbox v-for="opt in getWidgetOptions(w)" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item v-else-if="w.type === 'switch'" :label="w.label ?? w.field ?? 'switch'">
              <el-switch disabled />
            </el-form-item>

            <el-form-item v-else-if="w.type === 'slider'" :label="w.label ?? w.field ?? 'slider'">
              <el-slider disabled />
            </el-form-item>

            <el-form-item v-else-if="w.type === 'rate'" :label="w.label ?? w.field ?? 'rate'">
              <el-rate disabled />
            </el-form-item>

            <el-form-item v-else-if="w.type === 'upload'" :label="w.label ?? w.field ?? 'upload'">
              <el-button disabled>选择文件</el-button>
            </el-form-item>

            <el-form-item v-else-if="w.type === 'button'">
              <el-button type="primary" disabled>
                {{ (w.props as Record<string, unknown>)?.text as string ?? w.label ?? '提交' }}
              </el-button>
            </el-form-item>

            <el-form-item v-else :label="w.label ?? w.field ?? w.type">
              <el-input placeholder="[不支持的组件类型]" disabled />
            </el-form-item>
          </template>
        </div>

        <div :class="$style.fieldActionGroup">
          <el-button :class="$style.fieldEditBtn" title="内联编辑" link size="small" @click.stop="emit('start-inline-edit', w)">&#x270E;</el-button>
          <el-button :class="$style.fieldEditBtn" title="编辑属性" link size="small" @click.stop="emit('field-edit', w)">&#x2699;</el-button>
        </div>
      </div>
    </template>
  </el-form>
</template>

<style module>
.fieldWrapper {
  position: relative;
  padding: 8px;
  margin: 0 -8px;
  border-radius: var(--ai-radius-md, 8px);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.fieldWrapper:hover {
  background: var(--ai-bg-hover, #F5F7FA);
}
.fieldWrapper:hover .fieldEditBtn,
.fieldWrapper:hover .fieldActionGroup {
  opacity: 1;
}
.fieldHighlighted {
  background: rgba(255, 171, 64, 0.06);
  border: 1px solid rgba(255, 171, 64, 0.2);
}
.fieldHighlighted:hover {
  background: rgba(255, 171, 64, 0.1);
}
.fieldSelected {
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.2);
}
.fieldInlineEditing {
  background: var(--ai-bg-white, #FFFFFF);
  border: 1px solid rgba(0, 212, 255, 0.3);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.12);
}
.fieldCheckbox {
  margin-top: 4px;
}
.fieldContent {
  flex: 1;
}
.fieldEditBtn {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 24px;
  height: 24px;
  border: 1px solid var(--ai-border-light, #EBEDF3);
  border-radius: var(--ai-radius-sm, 6px);
  background: var(--ai-bg-white, #FFFFFF);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--ai-text-secondary, #666666);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.fieldEditBtn:hover {
  border-color: rgba(0, 212, 255, 0.3);
  color: var(--ai-color-primary, #00d4ff);
}
.fieldActionGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: absolute;
  right: 8px;
  top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.inlineEditHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ai-border-light, #EBEDF3);
}
.inlineEditTitle {
  font-size: 11px;
  font-weight: 600;
  color: var(--ai-color-primary, #00d4ff);
}
.inlineEditActions {
  display: flex;
  gap: 4px;
}
.inlineEditConfirm {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(0, 230, 118, 0.3);
  border-radius: var(--ai-radius-sm, 6px);
  background: rgba(0, 230, 118, 0.1);
  color: var(--ai-color-success, #00e676);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.inlineEditConfirm:hover {
  background: var(--ai-color-success, #00e676);
  color: #333333;
}
.inlineEditCancel {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(255, 82, 82, 0.3);
  border-radius: var(--ai-radius-sm, 6px);
  background: rgba(255, 82, 82, 0.08);
  color: var(--ai-color-danger, #ff5252);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.inlineEditCancel:hover {
  background: var(--ai-color-danger, #ff5252);
  color: #333333;
}
.inlineEditFields {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inlineEditRow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inlineEditLabel {
  font-size: 11px;
  color: var(--ai-text-secondary, #666666);
  min-width: 48px;
  flex-shrink: 0;
}
.inlineEditRow :deep(.t-input) {
  flex: 1;
}
.inlineEditRow :deep(.t-input__inner) {
  box-shadow: 0 0 0 1px var(--ai-border-light, #EBEDF3) inset;
}
.inlineEditRow :deep(.t-input__inner:hover) {
  box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.3) inset;
}
</style>
