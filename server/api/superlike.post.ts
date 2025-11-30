import { defineEventHandler, readBody, createError } from 'h3'
import { $fetch } from 'ofetch'

const IMMICH_URL = process.env.IMMICH_URL!
const IMMICH_TOKEN = process.env.IMMICH_TOKEN!
const IMMICH_SUPERLIKE_ALBUM_ID = process.env.IMMICH_SUPERLIKE_ALBUM_ID

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string }>(event)
  const id = body?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing id in request body' })
  }
  if (!IMMICH_SUPERLIKE_ALBUM_ID) {
    throw createError({ statusCode: 500, message: 'Server misconfigured: IMMICH_SUPERLIKE_ALBUM_ID is missing' })
  }

  try {
    await $fetch(`${IMMICH_URL}/api/albums/${encodeURIComponent(IMMICH_SUPERLIKE_ALBUM_ID)}/assets`, {
      method: 'PUT',
      headers: {
        'x-api-key': IMMICH_TOKEN,
        'content-type': 'application/json',
      },
      body: {
        ids: [id],
      },
    })
  } catch (err: any) {
    console.log(err)
    // Normalize error
    throw createError({
      statusCode: err?.statusCode || 502,
      message: 'Failed to add asset to superlike album',
    })
  }

  return { success: true }
})
