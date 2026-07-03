<template>
  <div :class="$style.callback">
    <el-icon :class="$style.spinner" :size="32"><Loading /></el-icon>
    <p :class="$style.text">正在完成登录...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { SSOClient } from '@schema-platform/platform-shared/utils/sso'
import {
  persistSSOClientId,
  startTokenRefreshSchedule,
} from '@schema-platform/platform-shared/utils/authSession'
import { useAuthStore } from '@schema-platform/platform-shared/utils/stores/authStore'

const router = useRouter()
const route = useRoute()

onMounted(async () => {
  const origin = window.location.origin
  const clientId = 'ai'
  persistSSOClientId(clientId)
  const client = new SSOClient({
    clientId,
    redirectUri: `${origin}/schema-platform/ai/auth/callback`,
    ssoBaseUrl: origin,
  })

  try {
    const tokens = await client.handleCallback()
    const authStore = useAuthStore()
    authStore.setTokens(tokens.accessToken, tokens.refreshToken)
    startTokenRefreshSchedule(tokens.expiresIn)

    const redirect = route.query.redirect as string | undefined
    await router.replace(redirect || '/')
  } catch {
    await router.replace({ name: 'chat' })
  }
})
</script>

<style module>
.callback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text {
  color: var(--text-color-secondary);
  font-size: 14px;
}
</style>
