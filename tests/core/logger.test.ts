import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { Logger, LoggerOptions } from "../../src/core/logger"

describe("Logger class unit tests", () => {
    const tmp_folder_path = "./tests/core/logger-test"
    const infix = "logger_test"

    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()

    type LoggerEntry = {
        level: "INFO" | "WARN"
        id: number
        meta: {
            description: string
        }
    }
    const log_opts: LoggerOptions<LoggerEntry> = {
        folder_path: tmp_folder_path,
        infix,
        max_logs_rotate: 10,
        fallback_size: 10,
    }

    const log_entry = {
        level: "INFO" as const,
        created_at: 0,
        message: "log message",
        id: 12,
        meta: {
            description: "foo description",
        },
    }

    const original_createWriteStream = fs.createWriteStream
    const original_date_now = Date.now
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

        Date.now = () => 0
    })

    beforeEach(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    afterAll(() => {
        // return createWriteStream to the original function
        fs.createWriteStream = original_createWriteStream

        Date.now = original_date_now

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
            setTimeout(resolve, 200)
        })

        expect(fs.readdirSync(tmp_folder_path).sort()).toEqual(
            ["rotate", file_name3].sort()
        )
        expect(fs.readdirSync(tmp_folder_path + "/rotate").sort()).toEqual(
            [file_name1 + ".gz", file_name2 + ".gz"].sort()
        )
    })

    test("correct log to file + rotation at max_logs", async () => {
        const custom_opts: LoggerOptions<LoggerEntry> = {
            ...log_opts,
            max_logs_rotate: 1,
        }
        const logger = new Logger<LoggerEntry>(custom_opts)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        const file_name1 = `bilbo-${infix}-${year}-${month}-${day}-1.log`
        const file_path1 = path.join(tmp_folder_path, file_name1)

        logger
            .level(log_entry.level)
            .message(log_entry.message)
            .add("id", log_entry.id)
            .add("meta", log_entry.meta)
            .log()

        const file_data1 = fs.readFileSync(file_path1, "utf8")
        const log_str1 = JSON.stringify(log_entry) + "\n"
        expect(file_data1, file_path1).toEqual(log_str1)

        logger
            .level(log_entry.level)
            .message(log_entry.message)
            .add("id", log_entry.id + 1)
            .add("meta", log_entry.meta)
            .log()
        // wait .rotate_file()
        await new Promise((resolve) => {
            setTimeout(resolve, 200)
        })

        const file_name2 = `bilbo-${infix}-${year}-${month}-${day}-2.log`
        const file_path2 = path.join(tmp_folder_path, file_name2)

        const file_data2 = fs.readFileSync(file_path2, "utf8")
        const log_str2 =
            JSON.stringify({ ...log_entry, id: log_entry.id + 1 }) + "\n"
        expect(file_data2, file_path2).toEqual(log_str2)
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
            setTimeout(resolve, 200)
        })

        const expected_file_name = `bilbo-${infix}-${year}-${month}-${day}-${16}.log`
        const files = fs.readdirSync(tmp_folder_path)
        expect(files.sort()).toEqual([expected_file_name, "rotate"])
    })
})

describe("Logger fallback system", () => {
    const tmp_folder_path = "./tests/core/logger-fallback-test"
    const infix = "logger_fallback_test"

    type LoggerEntry = {
        level: "INFO" | "WARN"
        message: string
        created_at: number
    }
    const log_opts: LoggerOptions<LoggerEntry> = {
        folder_path: tmp_folder_path,
        infix,
        max_logs_rotate: 100,
        fallback_size: 4,
    }

    const tester = {
        buffer: Buffer.from(""),
        file_data: "",
        backpressure: true,
        drain: (_partial: boolean) => {},
        reset() {
            tester.buffer = Buffer.from("")
            tester.file_data = ""
            tester.backpressure = true
        },
    }

    const original_createWriteStream = fs.createWriteStream
    const original_date_now = Date.now

    beforeAll(() => {
        fs.createWriteStream = (file_path: any, options?: any) => {
            const stream = original_createWriteStream(file_path, options)
            stream.write = (chunk: any, _encoding: any, _callback?: any) => {
                tester.buffer = Buffer.concat([
                    tester.buffer,
                    Buffer.from(chunk),
                ])
                return !tester.backpressure
            }

            tester.drain = function (partial: boolean) {
                if (partial) {
                    const middle = Math.floor(tester.buffer.length / 2)
                    const buf_slice = tester.buffer.toString().slice(0, middle)
                    tester.file_data += buf_slice
                    tester.buffer = Buffer.from(
                        tester.buffer.toString().slice(middle)
                    )
                    tester.backpressure = true
                } else {
                    tester.file_data += String(tester.buffer)
                    tester.buffer = Buffer.from("")
                    tester.backpressure = false
                }

                stream.emit("drain")
            }
            return stream
        }

        Date.now = () => 0
    })

    beforeEach(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
        tester.reset()
    })

    afterAll(() => {
        fs.createWriteStream = original_createWriteStream

        Date.now = original_date_now

        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    test("fallback mode + flushing after drain", async () => {
        const logger = new Logger(log_opts)

        const log1: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "foo",
        }
        const log2: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "bar",
        }
        const log3: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "baz",
        }
        const log1_str = JSON.stringify(log1)
        const log2_str = JSON.stringify(log2)
        const log3_str = JSON.stringify(log3)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        tester.backpressure = true
        // write to stream_buffer and start fallback mode
        await logger.level(log1.level).message(log1.message).log()
        expect(tester.buffer).toEqual(Buffer.from(log1_str + "\n"))
        expect(tester.file_data).toEqual("")

        // write to fallback_buffer
        await logger.level(log2.level).message(log2.message).log()
        expect(tester.buffer).toEqual(Buffer.from(log1_str + "\n"))
        expect(tester.file_data).toEqual("")

        // write to fallback_buffer
        await logger.level(log3.level).message(log3.message).log()
        expect(tester.buffer).toEqual(Buffer.from(log1_str + "\n"))
        expect(tester.file_data).toEqual("")

        // drain stream_buffer to file_data
        // write all fallback_buffer into stream_buffer
        tester.drain(false)

        const expected_file_data = log1_str + "\n"
        const expected_buffer_data = Buffer.from(
            log2_str + "\n" + log3_str + "\n"
        )

        expect(tester.file_data).toEqual(expected_file_data)
        expect(tester.buffer.toString()).toEqual(
            expected_buffer_data.toString()
        )
    })

    test("fallback mode + partial flushing", async () => {
        const logger = new Logger(log_opts)

        const log1: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "foo",
        }
        const log2: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "bar",
        }
        const log3: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "baz",
        }
        const log4: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "fizzbuzz",
        }
        const log1_str = JSON.stringify(log1)
        const log2_str = JSON.stringify(log2)
        const log3_str = JSON.stringify(log3)
        const log4_str = JSON.stringify(log4)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        tester.backpressure = true
        // first log writen to stream_buffer and enter fallback mode
        await logger.level(log1.level).message(log1.message).log()

        expect(tester.file_data).toEqual("")
        expect(tester.buffer).toEqual(Buffer.from(log1_str + "\n"))

        // second and third log writen to fallback_buffer
        await logger.level(log2.level).message(log2.message).log()
        await logger.level(log3.level).message(log3.message).log()

        // makes a partial flushing
        // it tries to flush but stops at the first write (log2)
        // fallback_buffer must contain only log3
        // and enter fallback mode again
        tester.drain(true)

        // drain wrote partialy what was on buffer to file_data
        const middle = Math.floor((log1_str + "\n").length / 2)
        let expected_file_data = (log1_str + "\n").slice(0, middle)

        // drain wrote only first element of fallback_buffer to stream_buffer
        let expected_buffer_data = Buffer.from(
            (log1_str + "\n").slice(middle) + log2_str + "\n"
        )
        expect(tester.file_data).toEqual(expected_file_data)
        expect(tester.buffer.toString()).toEqual(
            expected_buffer_data.toString()
        )

        // fourth log writen to fallback_buffer
        await logger.level(log4.level).message(log4.message).log()

        // makes a full flush
        tester.drain(false)

        expected_file_data = log1_str + "\n" + log2_str + "\n"
        expected_buffer_data = Buffer.from(log3_str + "\n" + log4_str + "\n")

        expect(tester.file_data).toEqual(expected_file_data)
        expect(tester.buffer.toString()).toEqual(
            expected_buffer_data.toString()
        )
    })

    test("fallback mode + fallback buffer overwrite", async () => {
        const logger = new Logger({ ...log_opts, fallback_size: 1 })

        const log1: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "foo",
        }
        const log2: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "bar",
        }
        const log3: LoggerEntry = {
            level: "INFO",
            created_at: 0,
            message: "baz",
        }
        const log1_str = JSON.stringify(log1)
        const log3_str = JSON.stringify(log3)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        tester.backpressure = true
        await logger.level(log1.level).message(log1.message).log()
        await logger.level(log2.level).message(log2.message).log()
        await logger.level(log3.level).message(log3.message).log()

        tester.drain(false)

        const expected_file_data = log1_str + "\n"
        const expected_buffer_data = Buffer.from(log3_str + "\n")

        expect(tester.file_data).toEqual(expected_file_data)
        expect(tester.buffer).toEqual(expected_buffer_data)
    })

    test("multiple async log() calls + preserve order", async () => {
        const logger = new Logger(log_opts)

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        const amount = 100
        const promises: Promise<void>[] = []

        for (let i = 0; i < amount; i++) {
            promises.push(logger.level("INFO").message(`Log ${i}`).log())
        }

        await Promise.all(promises)
        tester.drain(false)

        const lines = tester.file_data.trim().split("\n")
        for (const i in lines) {
            expect(lines[i]).toEqual(
                JSON.stringify({
                    level: "INFO",
                    created_at: 0,
                    message: `Log ${i}`,
                })
            )
        }
    })

    test("multiple calls with backpressure from stream_buffer", async () => {
        const logger = new Logger({ ...log_opts, fallback_size: 3 })

        // wait for logger.recover()
        await new Promise((resolve) => {
            setTimeout(resolve, 0)
        })

        const amount = 100
        tester.backpressure = true
        for (let i = 0; i < amount; i++) {
            await logger.level("INFO").message(`Log ${i}`).log()
        }
        tester.drain(false)

        expect(tester.file_data).toEqual(
            JSON.stringify({ level: "INFO", created_at: 0, message: "Log 0" }) +
                "\n"
        )

        const buffer_lines = tester.buffer.toString().trim().split("\n")
        expect(buffer_lines).toEqual([
            JSON.stringify({
                level: "INFO",
                created_at: 0,
                message: `Log ${97}`,
            }),
            JSON.stringify({
                level: "INFO",
                created_at: 0,
                message: `Log ${98}`,
            }),
            JSON.stringify({
                level: "INFO",
                created_at: 0,
                message: `Log ${99}`,
            }),
        ])
    })
})
