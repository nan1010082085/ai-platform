<template>
  <div :class="$style.callback">
    <AppIcon name="loading" :class="$style.spinner" :size="32" />
    <p :class="$style.text">{{ statusText }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { SSOClient, SSOError, resolveSsoRedirectUri } from '@schema-platform/platform-shared/utils/sso'
import {
  persistSSOClientId,
  startTokenRefreshSchedule,
  bootstrapAuthSession,
} from '@schema-platform/platform-shared/utils/authSession'
import { useAuthStore } from '@schema-platform/platform-shared/utils/stores/authStore'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const statusText = ref('正在完成登录...')

onMounted(async () => {
  const origin = window.location.origin
  const clientId = 'ai'
  persistSSOClientId(clientId)
  const client = new SSOClient({
    clientId,
    redirectUri: resolveSsoRedirectUri(origin),
    ssoBaseUrl: origin,
  })

  try {
    const tokens = await client.handleCallback()
    const authStore = useAuthStore()
    authStore.setTokens(tokens.accessToken, tokens.refreshToken)
    await bootstrapAuthSession()
    startTokenRefreshSchedule(tokens.expiresIn)

    let redirect = route.query.redirect as string | undefined

    // 避免路径重复：如果 redirect 以 router base 开头，去掉 base 前缀
    if (redirect) {
      const base = import.meta.env.BASE_URL || '/'
      if (base !== '/' && redirect.startsWith(base)) {
        redirect = '/' + redirect.slice(base.length)
      }
    }

    await router.replace(redirect || '/')
  } catch (err) {
    statusText.value =
      err instanceof SSOError ? `登录失败：${err.message}` : '登录失败，请重试'
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
