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
    logs_until_rotation: 10,
    print_mode: {
        levels: ["WARN"],
        pretty: true,
    },
}

const logger = new Logger<LogFields>(opts)

for (let i = 0; i < 23; i++) {
    logger
        .level("INFO")
        .message("info message")
        .add("id", i)
        .add("meta", { desc: "info meta description" })
        .log()
}
