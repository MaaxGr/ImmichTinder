<template>
  <div class="page">
    <div class="header">
      <img class="logo" src="/logo.png" alt="ImmichSwipe" draggable="false" />
      <div class="spacer" />
      <button class="refresh" @click="showNextCard" :disabled="initialLoading">↻</button>
    </div>

    <div class="card-area">
      <div v-if="error && !currentId" class="state error">
        <p>{{ error }}</p>
        <button @click="retryInitial">Try again</button>
      </div>

      <div v-else-if="!currentId && initialLoading" class="state loading">Loading...</div>

      <SwipeCard ref="swipe" v-else class="card" :style="cardAspectStyle" @like="onLikeCommit" @dislike="onDislikeCommit" @superlike="onSuperlikeCommit" @options="onOptions" @cancel="onCancel">
        <img :src="imageUrl" :key="currentId" alt="Random from Immich" class="photo" draggable="false" @load="onImgLoad" />
        <div class="meta" v-if="formattedTakenAt || locationWithFlag">
          <div class="line time" v-if="formattedTakenAt">{{ formattedTakenAt }}</div>
          <div class="line location" v-if="locationWithFlag">{{ locationWithFlag }}</div>
        </div>
      </SwipeCard>

      <div v-if="showOptions" class="modal-backdrop" @click.self="closeOptions">
        <div class="modal">
          <h3>Image options</h3>
          <p class="id">ID: <code>{{ currentId }}</code></p>
          <div class="actions">
            <a v-if="immichAssetUrl" class="btn" :href="immichAssetUrl" target="_blank" rel="noopener" @click.stop>Open in Immich</a>
            <button class="btn danger" :disabled="deleting" @click="deleteCurrent">{{ deleting ? 'Deleting…' : 'Delete image' }}</button>
            <button class="btn" :disabled="deleting" @click="closeOptions">Close</button>
          </div>
          <p v-if="deleteError" class="error">{{ deleteError }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import SwipeCard from '~/components/SwipeCard.vue'
import { ref, computed, onMounted } from 'vue'

// Exposed methods from SwipeCard
type SwipeCardExposed = { flingRight: () => Promise<void>; flingLeft: () => Promise<void>; flingUp: () => Promise<void> }
const swipe = ref<SwipeCardExposed | null>(null)

const currentId = ref<string | null>(null)
const error = ref<string | null>(null)

// Options modal state
const showOptions = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

// Metadata for display
const takenAt = ref<string | null>(null)
const location = ref<{
  text: string | null
  city: string | null
  state: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
} | null>(null)

const formattedTakenAt = computed(() => {
  if (!takenAt.value) return ''
  const d = new Date(takenAt.value)
  if (isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    } as Intl.DateTimeFormatOptions).format(d)
  } catch {
    return d.toLocaleString()
  }
})

const locationText = computed(() => {
  const loc = location.value
  if (!loc) return ''
  if (loc.text) return loc.text
  const parts = [loc.city, loc.state, loc.country].filter(Boolean)
  return parts.join(', ')
})

function toFlagEmojiFromCountry(countryRaw?: string | null): string {
  if (!countryRaw) return ''
  const map: Record<string, string> = {
    'UNITED STATES': 'US', 'USA': 'US', 'US': 'US', 'U.S.A.': 'US',
    'UNITED KINGDOM': 'GB', 'UK': 'GB', 'ENGLAND': 'GB', 'SCOTLAND': 'GB', 'WALES': 'GB', 'GB': 'GB',
    'GERMANY': 'DE', 'DEUTSCHLAND': 'DE', 'DE': 'DE',
    'FRANCE': 'FR', 'FR': 'FR',
    'SPAIN': 'ES', 'ESPAÑA': 'ES', 'ES': 'ES',
    'ITALY': 'IT', 'ITALIA': 'IT', 'IT': 'IT',
    'AUSTRIA': 'AT', 'ÖSTERREICH': 'AT', 'AT': 'AT',
    'SWITZERLAND': 'CH', 'SCHWEIZ': 'CH', 'SUISSE': 'CH', 'SVIZZERA': 'CH', 'CH': 'CH',
    'PORTUGAL': 'PT', 'PT': 'PT',
    'NETHERLANDS': 'NL', 'HOLLAND': 'NL', 'NL': 'NL',
    'POLAND': 'PL', 'POLSKA': 'PL', 'PL': 'PL',
    'CZECHIA': 'CZ', 'CZECH REPUBLIC': 'CZ', 'CZ': 'CZ',
    'BELGIUM': 'BE', 'BE': 'BE',
    'SWEDEN': 'SE', 'SE': 'SE',
    'NORWAY': 'NO', 'NO': 'NO',
    'DENMARK': 'DK', 'DK': 'DK',
    'FINLAND': 'FI', 'FI': 'FI',
    'IRELAND': 'IE', 'IE': 'IE',
    'CANADA': 'CA', 'CA': 'CA',
    'AUSTRALIA': 'AU', 'AU': 'AU',
    'NEW ZEALAND': 'NZ', 'NZ': 'NZ',
    'JAPAN': 'JP', 'JP': 'JP',
    'CHINA': 'CN', 'CN': 'CN',
    'INDIA': 'IN', 'IN': 'IN'
  }
  const key = countryRaw.trim().toUpperCase()
  let code = map[key]
  if (!code) {
    // If already looks like a 2-letter alpha code
    if (/^[A-Z]{2}$/.test(key)) code = key
  }
  if (!code) return ''
  return isoToFlagEmoji(code)
}

function isoToFlagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return ''
  const base = 0x1F1E6
  const chars = code.split('').map(c => String.fromCodePoint(base + (c.charCodeAt(0) - 65)))
  return chars.join('')
}

const locationWithFlag = computed(() => {
  const text = locationText.value
  const flag = toFlagEmojiFromCountry(location.value?.country || null)
  if (flag && text) return `${flag} ${text}`
  if (text) return text
  return ''
})

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

// Immich deep link for opening the current asset in Immich Web
const runtime = useRuntimeConfig()
const immichAssetUrl = computed(() => {
  const base = (runtime as any)?.public?.immichUrl as string | undefined
  const id = currentId.value
  if (!base || !id) return ''
  const clean = base.endsWith('/') ? base.slice(0, -1) : base
  return `${clean}/photos/${encodeURIComponent(id)}`
})

// Two-card pipeline: keep next card preloaded for instant swap
const initialLoading = ref(true)
const preloading = ref(false)
const nextCard = ref<{
  id: string
  takenAt: string | null
  location: {
    text: string | null
    city: string | null
    state: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
  } | null
  natural: { w: number; h: number } | null
} | null>(null)

async function fetchRandomMeta() {
  return await $fetch<{
    id: string
    localDateTime?: string | null
    takenAt?: string | null
    location?: {
      text: string | null
      city: string | null
      state: string | null
      country: string | null
      latitude: number | null
      longitude: number | null
    } | null
  }>(`/api/random`)
}

function preloadImage(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
    img.onerror = (e) => reject(e)
    // Try to decode for smoother paint if supported
    // @ts-ignore
    if (img.decode) {
      img.addEventListener('load', async () => {
        try { /* no-op, already loaded */ } catch {}
      })
    }
    img.src = url
  })
}

async function preloadNext() {
  if (preloading.value) return
  preloading.value = true
  try {
    const res = await fetchRandomMeta()
    const url = `/api/image?id=${encodeURIComponent(res.id)}`
    let dims: { w: number; h: number } | null = null
    try {
      dims = await preloadImage(url)
    } catch {
      // If image decode fails, still proceed; aspect will adjust on load
      dims = null
    }
    nextCard.value = {
      id: res.id,
      takenAt: res.takenAt || res.localDateTime || null,
      location: res.location || null,
      natural: dims,
    }
    error.value = null
  } catch (e: any) {
    if (!currentId.value) {
      error.value = e?.message || 'Failed to load random image'
    }
    nextCard.value = null
  } finally {
    preloading.value = false
  }
}

function applyNextToCurrent() {
  if (!nextCard.value) return false
  const n = nextCard.value
  currentId.value = n.id
  takenAt.value = n.takenAt
  location.value = n.location
  natural.value = n.natural
  nextCard.value = null
  return true
}

async function showNextCard() {
  // If we already have a preloaded next card, swap immediately
  let swapped = applyNextToCurrent()
  if (!swapped) {
    await preloadNext()
    swapped = applyNextToCurrent()
  }
  // Start preloading the following card immediately
  void preloadNext()
}

function retryInitial() {
  initialLoading.value = true
  currentId.value = null
  takenAt.value = null
  location.value = null
  natural.value = null
  error.value = null
  void initPipeline()
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img && img.naturalWidth && img.naturalHeight) {
    natural.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
}

async function commit(action: 'like' | 'dislike' | 'superlike') {
  const prevId = currentId.value
  // Swap immediately for snappy UX
  showNextCard()
  if (prevId) {
    try {
      await $fetch(`/api/${action}`, { method: 'POST', body: { id: prevId } })
    } catch (e) {
      console.error(e)
    }
  }
}

// Called by SwipeCard after its fling completes
function onLikeCommit() {
  void commit('like')
}
function onDislikeCommit() {
  void commit('dislike')
}
function onSuperlikeCommit() {
  void commit('superlike')
}

// Trigger programmatic fling animations from buttons
async function triggerLike() {
  if (!swipe.value) return
  await swipe.value.flingRight()
}
async function triggerDislike() {
  if (!swipe.value) return
  await swipe.value.flingLeft()
}
async function triggerSuperlike() {
  // No dedicated up-swipe animation; commit immediately
  await commit('superlike')
}

function onOptions() {
  deleteError.value = null
  showOptions.value = true
}
function closeOptions() {
  if (deleting.value) return
  showOptions.value = false
}
async function deleteCurrent() {
  if (!currentId.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await $fetch('/api/delete', { method: 'POST', body: { id: currentId.value } })
    // After deletion, move to next card
    showOptions.value = false
    await showNextCard()
  } catch (e: any) {
    deleteError.value = e?.data?.message || e?.message || 'Failed to delete image'
  } finally {
    deleting.value = false
  }
}

function onCancel() {
  // no-op for now
}

async function initPipeline() {
  try {
    await preloadNext()
    applyNextToCurrent()
    // Kick off preloading of the following card
    void preloadNext()
  } finally {
    initialLoading.value = false
  }
}

onMounted(() => {
  void initPipeline()
})
</script>

<style scoped>
.page {
  height: 100dvh; /* lock viewport height */
  overflow: hidden; /* prevent page scroll */
  display: grid;
  grid-template-rows: 90px 1fr; /* fixed header height; controls removed */
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px; /* internal spacing so it doesn't affect layout height */
}
.header .logo {
  height: 70px; /* adjusted per request */
  max-height: 100%;
  width: auto;
  display: block;
}
.header .spacer {
  flex: 1;
}
.header .refresh {
  font-size: 20px;
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
  /* Use container width to avoid overflow with parent padding */
  width: min(100%, 1100px);
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

/* Metadata overlay inside the card */
.meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 14px;
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.7) 100%);
  pointer-events: none; /* do not block swipe */
}
.meta .line { text-shadow: 0 1px 2px rgba(0,0,0,0.6); }
.meta .time { font-weight: 700; }
.meta .location { opacity: 0.95; }

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px 16px; /* internal spacing */
  box-sizing: border-box;
}
.btn {
  padding: 12px 20px;
  border-radius: 999px;
  border: none;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
}
.btn.dislike { background: #fee2e2; color: #991b1b; }
.btn.like { background: #d1fae5; color: #065f46; }
.btn.superlike { background: #dbeafe; color: #1e3a8a; }

.state.loading, .state.error {
  color: #777;
  font-size: 14px;
}
.state.error button { margin-top: 8px; }

/* Options modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  z-index: 50;
}
.modal {
  background: #1f2937; /* gray-800 */
  color: #fff;
  width: min(92vw, 520px);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal h3 {
  margin: 0 0 8px;
}
.modal .id {
  word-break: break-all;
  opacity: 0.9;
}
.modal .actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.btn.danger {
  background: #fee2e2;
  color: #991b1b;
}
.modal .error {
  color: #fca5a5;
  margin-top: 10px;
}

/* Landscape optimizations */
@media (orientation: landscape) {
  /* Keep fixed tracks; just tweak card sizing and control spacing */
  .card {
    /* Use container-relative sizing to avoid horizontal overflow with padding */
    width: min(100%, 95vh);
    max-width: 100%;
    max-height: 100%;
  }
  .controls {
    gap: 24px;
  }
}
</style>
