import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll } from "vitest"
import { LogFile } from "../../src/core/log-file"

describe("LogFile class unit tests", () => {
    const test_tmp_folder = "./tests/core/log-file-tmp/"

    beforeAll(() => {
        if (fs.existsSync(test_tmp_folder)) {
            fs.rmSync(test_tmp_folder, { recursive: true })
        }
        fs.mkdirSync(test_tmp_folder, { recursive: true })
    })

    afterAll(() => {
        if (fs.existsSync(test_tmp_folder)) {
            fs.rmSync(test_tmp_folder, { recursive: true })
        }
    })

    test("instance creation + disk file creation", async () => {
        const file_path = path.join(test_tmp_folder, "log-file.log")
        const log_file = new LogFile(file_path)

        expect(log_file.file_path).toEqual(file_path)
        expect(log_file.line_count).toEqual(0)
        expect(log_file.stream).toBeInstanceOf(fs.WriteStream)
        expect(fs.existsSync(file_path)).toBe(true)

        log_file.stream.end()
        await new Promise((resolve) => {
            log_file.stream.on("finish", () => {
                log_file.stream.close(() => {
                    resolve({})
                })
            })
        })
    })

    test("correctly writing to file", async () => {
        const file_path = path.join(test_tmp_folder, "log-file2.log")
        const log_file = new LogFile(file_path)

        const did_write = log_file.write_ln("foo")

        expect(did_write).toBe(true)
        expect(log_file.line_count).toEqual(1)

        log_file.stream.end()
        await new Promise((resolve) => {
            log_file.stream.on("finish", () => {
                log_file.stream.close(() => {
                    resolve({})
                })
            })
        })

        expect(fs.readFileSync(file_path, "utf8")).toEqual("foo\n")
    })

    test("correctly closing the file", async () => {
        const file_path = path.join(test_tmp_folder, "log-file3.log")
        const log_file = new LogFile(file_path)

        expect(fs.existsSync(file_path)).toBe(true)
        expect(log_file.stream.closed).toBe(false)

        const ret_file_path = await log_file.finish()
        expect(ret_file_path).toEqual(file_path)

        expect(log_file.stream.closed).toEqual(true)
    })

    test("correctly open a file with content and writing again", async () => {
        // same file as test that writes one time
        const file_path = path.join(test_tmp_folder, "log-file2.log")
        const log_file = new LogFile(file_path)

        expect(log_file.line_count).toEqual(1)

        const did_write = log_file.write_ln("foo")

        expect(did_write).toBe(true)
        expect(log_file.line_count).toEqual(2)

        // already tested
        await log_file.finish()

        expect(fs.readFileSync(file_path, "utf8")).toEqual("foo\nfoo\n")
    })
})
