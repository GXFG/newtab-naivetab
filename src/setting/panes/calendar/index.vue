<script setup lang="ts">
import { Icon } from '@iconify/vue/offline'
import NTButton from '@/components/ui/NTButton.vue'
import NTInput from '@/components/ui/NTInput.vue'
import NTSelect from '@/components/ui/NTSelect.vue'
import { useI18n } from 'vue-i18n'
import { localConfig } from '@/logic/config/state'
import { ICONS } from '@/logic/constants/icons'
import { showToast } from '@/common/toast'
import { SOLAR_TERM_NAMES } from '@/logic/calendar'
import {
  CUSTOM_SUBSCRIPTION,
  SUBSCRIPTION_REGIONS,
  fetchSubscription,
  getSubscriptionUrl,
  loadSubscription,
  readSubscriptionFetchedAt,
  resolveSubscriptionRegion,
  subscriptionState,
  writeSubscriptionCache,
} from '@/logic/calendar/subscriptions'
import type {
  TSubscriptionError,
  TSubscriptionRegion,
} from '@/logic/calendar/subscriptions'
import {
  SettingFormWrap,
  SettingFormItem,
  SettingFormInlineRow,
  SettingFormSection,
} from '@/setting/components'
import {
  NumberField,
  SwitchField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'

const beginsList = computed(() => [
  { label: window.$t('calendar.weekday.monday'), value: 1 },
  { label: window.$t('calendar.weekday.sunday'), value: 7 },
])

const { locale } = useI18n()

/**
 * 地区名由浏览器内置的 Intl.DisplayNames 生成，省掉 46 个地区各一条 i18n；
 * 只有台湾、香港需要覆盖成我们既定的文案。
 */
const regionDisplayNames = computed(
  () => new Intl.DisplayNames([locale.value], { type: 'region' }),
)

const regionLabel = (region: TSubscriptionRegion): string => {
  if (region === 'CN') return window.$t('calendar.subscriptionRegion.cn')
  if (region === 'TW') return window.$t('calendar.subscriptionRegion.tw')
  if (region === 'HK') return window.$t('calendar.subscriptionRegion.hk')
  return regionDisplayNames.value.of(region) ?? region
}

/** 节假日订阅下拉项：自定义地址置顶，其后是预设地区 */
const subscriptionList = computed(() => [
  {
    label: window.$t('calendar.subscriptionRegion.custom'),
    value: CUSTOM_SUBSCRIPTION,
  },
  ...SUBSCRIPTION_REGIONS.map((region) => ({
    label: regionLabel(region),
    value: region,
  })),
])

const isCustomSubscription = computed(
  () => localConfig.calendar.subscriptionRegion === CUSTOM_SUBSCRIPTION,
)

/**
 * 自定义地址的草稿。
 * 输入过程中只改这个 ref，不写 localConfig、也不触发任何请求；
 * 只有点击「验证」且成功后，才把地址提交到 localConfig.calendar.customSubscriptionUrl，
 * 从而真正替换当前订阅。
 */
const draftCustomUrl = ref(localConfig.calendar.customSubscriptionUrl)

/**
 * 是否正在验证。结果通过 toast 展示，面板内不保留固定提示，
 * 这里只用于禁用按钮与「验证中不打断草稿」的判断。
 */
const isValidating = ref(false)

/** 每次草稿/地区变化都 +1；异步验证返回时序号不一致就丢弃结果 */
let validationToken = 0

const resetValidation = () => {
  validationToken += 1
  isValidating.value = false
}

const subscriptionErrorText = (error: TSubscriptionError): string =>
  window.$t(`calendar.subscriptionError.${error.code}`)

/** 设置面板里当前生效的订阅地址（不是输入框的草稿） */
const currentSubscriptionUrl = computed(() => {
  if (localConfig.calendar.subscriptionRegion === CUSTOM_SUBSCRIPTION) {
    return localConfig.calendar.customSubscriptionUrl.trim()
  }
  // 非法地区回退默认值，避免生成 /undefined.ics
  return getSubscriptionUrl(
    resolveSubscriptionRegion(localConfig.calendar.subscriptionRegion),
  )
})

/** 上次更新时间（读 localStorage，newtab 抽屉与 options 页都能拿到） */
const lastUpdatedAt = ref(0)
const refreshLastUpdatedAt = () => {
  lastUpdatedAt.value = readSubscriptionFetchedAt(currentSubscriptionUrl.value)
}

const isRefreshing = ref(false)
/**
 * 并发的加载可能来自“切换地区”与“验证成功”两个 watch；
 * 用计数而不是布尔值，避免先结束的请求把后一个请求的“刷新中”提前关掉。
 */
let pendingRefreshes = 0

/** 状态文案：刷新中 → 更新失败 → 上次更新 → 尚未更新 */
const subscriptionStatusText = computed(() => {
  if (isRefreshing.value) return window.$t('calendar.subscriptionRefreshing')
  if (subscriptionState.error) return window.$t('calendar.subscriptionFailed')
  if (!lastUpdatedAt.value)
    return window.$t('calendar.subscriptionNeverUpdated')

  const time = dayjs(lastUpdatedAt.value).format('MM-DD HH:mm')
  // window.$t 的类型不支持命名插值，这里直接拼接
  return `${window.$t('calendar.subscriptionLastUpdated')} ${time}`
})

/**
 * 加载订阅。force = false 时缓存未过期就不发请求，所以「切换地区」「打开面板」都可安全调用；
 * 同一 URL 的并发请求在 subscriptions 层已合并。
 */
const loadCurrentSubscription = async (force: boolean) => {
  const url = currentSubscriptionUrl.value
  if (!url) {
    // 自定义地址为空：回到 idle，避免 options 页残留上一个订阅的状态
    void loadSubscription('')
    return
  }

  pendingRefreshes += 1
  isRefreshing.value = true
  try {
    await loadSubscription(url, { termNames: SOLAR_TERM_NAMES, force })
    refreshLastUpdatedAt()
  } finally {
    pendingRefreshes = Math.max(0, pendingRefreshes - 1)
    isRefreshing.value = pendingRefreshes > 0
  }
}

/** 刷新中重复点击直接忽略（不用 disabled，避免按钮样式闪动） */
const onRefreshSubscription = () => {
  if (isRefreshing.value) return
  void loadCurrentSubscription(true)
}

// 配置可能被云同步/旧开发版写坏；在创建 watch 之前修正为合法地区，避免下拉空白。
// 放在 setup 阶段而不是 onMounted：避免给下面的 region watch 制造一次多余加载。
const initialRegion = localConfig.calendar.subscriptionRegion
if (
  initialRegion !== CUSTOM_SUBSCRIPTION &&
  resolveSubscriptionRegion(initialRegion) !== initialRegion
) {
  localConfig.calendar.subscriptionRegion =
    resolveSubscriptionRegion(initialRegion)
}

onMounted(() => {
  draftCustomUrl.value = localConfig.calendar.customSubscriptionUrl
  refreshLastUpdatedAt()
  // 首次选中一个没缓存的地区时自动拉取，避免停在「尚未更新」
  void loadCurrentSubscription(false)
})

// 生效地址变化（切换地区/验证成功/云同步）刷新文案并加载；draft 变化不触发请求
watch(currentSubscriptionUrl, () => {
  refreshLastUpdatedAt()
  void loadCurrentSubscription(false)
})

// 切换地区：草稿恢复为已保存地址，重置校验状态；实际加载由上面的地址 watch 负责
watch(
  () => localConfig.calendar.subscriptionRegion,
  () => {
    const region = localConfig.calendar.subscriptionRegion
    // 云同步可能在运行期写入未知地区；修正后 watch 会再跑一次
    if (
      region !== CUSTOM_SUBSCRIPTION &&
      resolveSubscriptionRegion(region) !== region
    ) {
      localConfig.calendar.subscriptionRegion =
        resolveSubscriptionRegion(region)
      return
    }

    draftCustomUrl.value = localConfig.calendar.customSubscriptionUrl
    resetValidation()
  },
)

// 输入只改草稿；编辑后旧的验证结果不再成立，进行中的验证作废
watch(draftCustomUrl, () => {
  resetValidation()
})

// 云同步等外部来源更新了已保存地址：同步草稿（验证过程中不打断）
watch(
  () => localConfig.calendar.customSubscriptionUrl,
  (value) => {
    if (!isCustomSubscription.value) return
    if (isValidating.value) return
    draftCustomUrl.value = value
  },
)

/** 校验自定义地址：成功后才替换订阅 URL；失败时当前订阅保持不变。结果只用 toast 反馈 */
const onValidateCustomUrl = async () => {
  const url = draftCustomUrl.value.trim()
  const token = ++validationToken
  isValidating.value = true

  try {
    // 先只校验，不碰 config/state；这样输入或验证失败都不会影响当前订阅
    const result = await fetchSubscription(url, { termNames: SOLAR_TERM_NAMES })
    if (token !== validationToken) return

    // 校验期间切走了地区：不提交，避免覆盖用户刚选的订阅
    if (!isCustomSubscription.value) return

    // 验证成功才真正替换 URL；随后 loadSubscription 命中刚写入的缓存，不重复请求
    writeSubscriptionCache(result)
    localConfig.calendar.customSubscriptionUrl = url
    await loadSubscription(url, { termNames: SOLAR_TERM_NAMES })
    if (token !== validationToken) return

    refreshLastUpdatedAt()
    showToast.success(window.$t('calendar.subscriptionValid'))
  } catch (error) {
    if (token !== validationToken) return
    showToast.error(
      subscriptionErrorText(
        (error as { subscriptionError?: TSubscriptionError })
          .subscriptionError ?? {
          code: 'network',
        },
      ),
    )
  } finally {
    // 已被新的验证/编辑取代时不要收回按钮状态，交给那一轮负责
    if (token === validationToken) {
      isValidating.value = false
    }
  }
}
</script>

<template>
  <SettingFormWrap widget-code="calendar">
    <!-- 日历配置 -->
    <SettingFormSection
      :title="$t('calendar.sectionConfig')"
      :icon="ICONS.settings"
    >
      <SettingFormItem :label="$t('calendar.weekBeginsOn')">
        <NTRadioGroup
          v-model:value="localConfig.calendar.weekBeginsOn"
          direction="horizontal"
        >
          <NTRadio
            v-for="item in beginsList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NTRadio>
        </NTRadioGroup>
      </SettingFormItem>

      <SettingFormItem
        :label="$t('calendar.holidaySubscription')"
        :tip-content="`${$t('calendar.subscriptionNote')} ${subscriptionStatusText}`"
      >
        <div class="subscription">
          <div class="subscription__row">
            <NTSelect
              v-model:value="localConfig.calendar.subscriptionRegion"
              :options="subscriptionList"
              size="small"
            />
            <NTButton
              class="subscription__refresh"
              type="primary"
              size="tiny"
              variant="secondary"
              round
              @click="onRefreshSubscription()"
            >
              <Icon :icon="ICONS.refresh" />
              {{ $t('calendar.subscriptionRefresh') }}
            </NTButton>
          </div>
        </div>
      </SettingFormItem>

      <SettingFormItem
        v-if="isCustomSubscription"
        :label="$t('calendar.customSubscriptionUrl')"
        :tip-content="$t('calendar.customSubscriptionHint')"
      >
        <div class="subscription__custom">
          <NTInput
            v-model:value="draftCustomUrl"
            size="small"
            clearable
            placeholder="https://"
          />
          <NTButton
            type="primary"
            size="tiny"
            variant="secondary"
            round
            :disabled="isValidating"
            @click="onValidateCustomUrl()"
          >
            <Icon :icon="ICONS.check" />
            {{ $t('calendar.subscriptionValidate') }}
          </NTButton>
        </div>
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.calendar.isHolidayMarkVisible"
        :label="$t('calendar.holidayMarkVisible')"
      />

      <SwitchField
        v-model="localConfig.calendar.isLunarTermVisible"
        :label="$t('calendar.lunarTermVisible')"
      />

      <SwitchField
        v-model="localConfig.calendar.isAlmanacVisible"
        :label="$t('calendar.almanacVisible')"
      />

      <SwitchField
        v-model="localConfig.calendar.festivalCountdown"
        :label="$t('calendar.festivalCountdown')"
      />

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.calendar.width"
          :label="$t('common.width')"
          :min="1"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.calendar.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 今日样式 -->
    <SettingFormSection
      :title="$t('calendar.sectionTodayStyle')"
      :icon="ICONS.calendarToday"
    >
      <ColorField
        v-model="localConfig.calendar.todayItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.todayDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.todayDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.todayLabelFontColor"
          :label="$t('calendar.todayLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.todayLabelBackgroundColor"
          :label="$t('calendar.todayLabelBackgroundColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 休息日样式 -->
    <SettingFormSection
      :title="$t('calendar.sectionRestStyle')"
      :icon="ICONS.calendarRest"
    >
      <ColorField
        v-model="localConfig.calendar.restItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.restDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.restDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.restLabelFontColor"
          :label="$t('calendar.restLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.restLabelBackgroundColor"
          :label="$t('calendar.restLabelBackgroundColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 工作日样式 -->
    <SettingFormSection
      :title="$t('calendar.sectionWorkStyle')"
      :icon="ICONS.calendarWork"
    >
      <ColorField
        v-model="localConfig.calendar.workItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.workDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.workDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.workLabelFontColor"
          :label="$t('calendar.workLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.workLabelBackgroundColor"
          :label="$t('calendar.workLabelBackgroundColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 全局配色 -->
    <SettingFormSection
      :title="$t('calendar.sectionGlobalColor')"
      :icon="ICONS.palette"
    >
      <FontField
        v-model:font-family="localConfig.calendar.fontFamily"
        v-model:font-color="localConfig.calendar.fontColor"
        v-model:font-size="localConfig.calendar.fontSize"
        :label="$t('common.font')"
      />

      <FontField
        v-model:font-family="localConfig.calendar.dayFontFamily"
        v-model:font-color="localConfig.calendar.dayFontColor"
        v-model:font-size="localConfig.calendar.dayFontSize"
        :label="$t('calendar.dayFontLabel')"
      />

      <FontField
        v-model:font-family="localConfig.calendar.descFontFamily"
        v-model:font-color="localConfig.calendar.descFontColor"
        v-model:font-size="localConfig.calendar.descFontSize"
        :label="$t('calendar.descFontLabel')"
      />

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.calendar.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="30"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.calendar.isBorderEnabled"
          v-model:color="localConfig.calendar.borderColor"
          v-model:width="localConfig.calendar.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.calendar.isShadowEnabled"
          v-model:color="localConfig.calendar.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>

      <ColorField
        v-model="localConfig.calendar.holidayFontColor"
        :label="$t('calendar.holidayFontColorLabel')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>

<style scoped>
/* 整宽列：下拉与刷新按钮同一行，状态在下一行 */
.subscription {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.subscription__row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

/* 触发器的根元素就是 .reka-select__trigger，占满按钮之外的剩余宽度 */
.subscription__row :deep(.reka-select__trigger) {
  flex: 1;
  min-width: 0;
}

.subscription__refresh {
  flex-shrink: 0;
}

.subscription__custom {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.subscription__custom :deep(.reka-input) {
  flex: 1;
  min-width: 0;
}
</style>
