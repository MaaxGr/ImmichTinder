<template>
  <div
    ref="card"
    class="swipe-card"
    :style="cardStyle"
    @pointerdown="onPointerDown"
  >
    <slot />
    <div class="badge like" v-if="showLike">LIKE</div>
    <div class="badge dislike" v-if="showDislike">NOPE</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const emit = defineEmits<{
  (e: 'like'): void
  (e: 'dislike'): void
  (e: 'cancel'): void
}>()

const card = ref<HTMLElement | null>(null)

const state = reactive({
  dragging: false,
  startX: 0,
  startY: 0,
  dx: 0,
  dy: 0,
})

const ROTATE_FACTOR = 0.05 // rotation per px of dx
const THRESHOLD = 100 // px horizontal to trigger

const showLike = computed(() => state.dx > 40)
const showDislike = computed(() => state.dx < -40)

const cardStyle = computed(() => {
  const x = state.dx
  const y = state.dy
  const r = x * ROTATE_FACTOR
  const style = `transform: translate(${x}px, ${y}px) rotate(${r}deg); transition: ${state.dragging ? 'none' : 'transform 0.25s ease'};`
  return style
})

let root: HTMLElement | null = null

function onPointerDown(e: PointerEvent) {
  if (!card.value) return
  root = card.value
  root.setPointerCapture(e.pointerId)
  state.dragging = true
  state.startX = e.clientX - state.dx
  state.startY = e.clientY - state.dy
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!state.dragging) return
  state.dx = e.clientX - state.startX
  state.dy = e.clientY - state.startY
}

function resetPosition() {
  state.dragging = false
  state.dx = 0
  state.dy = 0
}

function onPointerUp() {
  if (!state.dragging) return
  const finalDx = state.dx
  state.dragging = false

  if (finalDx > THRESHOLD) {
    // fling right
    state.dx = window.innerWidth // animate out
    state.dy = state.dy
    setTimeout(() => {
      resetPosition()
      emit('like')
    }, 200)
    cleanup()
    return
  }
  if (finalDx < -THRESHOLD) {
    // fling left
    state.dx = -window.innerWidth
    state.dy = state.dy
    setTimeout(() => {
      resetPosition()
      emit('dislike')
    }, 200)
    cleanup()
    return
  }

  // snap back
  resetPosition()
  emit('cancel')
  cleanup()
}

function cleanup() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onUnmounted(() => cleanup())
</script>

<style scoped>
.swipe-card {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none; /* allow custom gestures */
  will-change: transform;
}
.badge {
  position: absolute;
  top: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 700;
  letter-spacing: 1px;
  color: white;
  backdrop-filter: blur(2px);
}
.badge.like {
  left: 12px;
  background: rgba(16, 185, 129, 0.8);
}
.badge.dislike {
  right: 12px;
  background: rgba(239, 68, 68, 0.8);
}
</style>
