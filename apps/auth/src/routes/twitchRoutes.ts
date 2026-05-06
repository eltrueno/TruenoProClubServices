import "dotenv/config"
import { Router } from "express"
import { auth } from "../lib/auth"
import { db } from "../db"
import { ObjectId } from "mongodb"

const router = Router()

async function fetchTwitchAPI(url: string, accessToken: string) {
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    }
  })
}

async function refreshTwitchToken(account: any) {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
    })
  })

  if (!response.ok) return null

  const data = await response.json()

  await db.collection("account").updateOne(
    { _id: account._id },
    {
      $set: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    }
  )

  return data.access_token
}

async function fetchTwitchWithRefresh(urls: string[], account: any) {

  let responses = await Promise.all(urls.map(url => fetchTwitchAPI(url, account.accessToken)))

  if (responses.some(r => r.status === 401)) {
    const newToken = await refreshTwitchToken(account)
    if (!newToken) return { expired: true, responses: null }
    responses = await Promise.all(urls.map(url => fetchTwitchAPI(url, newToken)))
  }

  return { expired: false, responses }
}

/**
 * Verifica si el usuario autenticado sigue al canal configurado en Twitch
 */
router.get("/sync", async (req, res) => {
  try {
    const user = req.user

    if (!user || !user.twitchId) {
      return res.status(400).json({
        status: "error",
        message: "User not logged in or Twitch not linked"
      })
    }

    const account = await db.collection("account").findOne({
      userId: new ObjectId(user.id),
      providerId: "twitch"
    })

    if (!account) {
      return res.status(404).json({
        status: "error",
        message: "Twitch account not found"
      })
    }

    const broadcasterId = process.env.TWITCH_CHANNEL_ID

    if (!broadcasterId) {
      return res.status(500).json({
        status: "error",
        message: "TWITCH_CHANNEL_ID not configured"
      })
    }

    const urls = [
      `https://api.twitch.tv/helix/channels/followed?user_id=${user.twitchId}&broadcaster_id=${broadcasterId}`,
      `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${broadcasterId}&user_id=${user.twitchId}`,
      `https://api.twitch.tv/helix/users?id=${user.twitchId}`,
    ]

    const { expired, responses } = await fetchTwitchWithRefresh(urls, account)

    if (expired) {
      return res.status(401).json({
        status: "error",
        message: "Twitch token expired",
        code: "TWITCH_TOKEN_EXPIRED"
      })
    }

    const [followRes, subRes, userRes] = responses!

    if (!followRes.ok) {
      const error = await followRes.json()
      return res.status(followRes.status).json({
        status: "error",
        message: "Error checking Twitch follow status",
        details: error
      })
    }

    const [followData, subData, userData] = await Promise.all([
      followRes.json(),
      subRes.json(),
      userRes.json(),
    ])


    const isFollowing = followData.total > 0
    const isSub = subRes.ok && subData.data?.length > 0
    const subTier = isSub ? subData.data[0].tier : null
    const twitchUser = userData.data[0]

    let role = "visitor"
    if (isFollowing) role = "follower"
    if (isSub) role = "subscriber"
    if (user.role == "admin" || user.role == "mod" || user.role == "vip") role = user.role

    await db.collection("user").updateOne(
      { _id: new ObjectId(user.id) },
      {
        $set: {
          twitchFollowing: isFollowing,
          twitchSub: isSub,
          role,
          name: twitchUser?.display_name ?? user.name,
          image: twitchUser?.profile_image_url ?? user.image,
        }
      }
    )

    res.json({
      status: "success",
      twitchFollowing: isFollowing,
      twitchSub: isSub,
      twitchSubTier: subTier,
      role: role
    })
  } catch (error) {
    console.error("Error in sync route:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    })
  }
})

export default router
