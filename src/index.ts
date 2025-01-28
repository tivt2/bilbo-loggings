// debugging purpose
import { LoggerOptions, Logger } from "./core/logger"

type LogFields = {
    level: "INFO" | "WARN"
    message: string
    id: number
    meta: {
        desc: string
    }
}
const opts: LoggerOptions<LogFields> = {
    folder_path: "./tests/log-files",
    file_infix: "foo",
    print_mode: {
        levels: ["WARN"],
        pretty: true,
    },
}

const logger = new Logger<LogFields>(opts)

logger
    .level("INFO")
    .message("info message")
    .add("id", 12)
    .add("meta", { desc: "info meta description" })
    .log()

logger
    .level("WARN")
    .message("warn message")
    .add("id", 12)
    .add("meta", { desc: "warn meta description" })
    .log()
