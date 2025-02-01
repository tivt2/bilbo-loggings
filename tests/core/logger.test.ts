import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { Logger, LoggerOptions } from "../../src/core/logger"

describe("logger basic test", () => {
    const tmp_folder_path = "./tests/core/logger-test"
    const infix = "logger_test"

    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()

    type LoggerEntry = {
        level: "INFO" | "WARN"
        message: string
        id: number
        meta: {
            description: string
        }
    }
    const log_opts: LoggerOptions<LoggerEntry> = {
        folder_path: tmp_folder_path,
        infix,
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

    const original_createWriteStream = fs.createWriteStream
    beforeAll(() => {
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

    beforeEach(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    afterAll(() => {
        // return createWriteStream to the original function
        fs.createWriteStream = original_createWriteStream

        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    test("instance creation + folders and log file creation", async () => {
        new Logger(log_opts)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        expect(fs.existsSync(tmp_folder_path)).toBe(true)
        expect(fs.existsSync(tmp_folder_path + "/rotate")).toBe(true)

        const expected_file_name = `bilbo-${infix}-${year}-${month}-${day}-1.log`
        const expected_file_path = path.join(
            tmp_folder_path,
            expected_file_name
        )
        expect(fs.existsSync(expected_file_path)).toBe(true)
    })

    test("instance creation + folder recover", async () => {
        fs.mkdirSync(tmp_folder_path, { recursive: true })

        // old log file
        const file_name1 = `bilbo-${infix}-${year - 1}-${month}-${day}-1.log`
        const file_path1 = path.join(tmp_folder_path, file_name1)
        fs.appendFileSync(file_path1, "")
        // old log file
        const file_name2 = `bilbo-${infix}-${year}-${month - 1}-${day}-1.log`
        const file_path2 = path.join(tmp_folder_path, file_name2)
        fs.appendFileSync(file_path2, "")

        // newest log file
        const file_name3 = `bilbo-${infix}-${year}-${month}-${day}-1.log`
        const file_path3 = path.join(tmp_folder_path, file_name3)
        fs.appendFileSync(file_path3, "")

        new Logger(log_opts)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 500)
        })

        expect(fs.readdirSync(tmp_folder_path).sort()).toEqual(
            ["rotate", file_name3].sort()
        )
        expect(fs.readdirSync(tmp_folder_path + "/rotate").sort()).toEqual(
            [file_name1 + ".gz", file_name2 + ".gz"].sort()
        )
    })

    test("correct log to file", async () => {
        const logger = new Logger<LoggerEntry>(log_opts)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        const file_name = `bilbo-${infix}-${year}-${month}-${day}-1.log`
        const file_path = path.join(tmp_folder_path, file_name)

        logger
            .level(log_entry.level)
            .message(log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        let file_data = fs.readFileSync(file_path, "utf8")
        let log_str = JSON.stringify(log_entry) + "\n"
        expect(file_data, file_path).toEqual(log_str)

        logger
            .level(log_entry.level)
            .message(log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        file_data = fs.readFileSync(file_path, "utf8")
        log_str += JSON.stringify(log_entry) + "\n"
        expect(file_data, file_path).toEqual(log_str)
    })

    test("biggest_file_id() after recover", async () => {
        function make_file(
            folder_path: string,
            year: number,
            month: number,
            day: number,
            id: number,
            ext: string
        ) {
            if (!fs.existsSync(folder_path)) {
                fs.mkdirSync(folder_path)
            }
            const file_name = `bilbo-${infix}-${year}-${month}-${day}-${id}${ext}`
            const file_path = path.join(folder_path, file_name)
            fs.appendFileSync(file_path, "")
        }
        make_file(tmp_folder_path, year, month, day, 10, ".log")
        make_file(tmp_folder_path, year - 1, month, day, 1, ".log")
        make_file(tmp_folder_path, year, month - 1, day, 1, ".log")
        make_file(tmp_folder_path, year, month, day - 1, 1, ".log")

        const tmp_rotate_path = path.join(tmp_folder_path, "rotate")
        make_file(tmp_rotate_path, year, month, day, 15, ".log.gz")
        make_file(tmp_rotate_path, year - 1, month, day, 1, ".log.gz")
        make_file(tmp_rotate_path, year, month - 1, day, 1, ".log.gz")
        make_file(tmp_rotate_path, year, month, day - 1, 1, ".log.gz")

        new Logger<LoggerEntry>(log_opts)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 500)
        })

        const expected_file_name = `bilbo-${infix}-${year}-${month}-${day}-${16}.log`
        const files = fs.readdirSync(tmp_folder_path)
        expect(files.sort()).toEqual([expected_file_name, "rotate"])
    })
})
