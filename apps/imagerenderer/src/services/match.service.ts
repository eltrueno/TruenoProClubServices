import { captureImage } from "./imageCapture"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()

const DEVMODE = process.env.DEVMODE || false;
const BASE_URL = process.env.BASE_URL || (DEVMODE ? "http://localhost:4321" : "https://www.casemurocity.org")

const getMatchImage = async (matchid: number | string) => {
    const filepath = `./imagescache/match_${matchid}.jpeg`
    if (!fs.existsSync(filepath)) {
        console.log("Image not cached. Capturing...")
        const img = await captureImage(`${BASE_URL}/imagegenerator/matchsummary/${matchid}`, "match_" + matchid, "#to_image", 1920, 1080)
        if (img) console.log("Image correctly captured and saved")
        else console.log("Image couldn't get captured")
        console.log("Returning image...")
        return fs.readFileSync(filepath)
    }
    console.log("Returning image...")
    return fs.readFileSync(filepath)
}

export { getMatchImage }