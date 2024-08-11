<script setup lang="ts">
import { useMessage } from 'naive-ui'
import ConfigBookmark from '@/popup/ConfigBookmark.vue'

window.$message = useMessage()
</script>

<template>
  <ConfigBookmark />
</template>
