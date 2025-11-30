<template>
  <div class="page">
    <div class="header">
      <img class="logo" src="/logo.png" alt="ImmichSwipe" draggable="false" />
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
        <div class="meta" v-if="formattedTakenAt || locationWithFlag">
          <div class="line time" v-if="formattedTakenAt">{{ formattedTakenAt }}</div>
          <div class="line location" v-if="locationWithFlag">{{ locationWithFlag }}</div>
        </div>
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

async function nextRandom() {
  loading.value = true
  error.value = null
  // Reset aspect while fetching next image so the card doesn't keep previous ratio
  natural.value = null
  takenAt.value = null
  location.value = null
  try {
    const res = await $fetch<{
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
    currentId.value = res.id
    takenAt.value = res.takenAt || res.localDateTime || null
    location.value = res.location || null
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
  grid-template-rows: 90px 1fr 72px; /* fixed header/footer heights */
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
  width: min(98vw, 1100px);
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

.state.loading, .state.error {
  color: #777;
  font-size: 14px;
}
.state.error button { margin-top: 8px; }

/* Landscape optimizations */
@media (orientation: landscape) {
  /* Keep fixed tracks; just tweak card sizing and control spacing */
  .card {
    width: min(90vw, 95vh);
    max-width: 100%;
    max-height: 100%;
  }
  .controls {
    gap: 24px;
  }
}
</style>
