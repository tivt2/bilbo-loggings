import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll } from "vitest"
import { LogFolder } from "../../src/core/log-folder"
import { RotateFolder } from "../../src/core/rotate-folder"

function make_file(
    folder_path: string,
    ext: string,
    infix: string,
    year: number,
    month: number,
    day: number,
    id: number
) {
    const path_file = path.join(
        folder_path,
        `bilbo-${infix}-${year}-${month}-${day}-${id}${ext}`
    )
    fs.appendFileSync(path_file, "")
}

describe("LogFolder class unit tests", () => {
    const tmp_folder_path = "./tests/core/log-folder-tmp"

    beforeAll(() => {
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

        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        new LogFolder(tmp_folder_path, "infix", rotate)

        expect(fs.existsSync(tmp_folder_path)).toBe(true)
    })

    test("correctly create a file", () => {
        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        const folder = new LogFolder(tmp_folder_path, "infix", rotate)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const expected_path = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day}-2.log`
        )
        expect(fs.existsSync(expected_path)).toBe(false)

        const file_path = folder.create_file(2)

        expect(file_path).toEqual(expected_path)
        expect(fs.existsSync(file_path)).toBe(true)
    })

    test("filter_valid_files() validate correct filtering/sorting", () => {
        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        const folder = new LogFolder(tmp_folder_path, "infix", rotate)

        const file_path = folder.create_file(2)
        const file_name = path.basename(file_path)
        fs.appendFileSync(path.join(rotate.folder_path, file_name + ".gz"), "")

        let files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            true
        )
        expect(files.length).toEqual(0)

        files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(files.length).toEqual(1)
        expect(files).toEqual([file_name])

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const invalid_infix = path.join(
            tmp_folder_path,
            `bilbo-wrong_infix-${year}-${month}-${day}-2.log`
        )
        fs.appendFileSync(invalid_infix, "")

        files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(files.length).toEqual(1)
        expect(files).toEqual([file_name])

        const older_year = path.join(
            tmp_folder_path,
            `bilbo-infix-${year - 1}-${month}-${day}-2.log`
        )
        fs.appendFileSync(older_year, "")

        files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(files.length).toEqual(2)
        expect(files).toEqual([file_name, path.basename(older_year)])

        const older_month = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month - 1}-${day}-2.log`
        )
        fs.appendFileSync(older_month, "")

        files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(files.length).toEqual(3)
        expect(files).toEqual([
            file_name,
            path.basename(older_month),
            path.basename(older_year),
        ])

        const older_day = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day - 1}-2.log`
        )
        fs.appendFileSync(older_day, "")

        files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(files.length).toEqual(4)
        expect(files).toEqual([
            file_name,
            path.basename(older_day),
            path.basename(older_month),
            path.basename(older_year),
        ])

        const older_id = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day}-1.log`
        )
        fs.appendFileSync(older_id, "")

        files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(files.length).toEqual(5)
        expect(files).toEqual([
            file_name,
            path.basename(older_id),
            path.basename(older_day),
            path.basename(older_month),
            path.basename(older_year),
        ])
    })

    test("filter_valid_files() when file is compressed", () => {
        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        const folder = new LogFolder(tmp_folder_path, "infix", rotate)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const expected_path = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day}-2.log.gz`
        )

        fs.appendFileSync(expected_path, "")

        const files = folder.filter_valid_files(
            fs.readdirSync(rotate.folder_path),
            true
        )
        expect(files.length).toEqual(1)
        expect(files).toEqual([path.basename(expected_path)])
    })

    test("is_today_file() correctly working", () => {
        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        const folder = new LogFolder(tmp_folder_path, "infix", rotate)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const correct_today_file = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day}-2.log`
        )

        let is_valid = folder.is_today_file(correct_today_file)
        expect(is_valid).toBe(true)

        const wrong_year_file = path.join(
            tmp_folder_path,
            `bilbo-infix-${year - 1}-${month}-${day}-2.log`
        )

        is_valid = folder.is_today_file(wrong_year_file)
        expect(is_valid).toBe(false)

        const wrong_month_file = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month - 1}-${day}-2.log`
        )

        is_valid = folder.is_today_file(wrong_month_file)
        expect(is_valid).toBe(false)

        const wrong_day_file = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day - 1}-2.log`
        )

        is_valid = folder.is_today_file(wrong_day_file)
        expect(is_valid).toBe(false)

        const wrong_infix_file = path.join(
            tmp_folder_path,
            `bilbo-wrong_infix-${year}-${month}-${day}-2.log`
        )

        is_valid = folder.is_today_file(wrong_infix_file)
        expect(is_valid).toBe(false)

        const no_id_file = path.join(
            tmp_folder_path,
            `bilbo-infix-${year}-${month}-${day}.log`
        )

        is_valid = folder.is_today_file(no_id_file)
        expect(is_valid).toBe(false)
    })

    test("retrieve_biggest_file_id() correctly returning biggest id for today file", () => {
        const custom_path = path.join(tmp_folder_path, "custom")
        const rotate = new RotateFolder(path.join(custom_path, "rotate"))
        const folder = new LogFolder(custom_path, "infix", rotate)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        make_file(custom_path, ".log", "infix", year, month, day, 10)
        make_file(custom_path, ".log", "infix", year + 1, month, day, 1)
        make_file(custom_path, ".log", "infix", year, month + 1, day, 1)
        make_file(custom_path, ".log", "infix", year, month, day + 1, 1)

        const cstm_rot_path = rotate.folder_path
        make_file(cstm_rot_path, ".log.gz", "infix", year, month, day, 5)
        make_file(cstm_rot_path, ".log.gz", "infix", year + 1, month, day, 1)
        make_file(cstm_rot_path, ".log.gz", "infix", year, month + 1, day, 1)
        make_file(cstm_rot_path, ".log.gz", "infix", year, month, day + 1, 1)

        let biggest = folder.retrieve_biggest_file_id()
        expect(biggest).toEqual(10)

        make_file(cstm_rot_path, ".log.gz", "infix", year, month, day, 15)
        biggest = folder.retrieve_biggest_file_id()
        expect(biggest).toEqual(15)
    })

    test("rotate_folder() correctly compress and move file", async () => {
        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        const folder = new LogFolder(tmp_folder_path, "rotate_infix", rotate)

        const file_path = folder.create_file(1)

        // file is at folder_path
        let valid_files = folder.filter_valid_files(
            fs.readdirSync(folder.folder_path),
            false
        )
        expect(valid_files[0]).toEqual(path.basename(file_path))

        await folder.rotate_file(path.basename(file_path))

        // file is at rotate_path
        valid_files = folder.filter_valid_files(
            fs.readdirSync(rotate.folder_path),
            true
        )
        expect(valid_files[0]).toEqual(path.basename(file_path) + ".gz")
    })

    test("recover_folder() correctly rotate old files and return valid newest", async () => {
        const rotate = new RotateFolder(path.join(tmp_folder_path, "rotate"))
        const folder = new LogFolder(tmp_folder_path, "recover_infix", rotate)

        const expect_file_path = folder.create_file(1)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        make_file(
            folder.folder_path,
            ".log",
            "recover_infix",
            year - 1,
            month,
            day,
            1
        )
        make_file(
            folder.folder_path,
            ".log",
            "recover_infix",
            year - 2,
            month,
            day,
            1
        )

        const [file_path, ...promises] = folder.recover_folder()
        await Promise.all(promises)
        expect(file_path).toEqual(expect_file_path)
    })
})
