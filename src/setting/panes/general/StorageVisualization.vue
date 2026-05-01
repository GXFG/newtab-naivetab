<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import Tips from '@/components/Tips.vue'

const props = defineProps<{
  syncTime: string
  isLoading: boolean
  totalBytes: number
  topLargeItems: [string, number][]
  sortedEntries: [string, number][]
}>()

const SYNC_QUOTA_BYTES_PER_ITEM = 8192
const isExpanded = ref(false)

const DEFAULT_VISIBLE = 2

// 默认展示的前 N 条最大配置项
const visibleItems = computed(() =>
  props.sortedEntries.slice(0, DEFAULT_VISIBLE),
)
// 展开后展示的其余配置项
const extraItems = computed(() => props.sortedEntries.slice(DEFAULT_VISIBLE))

// configSizeMap 的 field 映射到 i18n label，兜底展示原始 field 名
const getFieldLabel = (field: string) => window.$t(`setting.${field}`) || field

const barWidth = (bytes: number) =>
  `${Math.min((bytes / SYNC_QUOTA_BYTES_PER_ITEM) * 100, 100)}%`
</script>

<template>
  <!-- 同步时间 -->
  <div class="storage__row">
    <label class="storage__label">
      {{ $t('generalSetting.syncTime') }}
      <Tips :content="$t('generalSetting.syncTimeTips')" />
    </label>
    <div class="storage__control">
      <NSpin
        :show="props.isLoading"
        size="small"
      >
        <div class="sync-time__badge">
          <Icon
            :icon="ICONS.check"
            class="sync-time__icon"
          />
          <span class="sync-time__text">{{ props.syncTime }}</span>
        </div>
      </NSpin>
    </div>
  </div>

  <!-- 配置占用大小 -->
  <div class="storage__row">
    <label class="storage__label">
      {{ $t('generalSetting.syncStorageSize') }}
      <Tips :content="$t('generalSetting.syncStorageSizeTips')" />
    </label>
    <div class="storage__control">
      <div class="storage-panel">
        <!-- 默认展示前 2 条最大配置项 -->
        <div
          v-if="visibleItems.length > 0"
          class="storage-panel__list"
        >
          <div
            v-for="[field, bytes] in visibleItems"
            :key="field"
            class="storage-panel__list-item"
            :class="{
              'storage-panel__list-item--warn': bytes > 7000,
              'storage-panel__list-item--danger': bytes > 8000,
            }"
          >
            <span class="list-item__field">{{ getFieldLabel(field) }}</span>
            <div class="list-item__bar-wrap">
              <div
                class="list-item__bar"
                :style="{ width: barWidth(bytes) }"
              />
            </div>
            <span class="list-item__bytes"
              >{{ (bytes / 1024).toFixed(1) }}KB</span
            >
          </div>
        </div>

        <!-- 展开后展示的其余配置项 -->
        <Transition name="storage-expand">
          <div
            v-if="isExpanded"
            class="storage-panel__list storage-panel__list--extra"
          >
            <div
              v-for="[field, bytes] in extraItems"
              :key="field"
              class="storage-panel__list-item"
              :class="{
                'storage-panel__list-item--warn': bytes > 7000,
                'storage-panel__list-item--danger': bytes > 8000,
              }"
            >
              <span class="list-item__field">
                {{ getFieldLabel(field) }}
              </span>
              <div class="list-item__bar-wrap">
                <div
                  class="list-item__bar"
                  :style="{ width: barWidth(bytes) }"
                />
              </div>
              <span class="list-item__bytes"
                >{{ (bytes / 1024).toFixed(1) }}KB</span
              >
            </div>
          </div>
        </Transition>

        <!-- 展开/收起箭头（底部居中） -->
        <div
          v-if="sortedEntries.length > DEFAULT_VISIBLE"
          class="storage-panel__toggle"
          :class="{ 'storage-panel__toggle--expanded': isExpanded }"
          @click="isExpanded = !isExpanded"
        >
          <Icon
            :icon="ICONS.countdownSpinDown"
            class="storage-panel__arrow"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ——— 行布局（对齐 SettingFormItem 的 label + control 结构） ——— */
.storage__row {
  display: flex;
  align-items: flex-start;
  padding: 10px 14px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 14px;
    right: 14px;
    border-bottom: 1px solid var(--gray-alpha-06);
  }
}

.storage__label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 120px;
  font-size: var(--text-base);
  color: var(--n-text-color-2);
  cursor: default;
  user-select: none;
}

.storage__control {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  min-width: 0;
}

/* ——— 同步时间徽章 ——— */
.sync-time__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background: rgba(56, 168, 102, 0.1);
  border: 1px solid rgba(56, 168, 102, 0.22);
  :root[data-theme='dark'] & {
    background: rgba(56, 168, 102, 0.15);
    border-color: rgba(56, 168, 102, 0.3);
  }
}

.sync-time__icon {
  font-size: 13px;
  color: #38a866;
  flex-shrink: 0;
}

.sync-time__text {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: rgba(56, 168, 102, 0.85);
  letter-spacing: 0.2px;
  :root[data-theme='dark'] & {
    color: rgba(56, 168, 102, 0.75);
  }
}

/* ——— Storage 面板 ——— */
.storage-panel {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
}

/* 展开/收起按钮（列表底部居中） */
.storage-panel__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  padding: 4px 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--transition-fast);

  &:hover {
    background: var(--gray-alpha-10);
    .storage-panel__arrow {
      color: var(--gray-alpha-70);
    }
  }

  &.storage-panel__toggle--expanded {
    .storage-panel__arrow {
      transform: rotate(180deg);
    }
  }
}

.storage-panel__arrow {
  font-size: 16px;
  color: var(--gray-alpha-55);
  transition:
    transform var(--transition-base),
    color var(--transition-fast);
  flex-shrink: 0;
}

/* ——— 展开/收起动画 ——— */
.storage-expand-enter-active,
.storage-expand-leave-active {
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);
  transform-origin: top center;
}

.storage-expand-enter-from,
.storage-expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.storage-expand-enter-to,
.storage-expand-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* ——— 配置项列表 ——— */
.storage-panel__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.storage-panel__list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: var(--gray-alpha-05);
  cursor: default;
  transition: background-color var(--transition-fast);

  &:hover {
    background: var(--gray-alpha-10);
  }

  &.storage-panel__list-item--warn {
    background: rgba(240, 160, 32, 0.08);
    border-color: rgba(240, 160, 32, 0.2);
    .list-item__bar {
      background: rgba(240, 160, 32, 0.85);
    }
    .list-item__bytes {
      color: rgba(200, 130, 0, 0.9);
    }
    :root[data-theme='dark'] & {
      background: rgba(240, 160, 32, 0.12);
      border-color: rgba(240, 160, 32, 0.3);
      .list-item__bar {
        background: rgba(240, 160, 32, 0.75);
      }
      .list-item__bytes {
        color: rgba(240, 180, 50, 0.9);
      }
    }
  }

  &.storage-panel__list-item--danger {
    background: rgba(220, 50, 50, 0.08);
    border-color: rgba(220, 50, 50, 0.22);
    .list-item__bar {
      background: rgba(220, 50, 50, 0.85);
    }
    .list-item__bytes {
      color: rgba(200, 40, 40, 0.9);
    }
    :root[data-theme='dark'] & {
      background: rgba(230, 60, 60, 0.12);
      border-color: rgba(230, 60, 60, 0.35);
      .list-item__bar {
        background: rgba(230, 60, 60, 0.75);
      }
      .list-item__bytes {
        color: rgba(240, 80, 80, 0.9);
      }
    }
  }

  .list-item__field {
    font-size: 11px;
    font-family: monospace;
    color: var(--gray-alpha-75);
    width: 100px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .list-item__bar-wrap {
    flex: 1;
    height: 4px;
    max-width: 150px;
    border-radius: 2px;
    background: var(--gray-alpha-15);
    overflow: hidden;
  }

  .list-item__bar {
    height: 100%;
    border-radius: 2px;
    background: rgba(16, 152, 173, 0.7);
    transition: width var(--transition-base);
  }

  .list-item__bytes {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--gray-alpha-65);
    width: 45px;
    text-align: right;
    flex-shrink: 0;
  }
}
</style>
