import express, { Express } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import errorHandler from "src/middleware/errorHandler";
import database from "src/database/mongo"

const app: Express = express();

const DEVMODE = process.env.DEVMODE || false
const PORT = Number(process.env.PORT || 80)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (DEVMODE) {
    app.use(cors());
} else {
    app.use(cors({
        origin: 'https://www.casemurocity.org'
    }));
}

/* ROUTES */
import membersRouter from './routes/members';
import clubRouter from './routes/club';
import achievementRouter from './routes/achievement'
import totwRouter from './routes/totw'

app.use("/club", clubRouter);
app.use("/members", membersRouter);
app.use("/achievements", achievementRouter)
app.use("/totw", totwRouter)

import matchesRouter from 'src/routes/matches'
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
                    { "/{playerName}": "Get member profile by name (includes member info, stats, achievements and totw appearances)" }
                ]
            },
            {
                "/matches": [
                    { "/": "List of all matches" },
                    { "/{id}": "Get match by ID" },
                    { "/ordered?limit": "Ordered list of all matches (newer before)" },
                    { "/ordered/{type}?limit": "Ordered list of specific type of matches (newer before)" },
                    { "/player/{playerName}?limit": "Ordered list of matches by playerName (newer before)" }
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
            }
        ]
    });
});

app.set('trust proxy', true);
app.listen(PORT, '0.0.0.0');
console.log("Listening on port " + PORT);