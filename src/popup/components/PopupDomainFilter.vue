<script setup lang="ts">
/**
 * PopupDomainFilter
 *
 * 在 popup 中快速将当前域名加入/移出书签快捷键和命令快捷键的黑名单。
 * 每次切换立即调用 flushConfigSync 确保云同步。
 *
 * 使用示例：
 * ```vue
 * <PopupDomainFilter />
 * ```
 */

import { ref, computed, onMounted } from 'vue'
import { localConfig } from '@/logic/config/state'
import { normalizeDomain } from '@/logic/shortcut/utils'
import { flushConfigSync } from '@/logic/config/sync/upload'
import { NSwitch } from 'naive-ui'
import Tips from '@/components/Tips.vue'
import { showToast } from '@/common/toast'

const MAX_COUNT = 20

const hostname = ref('')
const syncCount = ref(0)

const isSyncing = computed(() => syncCount.value > 0)

const inBookmarkBlacklist = computed(() => {
  if (!hostname.value) return false
  return localConfig.keyboardBookmark.urlBlacklist.some(
    (d) => normalizeDomain(d) === hostname.value,
  )
})

const inCommandBlacklist = computed(() => {
  if (!hostname.value) return false
  return localConfig.keyboardCommand.urlBlacklist.some(
    (d) => normalizeDomain(d) === hostname.value,
  )
})

onMounted(async () => {
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })
    const tab = tabs[0]
    if (!tab?.url) return
    const url = new URL(tab.url)
    const domain = normalizeDomain(url.hostname)
    if (domain) hostname.value = domain
  } catch {
    // 无权限或页面不支持获取 URL，静默处理
  }
})

const toggleBlacklist = (field: 'keyboardBookmark' | 'keyboardCommand') => {
  const list = localConfig[field].urlBlacklist as string[]
  const isCurrentlyIn =
    field === 'keyboardBookmark'
      ? inBookmarkBlacklist.value
      : inCommandBlacklist.value

  if (isCurrentlyIn) {
    localConfig[field].urlBlacklist = list.filter(
      (d) => normalizeDomain(d) !== hostname.value,
    )
  } else {
    if (list.length >= MAX_COUNT) {
      showToast.warning(
        window
          .$t('generalSetting.maxBlacklistCount')
          .replace('__n__', String(MAX_COUNT)),
      )
      return
    }
    localConfig[field].urlBlacklist = [...list, hostname.value]
  }

  // 计数器：多个并发同步时确保 loading 不被提前清除
  syncCount.value++
  flushConfigSync(field)
    .finally(() => {
      syncCount.value--
    })
    .catch((e) => {
      console.error('[PopupDomainFilter] flushConfigSync failed:', e)
    })
}
</script>

<template>
  <div
    v-if="hostname"
    class="domain-filter"
  >
    <div class="domain-filter__info">
      <!-- 纯装饰性域名图标。ICONS 中无 globe/domain 相关图标，使用 emoji 替代。 -->
      <span class="domain-filter__icon">🌐</span>
      <span
        class="domain-filter__hostname"
        :title="hostname"
        >{{ hostname }}</span
      >
      <span class="domain-filter__label">{{
        $t('popupDomainFilter.label')
      }}</span>
      <Tips :content="$t('popupDomainFilter.tip')" />
    </div>

    <div
      class="domain-filter__switches"
      :class="{ 'domain-filter__switches--loading': isSyncing }"
    >
      <span class="domain-filter__switch-label">{{
        $t('popupDomainFilter.commandShortcut')
      }}</span>
      <NSwitch
        size="small"
        :loading="isSyncing"
        :value="inCommandBlacklist"
        :class="{ 'domain-filter__switch--active': inCommandBlacklist }"
        @update:value="toggleBlacklist('keyboardCommand')"
      />

      <span class="domain-filter__switch-label">{{
        $t('popupDomainFilter.bookmarkShortcut')
      }}</span>
      <NSwitch
        size="small"
        :loading="isSyncing"
        :value="inBookmarkBlacklist"
        :class="{ 'domain-filter__switch--active': inBookmarkBlacklist }"
        @update:value="toggleBlacklist('keyboardBookmark')"
      />
    </div>
  </div>
</template>

<style scoped>
.domain-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 18px;
  font-size: 12px;
  border-top: 1px solid var(--nt-popup-keyboard-border, var(--gray-alpha-10));
  background: var(--gray-alpha-2, rgba(0, 0, 0, 0.015));
}

.domain-filter__info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  .domain-filter__icon {
    font-size: 13px;
    flex-shrink: 0;
    opacity: 0.5;
  }

  .domain-filter__hostname {
    font-weight: 500;
    color: var(--n-text-color);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .domain-filter__label {
    color: var(--gray-alpha-8);
    flex-shrink: 0;
  }
}

.domain-filter__switches {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .domain-filter__switch-label {
    color: var(--gray-alpha-8);
    font-size: 12px;
  }

  .domain-filter__switch--active :deep(.n-switch__rail) {
    background-color: #ef4444;
  }
}

.domain-filter__switches--loading {
  pointer-events: none;
  opacity: 0.6;
}
</style>
