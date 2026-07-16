/**
 * AI 应用全局布局
 *
 * 侧边栏导航 + 主内容区。
 * 参考 editor 的 AppLayout 实现。
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled } from '@element-plus/icons-vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { useShellEmbed } from '@/composables/useShellEmbed'

const route = useRoute()
const router = useRouter()
const { isShellEmbedded, shouldHideSubAppMenu, goToShellHome } = useShellEmbed()

const navItems = [
  { path: '/', label: 'AI 对话', icon: 'chat-dot-round' },
  { path: '/workflows', label: 'Agent 编排', icon: 'connection' },
  { path: '/rag', label: 'RAG 知识库', icon: 'notebook' },
  { path: '/plugins', label: '插件中心', icon: 'box' },
  { path: '/monitor', label: '性能监控', icon: 'data-line' },
  { path: '/settings/models', label: '模型与连接', icon: 'connection' },
  { path: '/settings/embedding', label: '嵌入模型', icon: 'collection' },
  { path: '/settings/keys', label: '集成密钥', icon: 'key' },
  { path: '/debug/routing', label: '路由调试', icon: 'search' },
]

const activeNav = computed(() => {
  if (route.path === '/') return '/'
  if (route.path.startsWith('/workflows') || route.path.startsWith('/executions')) return '/workflows'
  if (route.path.startsWith('/settings/models')) return '/settings/models'
  if (route.path.startsWith('/settings/embedding')) return '/settings/embedding'
  if (route.path.startsWith('/settings')) return '/settings/keys'
  if (route.path.startsWith('/debug')) return route.path
  return route.path
})
</script>

<template>
  <div :class="[$style.layout, shouldHideSubAppMenu && $style.layoutEmbedded]">
    <!-- 侧边栏：/app 容器内由 shell 提供菜单，此处隐藏 -->
    <aside v-if="!shouldHideSubAppMenu" :class="$style.sidebar">
      <div v-if="isShellEmbedded" :class="$style.embedBar">
        <el-tooltip content="返回主应用首页" placement="right">
          <button :class="$style.homeBtn" title="返回主应用" @click="goToShellHome">
            <el-icon :size="16"><HomeFilled /></el-icon>
          </button>
        </el-tooltip>
      </div>

      <div :class="$style.logo" @click="router.push('/')">
        <div :class="$style.logoIcon">AI</div>
        <span :class="$style.logoText">智能助手</span>
      </div>

      <nav :class="$style.nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[$style.navItem, activeNav === item.path && $style.navItemActive]"
        >
          <AppIcon :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div :class="$style.sidebarFooter">
        <router-link
          to="/sidebar"
          :class="[$style.navItem, $style.footerItem]"
        >
          <AppIcon name="list" :size="18" />
          <span>侧边栏模式</span>
        </router-link>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main :class="$style.main">
      <router-view />
    </main>
  </div>
</template>

<style module>
.layout {
  display: flex;
  height: 100vh;
  background: var(--ai-bg-gray, #F5F7FA);
}

.layoutEmbedded {
  .main {
    width: 100%;
  }
}

.sidebar {
  width: 200px;
  background: var(--ai-bg-white, #FFFFFF);
  border-right: 1px solid var(--ai-border-base, #D5DDE3);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.embedBar {
  padding: 12px 12px 0;
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
  padding: 20px 20px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--ai-bg-gray, #F5F7FA);
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

.nav {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ai-text-secondary, #666666);
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
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

.sidebarFooter {
  padding: 8px;
  border-top: 1px solid var(--ai-bg-gray, #F5F7FA);
}

.footerItem {
  color: var(--ai-text-hint, #999999);
  font-size: 12px;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
