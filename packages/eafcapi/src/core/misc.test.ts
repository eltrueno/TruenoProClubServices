import { getSettings } from './misc'
describe('misc test', () => {
	test('getSettings a valid string query', async () => {
		const result = await getSettings('common-gen5')
		expect(result).toBeTruthy()
		expect(result?.length).toBeGreaterThanOrEqual(1)
		expect(result).toBeInstanceOf(Array)
	})
})
