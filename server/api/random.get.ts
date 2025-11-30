const IMMICH_URL = process.env.IMMICH_URL
const IMMICH_TOKEN = process.env.IMMICH_TOKEN

export default defineEventHandler(async () => {
    const asset = await $fetch(`${IMMICH_URL}/api/search/random`, {
        method: "POST",
        headers: {
            "x-api-key": IMMICH_TOKEN
        },
        body: {
            size: 1
        }
    })

    console.log(asset)

    return {
        id: asset[0].id,
        localDateTime: asset[0].localDateTime
    }
})