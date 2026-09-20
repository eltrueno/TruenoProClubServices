export * from './core/api'
export * from './core/club'
export * from './core/leaderboard'
export * from './core/member'
export * from './core/misc'
export * from './core/parse'
export * from './model/club'

import * as api from './core/api'
import * as club from './core/club'
import * as leaderboard from './core/leaderboard'
import * as member from './core/member'
import * as misc from './core/misc'
import * as parse from './core/parse'

export { api, club, leaderboard, member, misc, parse }

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export function l(message?: any, ...optionalParams: any[]) { console.log(message, ...optionalParams) }
