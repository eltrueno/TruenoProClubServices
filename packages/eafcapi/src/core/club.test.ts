import { getClubIdByName, getClubInfo, getClubMembers, getClubMemberStats, getClubSearch, getClubStats } from './club'
/* jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>
mockedAxios.get.mockRejectedValue('Network error: Something went wrong')
mockedAxios.get.mockResolvedValue({
	data: {
		userId: 1,
		id: 1,
		title:
			'sunt aut facere repellat provident occaecati excepturi optioreprehenderit',
		body:
			'quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto'
	}
}) */

describe('club test', () => {
	describe('club getClubIdByName test', () => {
		// test('getClubIdByName valid string query URL encoded', async () => {
		// 	const result = await getClubIdByName('Blood%20Brotherz')
		// 	expect(result).toBeTruthy()
		// 	expect(result).toBe('20616984')
		// })
		test('getClubIdByName valid string query', async () => {
			const result = await getClubIdByName('common-gen5', 'Caracantosmeaos')
			expect(result).toBeTruthy()
			expect(result).toBe(80388)
		})
		test('getClubSearch valid string query', async () => {
			const result = await getClubSearch('common-gen5', 'Caracantosmeaos')
			expect(result).toBeTruthy()
			expect(result?.[0]?.clubId).toBe('80388')
		})
		// todo WTF ???????
		// test('DarkForce XL', async () => {
		// 	const result = await getClubIdByName('DarkForce XL')
		// 	expect(result).toBeTruthy()
		// 	expect(result).toBe(21148664)
		// })
		// test('x vky x', async () => {
		// 	const result = await getClubIdByName('x vky x')
		// 	expect(result).toBeTruthy()
		// 	expect(result).toBe(21633639)
		// })
		test('an empty string', async () => {
			expect(await getClubIdByName('common-gen5', '')).toBeUndefined()
		})
	})
	describe('club getClubInfo test', () => {
		test('getClubInfo valid string query', async () => {
			const result = await getClubInfo('common-gen5', 80388)
			expect(result).toBeTruthy()
			// 	expect(result).toStrictEqual({ 'clubId': 20616984, 'customKit':
			//  { 'crestAssetId': '99130506', 'crestColor': '13179675', 'customAwayKitId': '7636',
			//   'customKeeperKitId': '5020', 'customKitId': '7616', 'dCustomKit': '1',
			//    'isCustomTeam': '1', 'kitAColor1': '16777215', 'kitAColor2': '9572147',
			//    'kitAColor3': '0', 'kitColor1': '0', 'kitColor2': '9572147',
			//    'kitColor3': '16777215', 'kitId': '344064', 'stadName': 'Hexenkessel' },
			// 	'name': 'Blood Brotherz', 'regionId': 5719381, 'teamId': 21 })
		})
		test('getClubInfo NaN', async () => {
			const result = await getClubInfo('common-gen5', NaN)
			expect(result).toBeFalsy()
		})
		test('getClubInfo an empty string', async () => {
			const result = await getClubInfo('common-gen5', +'')
			expect(result).toBeFalsy()
		})
	})
	describe('club getClubMemberStats test', () => {
		test('getClubMemberStats valid string query', async () => {
			const result = await getClubMemberStats('common-gen5', 80388)
			expect(result).toBeTruthy()
			expect(result?.length).toBeGreaterThanOrEqual(1)
			expect(result).toBeInstanceOf(Array)
		})
		test('getClubMemberStats NaN', async () => {
			const result = await getClubMemberStats('common-gen5', NaN)
			expect(result).toBeFalsy()
		})
		test('getClubMemberStats an empty string', async () => {
			const result = await getClubMemberStats('common-gen5', +'')
			expect(result).toBeFalsy()
		})
	})
	describe('club getClubMembers test', () => {
		test('getClubMembers valid string query', async () => {
			const result = await getClubMembers('common-gen5', 80388)
			expect(result).toBeTruthy()
			expect(result?.length).toBeGreaterThanOrEqual(1)
			expect(result).toBeInstanceOf(Array)
		})
		test('getClubMembers NaN', async () => {
			const result = await getClubMembers('common-gen5', NaN)
			expect(result).toBeUndefined()
		})
		test('getClubMembers an empty string', async () => {
			const result = await getClubMembers('common-gen5', +'')
			expect(result).toBeUndefined()
		})
	})
	describe('club getClubSeasonRank test', () => {
		test('getClubSeasonRank valid string query', async () => {
			const result = await getClubStats('common-gen5', 80388)
			expect(result).toBeTruthy()
		})
		test('getClubSeasonRank NaN', async () => {
			const result = await getClubStats('common-gen5', NaN)
			expect(result).toBeUndefined()
		})
		test('getClubSeasonRank an empty string', async () => {
			const result = await getClubStats('common-gen5', +'')
			expect(result).toBeUndefined()
		})
	})
	// getClubSeasonStats is the same response as getClubSeasonRank
	/* describe('club getClubSeasonStats test', () => {
		test('getClubSeasonStats valid string query', async () => {
			const result = await getClubSeasonStats('ps4', 5648)
			expect(result).toBeTruthy()
			// expect(result).toStrictEqual({ })
		})
		test('getClubSeasonStats NaN', async () => {
			const result = await getClubSeasonStats('ps4', NaN)
			expect(result).toBeUndefined()
		})
		test('getClubSeasonStats an empty string', async () => {
			const result = await getClubSeasonStats('ps4', +'')
			expect(result).toBeUndefined()
		})
	}) */
	/* describe('club getClubStats test', () => {
		test('getClubStats valid string query', async () => {
			const result = await getClubStats('ps4', 5648, 'gameType9')
			expect(result).toBeTruthy()
			// expect(result).toStrictEqual({ })
		})
		test('getClubStats NaN', async () => {
			const result = await getClubStats('ps4', NaN, 'gameType9')
			expect(result).toBeUndefined()
		})
		test('getClubStats an empty string', async () => {
			const result = await getClubStats('ps4', +'', 'gameType9')
			expect(result).toBeUndefined()
		})
	}) */
})
