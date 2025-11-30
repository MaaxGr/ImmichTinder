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

      <SwipeCard v-else class="card" @like="onLike" @dislike="onDislike" @cancel="onCancel">
        <img :src="imageUrl" alt="Random from Immich" class="photo" draggable="false" />
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

const imageUrl = computed(() => (currentId.value ? `/api/image?id=${encodeURIComponent(currentId.value)}` : ''))

async function nextRandom() {
  loading.value = true
  error.value = null
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
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 12px;
  padding: 16px;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
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
}
.card {
  width: min(92vw, 520px);
  aspect-ratio: 3/4;
  background: #111;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 16px;
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
</style>
