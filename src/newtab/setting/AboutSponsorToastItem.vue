<template>
  <div
    class="toast__item"
    @animationend="handleAnimationEnd"
  >
    <span class="item__emoji">{{ props.message.split(' ')[0] }}</span>
    <span class="item__text">{{ props.message.split(' ').slice(1).join(' ') }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  message: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['remove'])

const handleAnimationEnd = () => {
  emit('remove')
}
</script>

<style scoped>
.toast__item {
  margin-bottom: 8px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 200px;
  font-family: 'HarmonyOS Sans', system-ui;
  opacity: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 24px;
  transform: translateY(20px);
  animation:
    toastIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
    toastOut 0.6s ease 2s forwards;

  .item__emoji {
    font-size: 1.2em;
    animation: emojiJump 0.6s ease-in-out 2;
  }
}

@keyframes toastIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toastOut {
  to {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
}

@keyframes emojiJump {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
