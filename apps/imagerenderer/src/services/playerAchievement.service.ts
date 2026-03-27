import { captureImage } from "./imageCapture"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()

const DEVMODE = false;
const BASE_URL = process.env.BASE_URL || (DEVMODE ? "http://localhost:4321" : "https://www.casemurocity.org")

const getAchievementImage = async (playerName: string, type: string, reached: number) => {
    const filepath = `./imagescache/playerachievement_${playerName}_${type}_${reached}.jpeg`
    if (!fs.existsSync(filepath)) {
        console.log("Image not cached. Capturing...")
        const filename = `playerachievement_${playerName}_${type}_${reached}`
        const img = await captureImage(`${BASE_URL}/imagegenerator/playerachievement/${playerName}?type=${type}&reached=${reached}`, filename, "#to_image", 960, 1080)
        if (img) console.log("Image correctly captured and saved")
        else console.log("Image couldn't get captured")
        console.log("Returning image...")
        return fs.readFileSync(filepath)
    }
    console.log("Returning image...")
    return fs.readFileSync(filepath)
}

export { getAchievementImage }