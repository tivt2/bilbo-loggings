import fs from "fs"
import path from "path"
import { describe, test, expect, beforeAll, afterAll } from "vitest"
import { RotateFolder } from "../../src/core/rotate-folder"

describe("RotateFolder class unit tests", () => {
    const tmp_folder_path = "./tests/core/rotate-folder-tmp"

    beforeAll(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })

    test("instance creation + correctly create folder on fs", () => {
        expect(fs.existsSync(tmp_folder_path)).toBe(false)

        const folder = new RotateFolder(tmp_folder_path)

        expect(fs.existsSync(tmp_folder_path)).toBe(true)
    })

    afterAll(() => {
        if (fs.existsSync(tmp_folder_path)) {
            fs.rmSync(tmp_folder_path, { recursive: true })
        }
    })
})
