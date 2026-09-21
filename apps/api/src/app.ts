import express, { Express } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import errorHandler from "./middleware/errorHandler.js";
import database from "./database/mongo.js"

const app: Express = express();

const DEVMODE = process.env.DEVMODE === "true"
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? ["https://www.casemurocity.org"]
const PORT = Number(process.env.PORT || 80)

// Límite por defecto (100kb) en todo menos la subida de fotos del admin, que lleva su propio parser de 8mb
const jsonParser = bodyParser.json()
const isImageUpload = (path: string) => /^\/admin\/members\/[^/]+\/image$/.test(path)
app.use((req, res, next) => (isImageUpload(req.path) ? next() : jsonParser(req, res, next)))
app.use(bodyParser.urlencoded({ extended: true }));

if (DEVMODE) console.warn("### DEVMODE ACTIVATED ###")

// credentials: la cookie de sesión de auth.casemurocity.org viaja en las rutas protegidas (/admin, /members/me)
app.use(cors({
    origin: DEVMODE ? true : ALLOWED_ORIGINS,
    credentials: true
}))

/* ROUTES */
import membersRouter from "./routes/members.js"
import * as ImageStorage from "./services/imageStorage.service.js"
import clubRouter from "./routes/club.js"
import achievementRouter from "./routes/achievement.js"
import totwRouter from "./routes/totw.js"
import playerAveragesRouter from "./routes/playeraverages.js"
import adminRouter from "./routes/admin.js"

app.use("/club", clubRouter);
app.use("/members", membersRouter);
app.use("/achievements", achievementRouter)
app.use("/totw", totwRouter)
app.use("/playeraverages", playerAveragesRouter)
app.use("/admin", adminRouter)

import matchesRouter from "./routes/matches.js"
app.use("/matches", matchesRouter)

/* Error middlewere after all routers */
app.use(errorHandler)

database().then(() => {
    console.log("Connection to database: OK")
})
    .catch((e) => console.log("An error ocurred while trying to connect to database:  " + e))

/*INDEX*/
app.get("/", async function (req, res) {
    res.send({
        "routes": [
            {
                "/club": [
                    { "/": "Club info and stats" }
                ]

            },
            {
                "/members": [
                    { "/": "List of club members" },
                    { "/stats": "List of all players stats" },
                    { "/stats/{type}": "List of specific type of players stats" },
                    { "/{playerId}": "Get member profile by EA player id (includes member info, stats, achievements and totw appearances)" }
                ]
            },
            {
                "/matches": [
                    { "/": "List of all matches" },
                    { "/{id}": "Get match by ID" },
                    { "/ordered?limit": "Ordered list of all matches (newer before)" },
                    { "/ordered/{type}?limit": "Ordered list of specific type of matches (newer before)" },
                    { "/player/{playerId}?limit": "Ordered list of matches by EA player id (newer before)" }
                ]
            },
            {
                "/achievements": [
                    { "/": "List of all achievements definitions" },
                ]
            },
            {
                "/totw": [
                    { "/": "List of all Team of the Weeks" },
                    { "/schedule": "Get Team of the Week UTC time for next calculation" },
                    { "/latest": "Get latest Team of the Week" },
                    { "/{weekNumber | ISOweek}": "Get Team of the Week by week number or ISO week" },
                    { "/appearances": "List of all Team of the Weeks member appearances" },
                    { "/appearances/{ISOweek}": "Get Team of the Weeks member appearances by ISO week" }
                ]
            },
            {
                "/playeraverages": [
                    { "/": "List of all player averages" },
                    { "/{position}": "Get player averages by position" }
                ]
            }
        ]
    });
});

app.set('trust proxy', true);
app.listen(PORT, '0.0.0.0');
console.log("Listening on port " + PORT);
ImageStorage.checkConnection()