import database from "./config/mongodb.config.js"
import { startWorker as startNewMatchesFinderWorker } from "./utils/NewMatchesFinder.js"
import { setupRabbitmqConsumers, setupRabbitmqProducers } from "./events/index.js"
import { scheduleTOTWJob } from "./jobs/totw.job.js"

import dotenv from "dotenv"
dotenv.config()

database().then(() => {
    console.log("Connection to database: OK")
    setupRabbitmqProducers().then(() => {
        console.log("Connection to rabbitmq: OK")
        startNewMatchesFinderWorker()
        // Avisos del api (recalcular stats cuando un admin marca un partido como nulo)
        setupRabbitmqConsumers(Number(process.env.CLUBID) || 290776)
            .catch((er) => console.log("An error ocurred while setting up rabbitmq consumers: " + er))
        scheduleTOTWJob()
    }).catch((er) => console.log("An error ocurred while trying to connect to rabbitmq:  " + er))

})
    .catch((e) => console.log("An error ocurred while trying to connect to database:  " + e))
