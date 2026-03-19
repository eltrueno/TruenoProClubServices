import { getOverallLeaderboard, getSeasonLeaderboard } from './leaderboard'

describe('leaderboard test', () => {
	test('getSeasonLeaderboard a valid string query', async () => {
		const result = await getSeasonLeaderboard('common-gen5')
		expect(result).toBeTruthy()
		expect(result?.length).toBeGreaterThanOrEqual(1)
		expect(result).toBeInstanceOf(Array)
	})
	test('getOverallLeaderboard a valid string query', async () => {
		const result = await getOverallLeaderboard('common-gen5')
		expect(result).toBeTruthy()
		expect(result?.length).toBeGreaterThanOrEqual(1)
		expect(result).toBeInstanceOf(Array)
	})
})
