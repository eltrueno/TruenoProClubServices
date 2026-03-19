import { getClubIdByName } from './club'
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

describe('first test', () => {
	test('an empty string', async () => {
		const result = await getClubIdByName('common-gen5', '')
		expect(result).toBeUndefined()
	})
})
