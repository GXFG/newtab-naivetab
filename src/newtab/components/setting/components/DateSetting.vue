<template>
  <ElementLayout field="date">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.date.format"></NInput>
      <Tips link :content="'https://dayjs.fenxianglu.cn/category/parse.html#%E5%AD%97%E7%AC%A6%E4%B8%B2'" />
    </NFormItem>
  </ElementLayout>

  <ElementConfig field="date" />
</template>

<script setup lang="ts">
import { NFormItem, NInput } from 'naive-ui'
import { globalState } from '@/logic'
</script>
