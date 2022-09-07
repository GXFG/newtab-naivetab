<template>
  <AddBookmark />
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import AddBookmark from '@/popup/components/AddBookmark.vue'

window.$message = useMessage()
</script>
