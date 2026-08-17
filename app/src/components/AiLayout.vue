/**
 * AI 应用全局布局
 *
 * 顶部导航 + 主内容区（独立站模式）。
 * /app 容器内由 shell 提供菜单，顶导隐藏。
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppUserPanel from '@schema-platform/platform-shared/components/common/AppUserPanel.vue'
import { useAuthStore } from '@schema-platform/platform-shared/utils/stores/authStore'
import { stopTokenRefreshSchedule } from '@schema-platform/platform-shared/utils/authSession'
import { useShellEmbed } from '@/composables/useShellEmbed'
import { useAiLocale } from '@/composables/useAiLocale'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { isShellEmbedded, shouldHideSubAppMenu, goToShellHome } = useShellEmbed()
const { t, locale, toggleLocale } = useAiLocale()

// 功能项：平铺顶导
const primaryNav = computed(() => [
  { path: '/', label: t('layout.nav.chat'), icon: 'chat-dot-round' },
  { path: '/workflows', label: t('layout.nav.workflows'), icon: 'connection' },
  { path: '/rag', label: t('layout.nav.rag'), icon: 'notebook' },
  { path: '/plugins', label: t('layout.nav.plugins'), icon: 'box' },
  { path: '/monitor', label: t('layout.nav.monitor'), icon: 'data-line' },
])

// 设置项：收进右上角下拉，按组分隔
type SettingsGroup = 'config' | 'integration' | 'ops'

interface SettingsNavItem {
  path: string
  label: string
  icon: string
  group: SettingsGroup
}

const settingsNav = computed<SettingsNavItem[]>(() => [
  { path: '/settings/models', label: t('layout.nav.models'), icon: 'cpu', group: 'config' },
  { path: '/settings/embedding', label: t('layout.nav.embedding'), icon: 'collection', group: 'config' },
  { path: '/settings/templates', label: t('layout.nav.templates'), icon: 'document-checked', group: 'config' },
  { path: '/memory', label: t('layout.nav.memory'), icon: 'data-board', group: 'config' },
  { path: '/integration', label: t('layout.nav.integration'), icon: 'link', group: 'integration' },
  { path: '/settings/keys', label: t('layout.nav.keys'), icon: 'key', group: 'integration' },
  { path: '/mcp', label: t('layout.nav.mcp'), icon: 'set-up', group: 'integration' },
  { path: '/schedules', label: t('layout.nav.schedules'), icon: 'alarm-clock', group: 'ops' },
  { path: '/evaluation', label: t('layout.nav.evaluation'), icon: 'data-analysis', group: 'ops' },
  { path: '/debug/routing', label: t('layout.nav.routingDebug'), icon: 'search', group: 'ops' },
  { path: '/debug/rag', label: t('layout.nav.ragDebug'), icon: 'filter', group: 'ops' },
])

const settingsGroups = computed(() => {
  const groupOrder: SettingsGroup[] = ['config', 'integration', 'ops']
  return groupOrder.map((id) => ({
    id,
    items: settingsNav.value.filter((item) => item.group === id),
  }))
})

const languageLabel = computed(() =>
  locale.value === 'zh-CN' ? t('layout.switchToEn') : t('layout.switchToZh'),
)

const activeNav = computed(() => {
  if (route.path === '/') return '/'
  if (route.path.startsWith('/workflows') || route.path.startsWith('/executions')) return '/workflows'
  if (route.path.startsWith('/plugins')) return '/plugins'
  if (route.path.startsWith('/settings/models')) return '/settings/models'
  if (route.path.startsWith('/settings/embedding')) return '/settings/embedding'
  if (route.path.startsWith('/settings/templates')) return '/settings/templates'
  if (route.path.startsWith('/settings')) return '/settings/keys'
  if (route.path.startsWith('/debug')) return route.path
  if (route.path.startsWith('/evaluation')) return '/evaluation'
  if (route.path.startsWith('/schedules')) return '/schedules'
  return route.path
})

const settingsActive = computed(() =>
  settingsNav.value.some((item) => activeNav.value === item.path),
)

function handleSettingsSelect(path: string) {
  router.push(path)
}

/**
 * 退出登录并跳转登录页
 */
function handleLogout() {
  stopTokenRefreshSchedule()
  authStore.reset()
  void router.push({ name: 'login' })
}
</script>

<template>
  <div :class="$style.layout">
    <!-- 顶部导航：/app 容器内由 shell 提供菜单，此处隐藏 -->
    <header v-if="!shouldHideSubAppMenu" :class="$style.topbar">
      <div :class="$style.topbarLeft">
        <el-tooltip v-if="isShellEmbedded" :content="t('layout.homeTooltip')" placement="bottom">
          <button :class="$style.homeBtn" :title="t('layout.homeTitle')" :aria-label="t('layout.homeTitle')" @click="goToShellHome">
            <AppIcon name="home-filled" :size="18" />
          </button>
        </el-tooltip>
        <div :class="$style.logo" @click="router.push('/')">
          <div :class="$style.logoIcon">AI</div>
          <span :class="$style.logoText">{{ t('layout.logo') }}</span>
        </div>
      </div>

      <nav :class="$style.primaryNav">
        <router-link
          v-for="item in primaryNav"
          :key="item.path"
          :to="item.path"
          :class="[$style.navItem, activeNav === item.path && $style.navItemActive]"
        >
          <AppIcon :name="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div :class="$style.topbarRight">
        <el-dropdown trigger="click" @command="handleSettingsSelect">
          <button
            type="button"
            :class="[
              $style.iconBtn,
              settingsActive && $style.navItemActive,
            ]"
            :title="t('layout.settings')"
            :aria-label="t('layout.settings')"
          >
            <AppIcon name="setting" :size="16" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <template v-for="(group, gi) in settingsGroups" :key="group.id">
                <el-dropdown-item disabled :divided="gi > 0" :class="$style.dropdownGroupTitle">
                  {{ t(`layout.settingsGroup.${group.id}`) }}
                </el-dropdown-item>
                <el-dropdown-item
                  v-for="item in group.items"
                  :key="item.path"
                  :command="item.path"
                >
                  <AppIcon :name="item.icon" :size="16" />
                  <span :class="$style.dropdownLabel">{{ item.label }}</span>
                </el-dropdown-item>
              </template>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <button
          type="button"
          :class="$style.iconBtn"
          :title="languageLabel"
          :aria-label="languageLabel"
          @click="toggleLocale"
        >
          <AppIcon name="chat-dot-round" :size="16" />
        </button>

        <AppUserPanel
          :user="authStore.user"
          placement="bottom-end"
          @logout="handleLogout"
        />
      </div>
    </header>

    <!-- 主内容区 -->
    <main :class="$style.main">
      <router-view />
    </main>
  </div>
</template>

<style module>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ai-bg-gray, #F5F7FA);
}

.topbar {
  height: 56px;
  background: var(--ai-bg-white, #FFFFFF);
  border-bottom: 1px solid var(--ai-border-base, #D5DDE3);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 24px;
  flex-shrink: 0;
}

.topbarLeft {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.homeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
  padding: 0;
}

.homeBtn:hover {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-color-primary, #409eff);
}

.logo {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logoIcon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #00d4ff 0%, #0060A2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.logoText {
  font-size: 16px;
  font-weight: 700;
  color: var(--ai-text-primary, #333333);
  letter-spacing: -0.5px;
}

.primaryNav {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ai-text-secondary, #666666);
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  white-space: nowrap;
}

.navItem:hover {
  background: var(--ai-bg-gray, #F5F7FA);
  color: var(--ai-text-primary, #333333);
}

.navItemActive {
  background: var(--ai-color-primary-bg, #EEF5FF);
  color: var(--ai-color-primary, #0060A2);
  font-weight: 500;
}

.topbarRight {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.iconBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ai-text-secondary, #666666);
  cursor: pointer;
  outline: none;
  transition: all 0.15s;
}

.iconBtn:hover {
  background: var(--ai-bg-gray, #F5F7FA);
  color: var(--ai-text-primary, #333333);
}

.dropdownLabel {
  margin-left: 6px;
}

.dropdownGroupTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  cursor: default;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
