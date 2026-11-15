import { User, Session } from "@trueno-proclub-services/auth"
import type { ApiTokenInfo } from "../services/apiTokenService.js"

declare global {
  namespace Express {
    interface Request {
      user?: User
      session?: Session
      /** token de API con el que llega la petición (rutas /api/v1) */
      apiToken?: ApiTokenInfo
    }
  }
}
