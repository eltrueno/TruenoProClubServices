import type { User, TwitchSyncResult, TwitchUser } from "@trueno-proclub-services/auth"
import { UserRole } from "@trueno-proclub-services/auth"
import { accountModel } from "../models/accountModel"
import { userModel } from "../models/userModel"

const PROTECTED_ROLES: string[] = [UserRole.admin, UserRole.mod, UserRole.vip]


async function fetchTwitchAPI(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    }
  })
}

async function refreshTwitchToken(account: any): Promise<string | null> {
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

  await accountModel.updateTokens(account._id, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000)
  })

  return data.access_token
}

async function fetchTwitchWithRefresh(
  urls: string[],
  account: any
): Promise<{ expired: boolean; responses: Response[] | null }> {
  let responses = await Promise.all(urls.map(url => fetchTwitchAPI(url, account.accessToken)))

  if (responses.some(r => r.status === 401)) {
    const newToken = await refreshTwitchToken(account)
    if (!newToken) return { expired: true, responses: null }
    responses = await Promise.all(urls.map(url => fetchTwitchAPI(url, newToken)))
  }

  return { expired: false, responses }
}

// ── Role resolution 

function resolveRole(isFollowing: boolean, isSub: boolean, currentRole: string): string {
  if (PROTECTED_ROLES.includes(currentRole as UserRole)) return currentRole
  if (isSub) return UserRole.subscriber
  if (isFollowing) return UserRole.follower
  return UserRole.visitor
}

// ── Public service

export type TwitchSyncError =
  | { code: "NO_TWITCH_ACCOUNT" }
  | { code: "MISSING_CHANNEL_ID" }
  | { code: "TOKEN_EXPIRED" }
  | { code: "FOLLOW_CHECK_FAILED"; status: number; details: unknown }

export type TwitchSyncResponse =
  | { ok: true; data: TwitchSyncResult }
  | { ok: false; error: TwitchSyncError }

export const twitchService = {
  async syncTwitchData(user: User): Promise<TwitchSyncResponse> {
    const account = await accountModel.findTwitchAccount(user.id)
    const twitchId = user.twitchId || account?.accountId

    if (!account || !twitchId) {
      return { ok: false, error: { code: "NO_TWITCH_ACCOUNT" } }
    }

    const broadcasterId = process.env.TWITCH_CHANNEL_ID
    if (!broadcasterId) {
      return { ok: false, error: { code: "MISSING_CHANNEL_ID" } }
    }

    const urls = [
      `https://api.twitch.tv/helix/channels/followed?user_id=${user.twitchId}&broadcaster_id=${broadcasterId}`,
      `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${broadcasterId}&user_id=${user.twitchId}`,
      `https://api.twitch.tv/helix/users?id=${user.twitchId}`,
    ]

    const { expired, responses } = await fetchTwitchWithRefresh(urls, account)

    if (expired || !responses) {
      return { ok: false, error: { code: "TOKEN_EXPIRED" } }
    }

    const [followRes, subRes, userRes] = responses

    if (!followRes.ok) {
      return {
        ok: false,
        error: {
          code: "FOLLOW_CHECK_FAILED",
          status: followRes.status,
          details: await followRes.json()
        }
      }
    }

    const [followData, subData, userData] = await Promise.all([
      followRes.json(),
      (subRes.ok || subRes.status === 404) ? await subRes.json() : null,
      userRes.json(),
    ])

    const isFollowing: boolean = followData.total > 0
    const isSub: boolean = !!subData?.data?.length
    const subTier: string | null = isSub ? subData.data[0].tier : null
    const twitchUser: TwitchUser | undefined = userData.data[0]
    const role = resolveRole(isFollowing, isSub, user.role ?? "visitor")

    await userModel.updateFromTwitchSync(user.id, {
      twitchId: twitchId,
      twitchFollowing: isFollowing,
      twitchSub: isSub,
      role,
      name: twitchUser?.display_name ?? user.name,
      image: twitchUser?.profile_image_url ?? user.image,
    })

    return {
      ok: true,
      data: { twitchFollowing: isFollowing, twitchSub: isSub, twitchSubTier: subTier, role }
    }
  }
}
