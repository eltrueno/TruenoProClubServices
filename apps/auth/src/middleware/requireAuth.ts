import { Request, Response, NextFunction } from "express"
import type { AuthType } from "@trueno-proclub-services/auth"

export const createRequireAuth = (auth: AuthType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as any)
      })

      if (!session) {
        return res.status(401).json({
          status: "unauthorized",
          message: "You must be logged in to perform this action"
        })
      }

      req.user = session.user
      req.session = session

      next()
    } catch (error) {
      console.error("Auth Middleware error:", error)
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      })
    }
  }
}
