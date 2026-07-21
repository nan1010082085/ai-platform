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
import { useShellEmbed } from '@/composables/useShellEmbed'
import { useAiLocale } from '@/composables/useAiLocale'

const route = useRoute()
const router = useRouter()
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

// 设置项：收进右上角下拉
const settingsNav = computed(() => [
  { path: '/settings/models', label: t('layout.nav.models'), icon: 'connection' },
  { path: '/settings/embedding', label: t('layout.nav.embedding'), icon: 'collection' },
  { path: '/settings/keys', label: t('layout.nav.keys'), icon: 'key' },
  { path: '/debug/routing', label: t('layout.nav.routingDebug'), icon: 'search' },
])

const languageLabel = computed(() =>
  locale.value === 'zh-CN' ? t('layout.switchToEn') : t('layout.switchToZh'),
)

const activeNav = computed(() => {
  if (route.path === '/') return '/'
  if (route.path.startsWith('/workflows') || route.path.startsWith('/executions')) return '/workflows'
  if (route.path.startsWith('/settings/models')) return '/settings/models'
  if (route.path.startsWith('/settings/embedding')) return '/settings/embedding'
  if (route.path.startsWith('/settings')) return '/settings/keys'
  if (route.path.startsWith('/debug')) return route.path
  return route.path
})

const settingsActive = computed(() =>
  settingsNav.value.some((item) => activeNav.value === item.path),
)

function handleSettingsSelect(path: string) {
  router.push(path)
}
</script>

<template>
  <div :class="$style.layout">
    <!-- 顶部导航：/app 容器内由 shell 提供菜单，此处隐藏 -->
    <header v-if="!shouldHideSubAppMenu" :class="$style.topbar">
      <div :class="$style.topbarLeft">
        <el-tooltip v-if="isShellEmbedded" :content="t('layout.homeTooltip')" placement="bottom">
          <button :class="$style.homeBtn" :title="t('layout.homeTitle')" @click="goToShellHome">
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
          <span
            :class="[
              $style.navItem,
              $style.settingsTrigger,
              settingsActive && $style.navItemActive,
            ]"
          >
            <AppIcon name="setting" :size="16" />
            <span>{{ t('layout.settings') }}</span>
            <AppIcon name="arrow-down" :size="12" />
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in settingsNav"
                :key="item.path"
                :command="item.path"
              >
                <AppIcon :name="item.icon" :size="16" />
                <span :class="$style.dropdownLabel">{{ item.label }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <button
          type="button"
          :class="[$style.navItem, $style.localeBtn]"
          :title="t('layout.language')"
          @click="toggleLocale"
        >
          <AppIcon name="switch-button" :size="16" />
          <span>{{ languageLabel }}</span>
        </button>
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

.settingsTrigger {
  outline: none;
}

.dropdownLabel {
  margin-left: 6px;
}

.localeBtn {
  border: none;
  background: transparent;
  font: inherit;
  color: var(--ai-text-hint, #999999);
  font-size: 12px;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
