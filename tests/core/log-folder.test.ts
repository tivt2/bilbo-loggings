import fs from "fs"
import path from "path"
import { describe, test, expect, afterAll, beforeEach } from "vitest"
import { LogFolder } from "../../src/core/log-folder"
import { RotateFolder } from "../../src/core/rotate-folder"
import { create_file_regex } from "../../src/core/util"
import { dummy_logger_file_name } from "./util"

describe("LogFolder class unit tests", () => {
    const tmp_folder_path = "./tests/core/log-folder"
    const infix = "folder_test"
    const file_regex = create_file_regex(infix)

    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()

    beforeEach(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    afterAll(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    test("instance creation + correctly create folder on fs", () => {
        expect(fs.existsSync(tmp_folder_path)).toBe(false)

        const rotate_path = path.join(tmp_folder_path, "rotate")
        const rotate = new RotateFolder(
            rotate_path,
            new RegExp(file_regex.source + ".gz")
        )
        const folder = new LogFolder(tmp_folder_path, infix, file_regex, rotate)
        folder.init_folder()

        expect(fs.existsSync(tmp_folder_path)).toBe(true)
    })

    test("create_file() correctly create a file", () => {
        const rotate_path = path.join(tmp_folder_path, "rotate")
        const rotate = new RotateFolder(
            rotate_path,
            new RegExp(file_regex.source + ".gz")
        )
        const folder = new LogFolder(tmp_folder_path, infix, file_regex, rotate)
        folder.init_folder()
        rotate.init_folder()

        const expected_path = path.join(
            tmp_folder_path,
            dummy_logger_file_name(infix, 2)
        )
        expect(fs.existsSync(expected_path)).toBe(false)

        const file_path = folder.create_file(2)

        expect(file_path).toEqual(expected_path)
        expect(fs.existsSync(file_path)).toBe(true)
    })

    test("get_log_files() correct log files sorted ignore future files", () => {
        const rotate_path = path.join(tmp_folder_path, "rotate")
        const rotate = new RotateFolder(
            rotate_path,
            new RegExp(file_regex.source + ".gz")
        )
        const folder = new LogFolder(tmp_folder_path, infix, file_regex, rotate)
        folder.init_folder()
        rotate.init_folder()

        const file_path1 = folder.create_file(1)
        const file_name1 = path.basename(file_path1)
        let files = folder.get_log_files()
        expect(files.length).toEqual(1)
        expect(files).toEqual([file_name1])

        const file_path2 = folder.create_file(2)
        const file_name2 = path.basename(file_path2)

        const file_name3 = `bilbo-${infix}-${year - 1}-${month}-${day}-1.log`
        const file_path3 = path.join(tmp_folder_path, file_name3)
        fs.appendFileSync(file_path3, "")
        const file_name4 = `bilbo-${infix}-${year}-${month - 1}-${day}-1.log`
        const file_path4 = path.join(tmp_folder_path, file_name4)
        fs.appendFileSync(file_path4, "")
        const file_name5 = `bilbo-${infix}-${year}-${month}-${day - 1}-1.log`
        const file_path5 = path.join(tmp_folder_path, file_name5)
        fs.appendFileSync(file_path5, "")

        const file_name6 = `bilbo-${infix}-${year + 1}-${month}-${day}-1.log`
        const file_path6 = path.join(tmp_folder_path, file_name6)
        fs.appendFileSync(file_path6, "")

        files = folder.get_log_files()
        expect(files.length).toEqual(5)
        expect(files).toEqual([
            file_name2,
            file_name1,
            file_name5,
            file_name4,
            file_name3,
        ])
    })

    test("is_today_file() correctly working", () => {
        const rotate_path = path.join(tmp_folder_path, "rotate")
        const rotate = new RotateFolder(
            rotate_path,
            new RegExp(file_regex.source + ".gz")
        )
        const folder = new LogFolder(tmp_folder_path, infix, file_regex, rotate)
        folder.init_folder()
        rotate.init_folder()

        let file_name = `bilbo-${infix}-${year}-${month}-${day}-1.log`
        let is_today = folder.is_today_file(file_name)
        expect(is_today).toBe(true)

        file_name = `bilbo-${infix}-${year - 1}-${month}-${day}-1.log`
        is_today = folder.is_today_file(file_name)
        expect(is_today).toBe(false)

        file_name = `bilbo-${infix}-${year}-${month - 1}-${day}-1.log`
        is_today = folder.is_today_file(file_name)
        expect(is_today).toBe(false)

        file_name = `bilbo-${infix}-${year}-${month}-${day - 1}-1.log`
        is_today = folder.is_today_file(file_name)
        expect(is_today).toBe(false)
    })
})
