import fs from "fs"
import path from "path"
import { describe, test, expect, beforeEach, afterAll } from "vitest"
import { RotateFolder } from "../../src/core/rotate-folder"
import { create_file_regex } from "../../src/core/util"
import { dummy_logger_file_name } from "./util"

describe("RotateFolder class unit tests", () => {
    const tmp_folder_path = "./tests/core/rotate-folder"
    const infix = "rotate_test"
    const rotate_regex = new RegExp(create_file_regex(infix).source + ".gz")

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

    test("instance creation + correctly init_folder() on fs", () => {
        expect(fs.existsSync(tmp_folder_path)).toBe(false)

        const folder = new RotateFolder(tmp_folder_path, rotate_regex)
        folder.init_folder()

        expect(fs.existsSync(tmp_folder_path)).toBe(true)
    })

    test("get_rotate_files() all files that match rotate_regex sorted", () => {
        const folder = new RotateFolder(tmp_folder_path, rotate_regex)
        folder.init_folder()

        const file_name1 = dummy_logger_file_name(infix, 1) + ".gz"
        let rotate_file_path = path.join(folder.folder_path, file_name1)
        fs.appendFileSync(rotate_file_path, "")

        const file_name2 = dummy_logger_file_name(infix, 2) + ".gz"
        rotate_file_path = path.join(folder.folder_path, file_name2)
        fs.appendFileSync(rotate_file_path, "")

        const files = folder.get_rotate_files()
        expect(files.length).toEqual(2)
        expect(files).toEqual([file_name2, file_name1])
    })

    test("is_today_rotate() return true for today rotate files", () => {
        const folder = new RotateFolder(tmp_folder_path, rotate_regex)
        folder.init_folder()

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()

        let file_name = `bilbo-${infix}-${year}-${month}-${day}-1.log.gz`
        let is_today = folder.is_today_rotate(file_name)
        expect(is_today).toBe(true)

        file_name = `bilbo-${infix}-${year - 1}-${month}-${day}-1.log.gz`
        is_today = folder.is_today_rotate(file_name)
        expect(is_today).toBe(false)

        file_name = `bilbo-${infix}-${year}-${month - 1}-${day}-1.log.gz`
        is_today = folder.is_today_rotate(file_name)
        expect(is_today).toBe(false)

        file_name = `bilbo-${infix}-${year}-${month}-${day - 1}-1.log.gz`
        is_today = folder.is_today_rotate(file_name)
        expect(is_today).toBe(false)
    })

    test("rotate_file() compress file with gzip and mv to folder_path", async () => {
        const folder = new RotateFolder(tmp_folder_path, rotate_regex)
        folder.init_folder()

        const file_name = dummy_logger_file_name(infix, 3)
        const file_path = path.join(folder.folder_path, file_name)
        fs.appendFileSync(file_path, "")
        expect(fs.existsSync(file_path)).toEqual(true)

        await folder.rotate_file(file_path)
        expect(fs.existsSync(file_path)).toEqual(false)
        expect(fs.existsSync(file_path + ".gz")).toEqual(true)
    })
})
