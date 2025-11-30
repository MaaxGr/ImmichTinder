import { defineEventHandler, readBody, createError } from 'h3'
import { $fetch } from 'ofetch'

const IMMICH_URL = process.env.IMMICH_URL!
const IMMICH_TOKEN = process.env.IMMICH_TOKEN!

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string }>(event)
  const id = body?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing id in request body' })
  }

  /*
  try {
    await $fetch(`${IMMICH_URL}/api/assets/${encodeURIComponent(id)}/favorite`, {
      method: 'POST',
      headers: {
        'x-api-key': IMMICH_TOKEN,
        'content-type': 'application/json',
      },
      body: {
        isFavorite: true,
      },
    })
  } catch (err: any) {
    // Normalize error
    throw createError({
      statusCode: err?.statusCode || 502,
      message: 'Failed to like image',
    })
  }

   */

  return { success: true }
})
