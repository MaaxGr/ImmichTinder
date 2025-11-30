<template>
  <div class="page">
    <div class="header">
      <h1>ImmichSwipe</h1>
      <div class="spacer" />
      <button class="refresh" @click="nextRandom" :disabled="loading">↻</button>
    </div>

    <div class="card-area">
      <div v-if="error" class="state error">
        <p>{{ error }}</p>
        <button @click="nextRandom">Try again</button>
      </div>

      <div v-else-if="!imageUrl && loading" class="state loading">Loading...</div>

      <SwipeCard v-else class="card" :style="cardAspectStyle" @like="onLike" @dislike="onDislike" @cancel="onCancel">
        <img :src="imageUrl" :key="currentId" alt="Random from Immich" class="photo" draggable="false" @load="onImgLoad" />
      </SwipeCard>
    </div>

    <div class="controls">
      <button class="btn dislike" :disabled="!currentId || loading" @click="onDislike">Nope</button>
      <button class="btn like" :disabled="!currentId || loading" @click="onLike">Like</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import SwipeCard from '~/components/SwipeCard.vue'
import { ref, computed, onMounted } from 'vue'

const currentId = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const natural = ref<{ w: number; h: number } | null>(null)
const cardAspectStyle = computed(() => {
  const n = natural.value
  if (n && n.w > 0 && n.h > 0) {
    return { aspectRatio: `${n.w} / ${n.h}` }
  }
  // Fallback until the image loads
  return { aspectRatio: '3 / 4' }
})

const imageUrl = computed(() => (currentId.value ? `/api/image?id=${encodeURIComponent(currentId.value)}` : ''))

async function nextRandom() {
  loading.value = true
  error.value = null
  // Reset aspect while fetching next image so the card doesn't keep previous ratio
  natural.value = null
  try {
    const res = await $fetch<{ id: string }>(`/api/random`)
    currentId.value = res.id
  } catch (e: any) {
    error.value = e?.message || 'Failed to load random image'
    currentId.value = null
  } finally {
    loading.value = false
  }
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img && img.naturalWidth && img.naturalHeight) {
    natural.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
}

async function send(action: 'like' | 'dislike') {
  if (!currentId.value) return
  const id = currentId.value
  loading.value = true
  try {
    await $fetch(`/api/${action}`, {
      method: 'POST',
      body: { id },
    })
  } catch (e) {
    // Non-blocking: still load the next image even if like/dislike failed
    console.error(e)
  } finally {
    await nextRandom()
  }
}

function onLike() {
  void send('like')
}
function onDislike() {
  void send('dislike')
}
function onCancel() {
  // no-op for now
}

onMounted(() => {
  nextRandom()
})
</script>

<style scoped>
.page {
  height: 100dvh; /* lock viewport height */
  overflow: hidden; /* prevent page scroll */
  display: grid;
  grid-template-rows: 56px 1fr 72px; /* fixed header/footer heights */
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px; /* internal spacing so it doesn't affect layout height */
}
.header h1 {
  font-size: 20px;
  margin: 0;
}
.header .spacer {
  flex: 1;
}
.header .refresh {
  font-size: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.card-area {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden; /* ensure content stays within */
  padding: 8px 16px; /* breathing room without causing page scroll */
  box-sizing: border-box;
}
.card {
  width: min(92vw, 520px);
  max-width: 100%;
  max-height: 100%;
  background: #111;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
.photo {
  width: 100%;
  height: 100%;
  object-fit: contain; /* preserve original aspect ratio */
  user-select: none;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px 16px; /* internal spacing */
  box-sizing: border-box;
}
.btn {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  font-weight: 700;
  cursor: pointer;
}
.btn.dislike { background: #fee2e2; color: #991b1b; }
.btn.like { background: #d1fae5; color: #065f46; }

.state.loading, .state.error {
  color: #777;
}
.state.error button { margin-top: 8px; }

/* Landscape optimizations */
@media (orientation: landscape) {
  /* Keep fixed tracks; just tweak card sizing and control spacing */
  .card {
    width: min(70vw, 85vh);
    max-width: 100%;
    max-height: 100%;
  }
  .controls {
    gap: 24px;
  }
}
</style>
