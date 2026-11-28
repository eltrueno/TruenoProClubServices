import { MqConnection } from "@trueno-proclub-services/mq"
import dotenv from "dotenv"
dotenv.config()

/**
 * Conexión del worker a RabbitMQ (la común de packages/mq): eventos del exchange `events` y RPC
 * con el api. Se reconecta sola y vuelve a montar consumidores y RPC.
 */
export const createMqConnection = () => new MqConnection({ url: process.env.RABBITMQ_URL || "amqp://localhost", name: "worker" })

export { EXCHANGE_NAME } from "@trueno-proclub-services/mq"
