import { defineEventHandler, readBody, createError } from 'h3'
import { $fetch } from 'ofetch'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string }>(event)
  const id = body?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing id in request body' })
  }

  return { success: true }
})
