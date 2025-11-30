import { defineEventHandler, getQuery, createError } from 'h3'
import { $fetch } from 'ofetch'

const IMMICH_URL = process.env.IMMICH_URL!
const IMMICH_TOKEN = process.env.IMMICH_TOKEN!

export default defineEventHandler(async (event) => {
    const { id } = getQuery(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: "Missing ?id parameter"
        })
    }

    const url = `${IMMICH_URL}/api/assets/${id}/thumbnail?size=preview`

    console.log('Fetching image from Immich:', url)

    // Fetch image as binary/arrayBuffer
    const image = await $fetch(url, {
        method: "GET",
        responseType: "arrayBuffer",
        headers: {
            "x-api-key": IMMICH_TOKEN
        }
    }).catch(() => {
        throw createError({ statusCode: 404, message: "Image not found" })
    })

    // Return binary result + proper headers
    event.node.res.setHeader("Content-Type", "image/jpeg")
    event.node.res.setHeader("Content-Disposition", `inline; filename="${id}.jpg"`)

    return new Uint8Array(image)
})
