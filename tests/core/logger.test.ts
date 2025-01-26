import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll } from "vitest"
import { Logger } from "../../src/core/logger"

function get_log_path(folder_path: string, infix: string): string {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()
    const file_name = `bilbo-${infix}-${year}-${month}-${day}.log`
    const file_path = path.normalize(path.join(folder_path, file_name))
    return file_path
}

describe("logger basic test", () => {
    const log_path = path.normalize("./tests/log-files")
    beforeAll(() => {
        if (fs.existsSync(log_path)) {
            fs.rmdirSync(log_path, { recursive: true })
        }
    })

    test("logger create folder if not exists and file", () => {
        const infix = "foo"
        const file_path = get_log_path(log_path, infix)

        new Logger<{}>(log_path, infix)

        expect(fs.existsSync(log_path), "log folder dont exist")
        expect(fs.existsSync(file_path), "log file dont exist")
    })

    test("correct log to file", () => {
        type LogEntry = {
            message: string
            id: number
            meta: {
                description: string
            }
        }
        const infix = "infix"
        const file_path = get_log_path(log_path, infix)

        const logger = new Logger<LogEntry>(log_path, infix)
        const log_entry = {
            level: "INFO",
            message: "log message",
            id: 12,
            meta: {
                description: "foo description",
            },
        }

        logger
            .info()
            .field("message", log_entry.message)
            .field("id", log_entry.id)
            .field("meta", log_entry.meta)
            .log()

        let file_data = String(fs.readFileSync(file_path))
        let log_str = JSON.stringify(log_entry)
        expect(file_data === log_str, file_data)

        logger
            .info()
            .field("message", log_entry.message)
            .field("id", log_entry.id)
            .field("meta", log_entry.meta)
            .log()

        file_data = String(fs.readFileSync(file_path))
        log_str += JSON.stringify(log_entry)
        expect(file_data === log_str, file_data)
    })
})
