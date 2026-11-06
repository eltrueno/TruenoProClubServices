import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto"

/**
 * Cifrado de los tokens OAuth guardados en `account` (accessToken / refreshToken).
 *
 * Better Auth los cifra al guardarlos en cada login (`account.encryptOAuthTokens`), con
 * su clave (BETTER_AUTH_SECRET). Este servicio lee y renueva el token de Twitch por su
 * cuenta, así que usa exactamente las mismas funciones y la misma clave.
 *
 * Migración gradual: los tokens guardados antes de activar el cifrado siguen en claro y
 * se leen tal cual; se cifran en el siguiente login o en la siguiente renovación.
 *
 * Ojo: si cambia BETTER_AUTH_SECRET los tokens cifrados dejan de poder leerse. No se
 * rompe nada (la cuenta se marca para "Reconectar Twitch"), pero conviene saberlo.
 */

// Lo mismo que usa Better Auth (oauth2/utils) para distinguir un token cifrado de uno en claro
function isLikelyEncrypted(token: string): boolean {
  if (token.startsWith("$ba$")) return true
  return token.length % 2 === 0 && /^[0-9a-f]+$/i.test(token)
}

let key: unknown = null

/** Se llama al arrancar, con la instancia de Better Auth (de ahí sale la clave). */
export async function initTokenCrypto(auth: { $context: Promise<{ secretConfig: unknown }> }): Promise<void> {
  key = (await auth.$context).secretConfig
}

function requireKey(): any {
  if (!key) throw new Error("tokenCrypto: initTokenCrypto() no se ha llamado")
  return key
}

/** Token tal y como hay que mandarlo a Twitch (descifrado si estaba cifrado). */
export async function readToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  if (!isLikelyEncrypted(token)) return token
  return symmetricDecrypt({ key: requireKey(), data: token })
}

/** Token tal y como hay que guardarlo en `account`. */
export async function writeToken(token: string): Promise<string> {
  return symmetricEncrypt({ key: requireKey(), data: token })
}
