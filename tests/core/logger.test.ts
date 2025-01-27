import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll } from "vitest"
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
    const folder_path = path.normalize("./tests/log-files")
    const infix = "foo"

    const original_createWriteStream = fs.createWriteStream
    beforeAll(() => {
        if (fs.existsSync(folder_path)) {
            fs.rmSync(folder_path, { recursive: true })
        }

        // since im not testing the file system and 'fs' module
        // modifying createWriteStream used by the logger
        // so when calling .write method it will
        // write in a sync maner instead of async
        fs.createWriteStream = (file_path: any, options?: any) => {
            const stream = original_createWriteStream(file_path, options)
            stream.write = (chunk: any, _callback?: any) => {
                fs.appendFileSync(file_path, chunk)
                return true
            }
            return stream
        }
    })

    afterAll(() => {
        fs.createWriteStream = original_createWriteStream
    })

    test("logger create folder if not exists and file", () => {
        const file_path = get_log_path(folder_path, infix)

        new Logger(folder_path, infix)

        expect(fs.existsSync(folder_path), "log folder dont exist").toBeTruthy()
        expect(fs.existsSync(file_path), "log file dont exist").toBeTruthy()
    })

    test("correct log to file", async () => {
        type LogEntry = {
            level: "INFO"
            message: string
            id: number
            meta: {
                description: string
            }
        }

        const logger = new Logger<LogEntry>(folder_path, infix)
        const log_entry = {
            level: "INFO",
            message: "log message",
            id: 12,
            meta: {
                description: "foo description",
            },
        }

        logger
            .level("INFO")
            .add("message", log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        const file_path = get_log_path(folder_path, infix)
        expect(fs.existsSync(file_path), "log file dont exist").toBeTruthy()

        let file_data = String(fs.readFileSync(file_path))
        let log_str = JSON.stringify(log_entry) + "\n"
        expect(file_data, file_path).toEqual(log_str)

        logger
            .level("INFO")
            .add("message", log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        file_data = String(fs.readFileSync(file_path))
        log_str += JSON.stringify(log_entry) + "\n"
        expect(file_data).toEqual(log_str)
    })
})
