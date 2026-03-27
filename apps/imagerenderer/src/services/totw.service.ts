import { captureImage } from "./imageCapture"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()

const DEVMODE = process.env.DEVMODE || false;
const BASE_URL = process.env.BASE_URL || (DEVMODE ? "http://localhost:4321" : "https://www.casemurocity.org")

const getTotwByWeekImage = async (week: number | string, type: "best" | "worst") => {
    const filepath = `./imagescache/totw_${week}_${type}.jpeg`
    if (!fs.existsSync(filepath)) {
        console.log("Image not cached. Capturing...")
        const img = await captureImage(`${BASE_URL}/imagegenerator/totw/${week}?type=${type}`, "totw_" + week + "_" + type, "#to_image", 1920, 1080)
        if (img) console.log("Image correctly captured and saved")
        else console.log("Image couldn't get captured")
        console.log("Returning image...")
        return fs.readFileSync(filepath)
    }
    console.log("Returning image...")
    return fs.readFileSync(filepath)
}

const getLatestTotwImage = async (type: "best" | "worst") => {
    const filepath = `./imagescache/totw_latest_${type}.jpeg`
    if (!fs.existsSync(filepath)) {
        console.log("Image not cached. Capturing...")
        const img = await captureImage(`${BASE_URL}/imagegenerator/totw?type=${type}`, "totw_latest_" + type, "#to_image", 1920, 1080)
        if (img) console.log("Image correctly captured and saved")
        else console.log("Image couldn't get captured")
        console.log("Returning image...")
        return fs.readFileSync(filepath)
    }
    console.log("Returning image...")
    return fs.readFileSync(filepath)
}

export { getTotwByWeekImage, getLatestTotwImage }