<template>
  <div
    ref="card"
    class="swipe-card"
    :class="{
      animating: state.animating,
      liking: state.animating && state.animDir === 'right',
      disliking: state.animating && state.animDir === 'left',
    }"
    :style="cardStyle"
    @pointerdown="onPointerDown"
  >
    <slot />
    <div class="badge like" :class="{ pop: showLike || (state.animating && state.animDir==='right') }" v-if="showLike || (state.animating && state.animDir==='right')">LIKE</div>
    <div class="badge dislike" :class="{ pop: showDislike || (state.animating && state.animDir==='left') }" v-if="showDislike || (state.animating && state.animDir==='left')">NOPE</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'

const emit = defineEmits<{
  (e: 'like'): void
  (e: 'dislike'): void
  (e: 'cancel'): void
}>()

const card = ref<HTMLElement | null>(null)

const state = reactive({
  dragging: false,
  animating: false,
  animDir: null as null | 'left' | 'right',
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
  const transition = state.dragging ? 'none' : 'transform 0.35s cubic-bezier(.22,.61,.36,1)'
  return `transform: translate(${x}px, ${y}px) rotate(${r}deg); transition: ${transition};`
})

let root: HTMLElement | null = null

function onPointerDown(e: PointerEvent) {
  if (state.animating) return
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
  if (!state.dragging || state.animating) return
  state.dx = e.clientX - state.startX
  state.dy = e.clientY - state.startY
}

function resetPosition() {
  state.dragging = false
  state.animating = false
  state.animDir = null
  state.dx = 0
  state.dy = 0
}

function onPointerUp() {
  if (!state.dragging) return
  const finalDx = state.dx
  state.dragging = false

  if (finalDx > THRESHOLD) {
    void flingRight()
    cleanup()
    return
  }
  if (finalDx < -THRESHOLD) {
    void flingLeft()
    cleanup()
    return
  }

  // snap back
  resetPosition()
  emit('cancel')
  cleanup()
}

async function fling(dir: 'left' | 'right') {
  if (state.animating) return
  state.animating = true
  state.animDir = dir
  // give a subtle upward motion
  state.dy = -30
  state.dx = dir === 'right' ? window.innerWidth : -window.innerWidth
  await new Promise(resolve => setTimeout(resolve, 300))
  resetPosition()
  if (dir === 'right') emit('like')
  else emit('dislike')
}

async function flingRight() { await fling('right') }
async function flingLeft() { await fling('left') }

function cleanup() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onUnmounted(() => cleanup())

defineExpose({ flingRight, flingLeft })
</script>

<style scoped>
.swipe-card {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none; /* allow custom gestures */
  will-change: transform;
}
.swipe-card.liking {
  box-shadow: 0 10px 30px rgba(16,185,129,0.35);
}
.swipe-card.disliking {
  box-shadow: 0 10px 30px rgba(239,68,68,0.35);
}
/* Bigger, bolder, more visible LIKE/NOPE stamps */
.badge {
  position: absolute;
  top: 50%;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  font-size: clamp(20px, 6vw, 42px);
  letter-spacing: 2px;
  text-transform: uppercase;
  background: transparent;
  color: white;
  border: 4px solid rgba(255,255,255,0.9);
  text-shadow: 0 2px 8px rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
  z-index: 5;
  --rot: 0deg;
  transform: translateY(-50%) rotate(var(--rot)) scale(0.9);
  opacity: 0.95;
}
.badge.like {
  left: 16px;
  color: #10B981; /* emerald-500 */
  border-color: rgba(16,185,129,0.95);
  box-shadow: 0 0 0 4px rgba(16,185,129,0.18), 0 6px 22px rgba(16,185,129,0.25);
  --rot: -12deg;
}
.badge.dislike {
  right: 16px;
  color: #EF4444; /* red-500 */
  border-color: rgba(239,68,68,0.95);
  box-shadow: 0 0 0 4px rgba(239,68,68,0.18), 0 6px 22px rgba(239,68,68,0.25);
  --rot: 12deg;
}
.badge.pop {
  animation: pop 250ms ease-out both;
}
@keyframes pop {
  0% { transform: scale(0.75); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
