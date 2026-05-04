import "dotenv/config"
import { Router } from "express"
import { auth } from "../lib/auth"
import { db } from "../db"
import { ObjectId } from "mongodb"

const router = Router()

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

    const tokenData = await auth.api.getAccessToken({
      body: {
        providerId: "twitch",
        accountId: account.accountId
      },
      headers: new Headers(req.headers as any)
    })

    if (!tokenData?.accessToken) {
      return res.status(404).json({
        status: "error",
        message: "Twitch access token not found"
      })
    }

    const accessToken = tokenData.accessToken

    const broadcasterId = process.env.TWITCH_CHANNEL_ID

    if (!broadcasterId) {
      return res.status(500).json({
        status: "error",
        message: "TWITCH_CHANNEL_ID not configured"
      })
    }

    const twitchHeaders = {
      "Authorization": `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    }

    // Llamadas en paralelo
    const [followRes, subRes] = await Promise.all([
      fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${user.twitchId}&broadcaster_id=${broadcasterId}`, { headers: twitchHeaders }),
      fetch(`https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${broadcasterId}&user_id=${user.twitchId}`, { headers: twitchHeaders }),
    ])

    if (!followRes.ok) {
      const error = await followRes.json()
      console.error("Twitch follow API error:", error)
      return res.status(followRes.status).json({
        status: "error",
        message: "Error checking Twitch follow status",
        details: error
      })
    }

    const [followData, subData] = await Promise.all([
      followRes.json(),
      subRes.json(),
    ])

    const isFollowing = followData.total > 0
    const isSub = subRes.ok && subData.data?.length > 0
    const subTier = isSub ? subData.data[0].tier : null

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
          role
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
