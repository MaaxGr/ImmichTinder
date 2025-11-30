import { assert } from "@vue/compiler-core"

const IMMICH_URL = process.env.IMMICH_URL
const IMMICH_TOKEN = process.env.IMMICH_TOKEN

export default defineEventHandler(async () => {
    const asset = await $fetch(`${IMMICH_URL}/api/search/random`, {
        method: "POST",
        headers: {
            "x-api-key": IMMICH_TOKEN
        },
        body: {
            size: 1,
            type: 'IMAGE'
        }
    })

    const a = Array.isArray(asset) ? asset[0] : asset
    const id = a?.id

    const asset2 = await $fetch(`${IMMICH_URL}/api/assets/${id}`, {
        method: "GET",
        headers: {
            "x-api-key": IMMICH_TOKEN
        }
    });

    console.log('Load asset details:')
    console.log(asset2)



    const exif = asset2.exifInfo || {}

    const takenAt = exif.dateTimeOriginal || a?.localDateTime || null

    // Compose a human-friendly location string if available
    const parts = [exif.city, exif.state, exif.country].filter(Boolean)
    const locationText = parts.length ? parts.join(", ") : null

    return {
        id: a?.id,
        localDateTime: a?.localDateTime || null,
        takenAt,
        location: {
            text: locationText,
            city: exif.city || null,
            state: exif.state || null,
            country: exif.country || null,
            latitude: exif.latitude ?? null,
            longitude: exif.longitude ?? null,
        }
    }
})