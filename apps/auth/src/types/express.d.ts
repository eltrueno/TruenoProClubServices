import { User, Session } from "@trueno-proclub-services/auth"

declare global {
  namespace Express {
    interface Request {
      user?: User
      session?: Session
    }
  }
}
