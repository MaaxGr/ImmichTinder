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

  try {
    // Try single-asset delete endpoint first
    await $fetch(`${IMMICH_URL}/api/assets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-api-key': IMMICH_TOKEN },
    })
  } catch (err: any) {
    // Fallback to bulk delete API if single delete not supported
    try {
      await $fetch(`${IMMICH_URL}/api/assets`, {
        method: 'DELETE',
        headers: {
          'x-api-key': IMMICH_TOKEN,
          'content-type': 'application/json',
        },
        body: { ids: [id] },
      })
    } catch (err2: any) {
      console.log(err2)
      throw createError({
        statusCode: err2?.statusCode || 502,
        message: 'Failed to delete asset',
      })
    }
  }

  return { success: true }
})
