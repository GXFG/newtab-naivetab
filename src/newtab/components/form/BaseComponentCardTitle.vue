<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="base_setting__title">
    <p class="title__main">{{ props.title }}</p>
  </div>
</template>

<style scoped>
.base_setting__title {
  padding: 16px 25px 10px 25px;
  z-index: 2000;
  position: sticky;
  top: 0;
  width: 100%;
  background-color: var(--n-color);
  border-bottom: 1px solid var(--n-tab-border-color);
  .title__main {
    font-size: 16px;
    font-weight: 500;
  }
}
</style>
