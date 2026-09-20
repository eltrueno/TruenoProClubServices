import MatchDTO from "../dtos/match.dto.js"
import { insertOne, getLatest } from "../services/match.service.js"

async function insertMatch(rawdata: any) {
    try {
        const response = await insertOne(new MatchDTO(rawdata))
        return response
    } catch (err) {
        console.error(err)
        throw new Error("ERROR_INSERT_MATCH")
    }
}

async function getLatestMatch() {
    try {
        const response = await getLatest()
        return response
    } catch (err) {
        console.error(err)
        throw new Error("ERROR_FINDING_LATEST_MATCHES")
    }
}

export { insertMatch, getLatestMatch }