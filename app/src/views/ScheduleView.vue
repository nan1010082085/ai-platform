<script setup lang="ts">
/**
 * ScheduleView - 定时触发调度管理
 *
 * 列出所有已发布 workflow 的 schedule-trigger 调度，展示 cron + 下次执行 + 启用状态。
 * 支持按日历视图查看当日调度（el-calendar）。
 *
 * 挂在设置下拉（与检索调试/评测并列）。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageShell from '@/components/common/PageShell.vue'
import { request } from '@/api/aiApi/base'
import { resolveErrorText } from '@/constants/errorCodes'
import styles from './ScheduleView.module.scss'

interface ScheduleEntry {
  workflowId: string
  workflowName: string
  nodeId: string
  cron: string
  timezone: string
  enabled: boolean
  nextRuns: string[]
}

const router = useRouter()
const loading = ref(false)
const schedules = ref<ScheduleEntry[]>([])
const calendarDate = ref(new Date())
let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadSchedules() {
  loading.value = true
  try {
    const data = await request<{ schedules: ScheduleEntry[] }>('/ai/debug/schedules', { raw: true })
    schedules.value = data.schedules
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '加载调度失败'))
  } finally {
    loading.value = false
  }
}

const enabledCount = computed(() => schedules.value.filter((s) => s.enabled).length)
const nextUpcoming = computed(() => {
  const all: Array<{ schedule: ScheduleEntry; time: Date }> = []
  for (const s of schedules.value) {
    if (!s.enabled || !s.nextRuns.length) continue
    all.push({ schedule: s, time: new Date(s.nextRuns[0]) })
  }
  return all.sort((a, b) => a.time.getTime() - b.time.getTime()).slice(0, 5)
})

/** 当日有触发的调度（按 nextRuns 日期匹配日历选中日） */
function schedulesOnDay(date: Date): ScheduleEntry[] {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return schedules.value.filter((s) =>
    s.enabled && s.nextRuns.some((t) => {
      const d = new Date(t)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === target.getTime()
    }),
  )
}

function formatTime(t: string): string {
  return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function cronLabel(cron: string): string {
  const map: Record<string, string> = {
    '0 9 * * *': '每天 9:00',
    '0 * * * *': '每小时',
    '0 0 * * *': '每天 0:00',
  }
  return map[cron] ?? cron
}

function goToWorkflow(id: string) {
  router.push(`/workflows/${id}`)
}

onMounted(() => {
  loadSchedules()
  pollTimer = setInterval(loadSchedules, 60_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <PageShell fill>
      <PageHeader
        title="调度管理"
        subtitle="查看已发布工作流的定时触发调度，监控下次执行时间"
      >
        <template #actions>
          <el-button size="small" :loading="loading" @click="loadSchedules">
            <AppIcon name="refresh" :size="14" /> 刷新
          </el-button>
        </template>
      </PageHeader>

      <div :class="styles.summaryRow">
        <div :class="styles.summaryCard">
          <span :class="styles.summaryNum">{{ schedules.length }}</span>
          <span :class="styles.summaryLabel">调度总数</span>
        </div>
        <div :class="styles.summaryCard">
          <span :class="styles.summaryNum">{{ enabledCount }}</span>
          <span :class="styles.summaryLabel">已启用</span>
        </div>
        <div :class="styles.summaryCard">
          <span :class="styles.summaryNum">{{ schedules.length - enabledCount }}</span>
          <span :class="styles.summaryLabel">已暂停</span>
        </div>
      </div>

      <div v-if="nextUpcoming.length" :class="styles.upcomingSection">
        <h3 :class="styles.sectionTitle">即将执行</h3>
        <div :class="styles.upcomingList">
          <div v-for="(item, i) in nextUpcoming" :key="i" :class="styles.upcomingItem">
            <AppIcon name="alarm-clock" :size="14" :class="styles.upcomingIcon" />
            <span :class="styles.upcomingTime">{{ formatTime(item.schedule.nextRuns[0]) }}</span>
            <span :class="styles.upcomingName" @click="goToWorkflow(item.schedule.workflowId)">{{ item.schedule.workflowName }}</span>
            <el-tag size="small" type="info">{{ cronLabel(item.schedule.cron) }}</el-tag>
          </div>
        </div>
      </div>

      <div :class="styles.content">
        <div :class="styles.listCol">
          <h3 :class="styles.sectionTitle">调度列表</h3>
          <div v-if="!schedules.length" :class="styles.empty">
            <AppIcon name="alarm-clock" :size="36" :class="styles.emptyIcon" />
            <p>暂无定时调度</p>
            <span :class="styles.emptyHint">在工作流中添加「定时触发」节点并发布即可生效</span>
          </div>
          <div v-else :class="styles.scheduleList">
            <div v-for="s in schedules" :key="s.nodeId" :class="styles.scheduleCard" @click="goToWorkflow(s.workflowId)">
              <div :class="styles.scheduleHead">
                <AppIcon name="alarm-clock" :size="16" :class="styles.scheduleIcon" />
                <span :class="styles.scheduleName">{{ s.workflowName }}</span>
                <el-tag size="small" :type="s.enabled ? 'success' : 'info'">
                  {{ s.enabled ? '启用' : '暂停' }}
                </el-tag>
              </div>
              <div :class="styles.scheduleCron">{{ s.cron }} <span :class="styles.cronLabel">{{ cronLabel(s.cron) }}</span></div>
              <div :class="styles.scheduleNext">
                <span :class="styles.nextLabel">下次执行：</span>
                <span v-if="s.nextRuns.length">{{ formatTime(s.nextRuns[0]) }}</span>
                <span v-else :class="styles.muted">无</span>
              </div>
            </div>
          </div>
        </div>

        <div :class="styles.calendarCol">
          <h3 :class="styles.sectionTitle">日历视图</h3>
          <div :class="styles.calendarBody">
          <el-calendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <div :class="styles.calendarCell">
                <span :class="styles.calendarDay">{{ data.day.split('-').pop() }}</span>
                <div v-if="schedulesOnDay(new Date(data.day)).length" :class="styles.calendarDots">
                  <div
                    v-for="s in schedulesOnDay(new Date(data.day)).slice(0, 3)"
                    :key="s.nodeId"
                    :class="styles.calendarDot"
                    :title="s.workflowName"
                  />
                </div>
              </div>
            </template>
          </el-calendar>
        </div>
      </div>
</PageShell>
</template>
