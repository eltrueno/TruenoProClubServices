import database from "./config/mongodb.config.js"
import { startWorker as startNewMatchesFinderWorker } from "./utils/NewMatchesFinder.js"
import { setupRabbitmqProducers } from "./events/index.js"
import { scheduleTOTWJob } from "./jobs/totw.job.js"

import dotenv from "dotenv"
dotenv.config()

database().then(() => {
    console.log("Connection to database: OK")
    setupRabbitmqProducers().then(() => {
        console.log("Connection to rabbitmq: OK")
        startNewMatchesFinderWorker()
        scheduleTOTWJob()
    }).catch((er) => console.log("An error ocurred while trying to connect to rabbitmq:  " + er))

})
    .catch((e) => console.log("An error ocurred while trying to connect to database:  " + e))
