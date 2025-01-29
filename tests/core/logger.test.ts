import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll } from "vitest"
import { Logger, LoggerOptions } from "../../src/core/logger"

function generate_file_path(
    folder_path: string,
    infix: string,
    id: number
): string {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()
    const file_name = `bilbo-${infix}-${year}-${month}-${day}-${id}.log`
    const file_path = path.normalize(path.join(folder_path, file_name))
    return file_path
}

describe("logger basic test", () => {
    const folder_path = path.normalize("./tests/log-files")
    const file_infix = "foo"

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
        // return createWriteStream to the original function
        fs.createWriteStream = original_createWriteStream
    })

    type LoggerEntry = {
        level: "INFO" | "WARN"
        message: string
        id: number
        meta: {
            description: string
        }
    }
    const logOpts: LoggerOptions<LoggerEntry> = {
        folder_path: folder_path,
        infix: file_infix,
        max_logs: 10,
    }

    const log_entry: LoggerEntry = {
        level: "INFO",
        message: "log message",
        id: 12,
        meta: {
            description: "foo description",
        },
    }

    const file_path = generate_file_path(folder_path, file_infix, 1)

    // order of tests matter
    test("logger create folder if not exists and file", () => {
        const file_path = generate_file_path(folder_path, file_infix, 1)

        new Logger<LoggerEntry>({
            folder_path: folder_path,
            infix: file_infix,
            max_logs: 10,
        })

        expect(fs.existsSync(folder_path), "log folder dont exist").toBeTruthy()
        expect(fs.existsSync(file_path), "log file dont exist").toBeTruthy()
    })

    test("correct log to file", () => {
        expect(fs.existsSync(file_path), "log file dont exist").toBeTruthy()

        const logger = new Logger<LoggerEntry>(logOpts)

        logger
            .level(log_entry.level)
            .message(log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        const file_data = String(fs.readFileSync(file_path))
        const log_str = JSON.stringify(log_entry) + "\n"
        expect(file_data, file_path).toEqual(log_str)
    })

    test("correct second log to file", () => {
        expect(fs.existsSync(file_path), "log file dont exist").toBeTruthy()

        const logger = new Logger<LoggerEntry>(logOpts)
        logger
            .level(log_entry.level)
            .message(log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        const file_data = String(fs.readFileSync(file_path))
        const log_str =
            JSON.stringify(log_entry) + "\n" + JSON.stringify(log_entry) + "\n"
        expect(file_data).toEqual(log_str)
    })
})
