<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  SettingFormSection,
  SettingFormItem,
  SettingFormInlineRow,
} from '@/setting/components'
import { ColorField, NumberField, ToggleColorField } from '@/setting/fields'
import { ICONS } from '@/logic/constants/icons'
import { localConfig } from '@/logic/config/state'
import {
  availableFontOptions,
  fontSelectRenderLabel,
} from '@/logic/store/style'

const FONT_WEIGHT_OPTIONS = [
  { label: 'Thin (100)', value: 100 },
  { label: 'ExtraLight (200)', value: 200 },
  { label: 'Light (300)', value: 300 },
  { label: 'Regular (400)', value: 400 },
  { label: 'Medium (500)', value: 500 },
  { label: 'SemiBold (600)', value: 600 },
  { label: 'Bold (700)', value: 700 },
  { label: 'ExtraBold (800)', value: 800 },
  { label: 'Black (900)', value: 900 },
]

const defaultOverlay = (): TNameplate => ({
  id: crypto.randomUUID(),
  text: 'NaiveTab',
  x: 0,
  y: 0,
  fontFamily: 'system',
  fontSize: 14,
  fontWeight: 500,
  color: ['rgba(75,70,65,0.85)', 'rgba(210,220,235,0.85)'],
  backgroundColor: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'],
  borderEnabled: false,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.1)'],
  shadowEnabled: false,
  shadowOffsetX: 0,
  shadowOffsetY: 1,
  shadowBlur: 3,
  shadowColor: ['rgba(0,0,0,0.07)', 'rgba(0,0,0,0.3)'],
  textShadowEnabled: true,
  textShadowOffsetX: 1,
  textShadowOffsetY: 2,
  textShadowBlur: 2,
  textShadowColor: ['rgba(0,0,0,0.3)', 'rgba(255,255,255,0.2)'],
  rotation: 0,
  padding: 6,
})

const overlays = computed({
  get: () => localConfig.keyboardCommon.nameplates ?? [],
  set: (v) => {
    localConfig.keyboardCommon.nameplates = v
  },
})

const selectedId = ref<string | null>(null)

watch(
  overlays,
  (list) => {
    if (list.length > 0 && !list.find((o) => o.id === selectedId.value)) {
      selectedId.value = list[0].id
    }
  },
  { immediate: true },
)

const selectedIndex = computed(() => {
  if (!selectedId.value) return -1
  return overlays.value.findIndex((o) => o.id === selectedId.value)
})

const selectedOverlay = computed(() => {
  if (selectedIndex.value === -1) return null
  return overlays.value[selectedIndex.value]
})

// 铭牌文字输入防抖，避免每次按键都触发 config sync
const draftText = ref('')
let textDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(selectedOverlay, (np) => {
  draftText.value = np?.text ?? ''
})

watch(draftText, (val) => {
  if (!selectedOverlay.value) return
  if (textDebounceTimer) clearTimeout(textDebounceTimer)
  textDebounceTimer = setTimeout(() => {
    selectedOverlay.value!.text = val
  }, 300)
})

const selectOverlay = (id: string) => {
  selectedId.value = id
}

const addOverlay = () => {
  const overlay = defaultOverlay()
  overlays.value = [...overlays.value, overlay]
  selectedId.value = overlay.id
}

const deleteOverlay = (id: string) => {
  overlays.value = overlays.value.filter((o) => o.id !== id)
  if (selectedId.value === id) {
    selectedId.value = overlays.value[0]?.id ?? null
  }
}
</script>

<template>
  <!-- 铭牌列表 -->
  <div class="nameplate-list">
    <NTag
      v-for="overlay in overlays"
      :key="overlay.id"
      :type="overlay.id === selectedId ? 'primary' : 'default'"
      closable
      size="medium"
      @click="selectOverlay(overlay.id)"
      @close="deleteOverlay(overlay.id)"
    >
      {{ overlay.text || '…' }}
    </NTag>

    <NButton
      size="small"
      quaternary
      @click="addOverlay"
    >
      <template #icon>
        <Icon :icon="ICONS.add" />
      </template>
      {{ $t('keyboardNameplate.add') }}
    </NButton>
  </div>

  <!-- 拖拽提示 -->
  <div class="nameplate-tip">
    <Icon
      :icon="ICONS.info"
      class="tip__icon"
    />
    <span>{{ $t('keyboardNameplate.dragHint') }}</span>
  </div>

  <!-- 样式配置 -->
  <template v-if="selectedOverlay">
    <SettingFormSection
      :title="$t('keyboardNameplate.textContent')"
      icon="mdi:format-text"
    >
      <SettingFormItem :label="$t('keyboardNameplate.text')">
        <NInput
          v-model:value="draftText"
          size="small"
          :placeholder="$t('keyboardNameplate.textPlaceholder')"
        />
      </SettingFormItem>

      <SettingFormItem :label="$t('keyboardNameplate.font')">
        <NSelect
          :value="selectedOverlay.fontFamily"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
          size="small"
          @update:value="selectedOverlay.fontFamily = $event ?? 'system'"
        />
        <NInputNumber
          :value="selectedOverlay.fontSize"
          size="small"
          :step="1"
          :min="5"
          :max="200"
          @update:value="selectedOverlay.fontSize = $event ?? 0"
        />
      </SettingFormItem>

      <SettingFormItem :label="$t('keyboardNameplate.fontWeight')">
        <NSelect
          :value="selectedOverlay.fontWeight"
          :options="FONT_WEIGHT_OPTIONS"
          size="small"
          @update:value="selectedOverlay.fontWeight = $event ?? 400"
        />
      </SettingFormItem>

      <ColorField
        v-model="selectedOverlay.color"
        :label="$t('keyboardNameplate.textColor')"
      />
    </SettingFormSection>

    <SettingFormSection
      :title="$t('common.appearance')"
      icon="mdi:palette-outline"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="selectedOverlay.padding"
          :label="$t('keyboardNameplate.padding')"
          :min="0"
          :max="100"
        />
        <NumberField
          v-model="selectedOverlay.rotation"
          :label="$t('keyboardNameplate.rotation')"
          :min="-180"
          :max="180"
        />
      </SettingFormInlineRow>

      <ColorField
        v-model="selectedOverlay.backgroundColor"
        :label="$t('keyboardNameplate.backgroundColor')"
      />

      <ToggleColorField
        v-model:enable="selectedOverlay.borderEnabled"
        v-model:color="selectedOverlay.borderColor"
        v-model:width="selectedOverlay.borderWidth"
        :label="$t('common.border')"
      />

      <template v-if="selectedOverlay.borderEnabled">
        <NumberField
          v-model="selectedOverlay.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
        />
      </template>
    </SettingFormSection>

    <SettingFormSection
      :title="$t('keyboardNameplate.shadow')"
      icon="mdi:shadow"
    >
      <ToggleColorField
        v-model:enable="selectedOverlay.shadowEnabled"
        v-model:color="selectedOverlay.shadowColor"
        :label="$t('common.shadow')"
      />

      <SettingFormInlineRow>
        <NumberField
          v-model="selectedOverlay.shadowOffsetX"
          :label="$t('keyboardNameplate.shadowOffsetX')"
          :min="-50"
          :max="50"
        />
        <NumberField
          v-model="selectedOverlay.shadowOffsetY"
          :label="$t('keyboardNameplate.shadowOffsetY')"
          :min="-50"
          :max="50"
        />
      </SettingFormInlineRow>

      <NumberField
        v-model="selectedOverlay.shadowBlur"
        :label="$t('keyboardNameplate.shadowBlur')"
        :min="0"
        :max="100"
      />
    </SettingFormSection>

    <SettingFormSection
      :title="$t('keyboardNameplate.textShadow')"
      icon="mdi:format-text-shadow"
    >
      <ToggleColorField
        v-model:enable="selectedOverlay.textShadowEnabled"
        v-model:color="selectedOverlay.textShadowColor"
        :label="$t('keyboardNameplate.textShadow')"
      />

      <SettingFormInlineRow>
        <NumberField
          v-model="selectedOverlay.textShadowOffsetX"
          :label="$t('keyboardNameplate.shadowOffsetX')"
          :min="-50"
          :max="50"
        />
        <NumberField
          v-model="selectedOverlay.textShadowOffsetY"
          :label="$t('keyboardNameplate.shadowOffsetY')"
          :min="-50"
          :max="50"
        />
      </SettingFormInlineRow>

      <NumberField
        v-model="selectedOverlay.textShadowBlur"
        :label="$t('keyboardNameplate.shadowBlur')"
        :min="0"
        :max="100"
      />
    </SettingFormSection>
  </template>

  <!-- 无铭牌时的空状态 -->
  <div
    v-if="overlays.length === 0"
    class="nameplate-empty"
  >
    <Icon
      :icon="ICONS.text"
      class="empty__icon"
    />
    <p>{{ $t('keyboardNameplate.emptyHint') }}</p>
  </div>

  <!-- 有铭牌但未选中 -->
  <div
    v-else-if="!selectedOverlay"
    class="nameplate-empty"
  >
    <Icon
      :icon="ICONS.info"
      class="empty__icon"
    />
    <p>{{ $t('keyboardNameplate.selectHint') }}</p>
  </div>
</template>

<style scoped>
/* ── 铭牌列表 ── */
.nameplate-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: 0 0 var(--space-4);
}

/* ── 空状态 ── */
.nameplate-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  color: var(--gray-alpha-40);
  text-align: center;
  font-size: 13px;

  .empty__icon {
    font-size: 32px;
  }
}

/* ── 拖拽提示 ── */
.nameplate-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--gray-alpha-50);

  .tip__icon {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--gray-alpha-40);
  }
}
</style>
