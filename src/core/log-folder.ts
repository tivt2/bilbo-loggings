import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { RotateFolder } from "./rotate-folder"

export class LogFolder {
    public file_regex: RegExp

    constructor(
        public folder_path: string,
        public infix: string,
        public rotate_folder: RotateFolder
    ) {
        this.folder_path = path.normalize(this.folder_path)

        this.file_regex = new RegExp(
            `bilbo-${this.infix}-(\\d{4})-(\\d{1,2})-(\\d{1,2})-(\\d+).log(\\.gz)?`
        )

        if (!fs.existsSync(this.folder_path)) {
            fs.mkdirSync(this.folder_path, { recursive: true })
        }
    }

    // generate file path with correct id
    create_file(id: number): string {
        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const file_name = `bilbo-${this.infix}-${year}-${month}-${day}-${id}.log`

        const file_path = path.join(this.folder_path, file_name)
        fs.appendFileSync(file_path, "")

        return file_path
    }

    // filter files based on file_regex and
    // sort files based on order yy-mm-dd-id
    filter_valid_files(files: string[], compressed: boolean): string[] {
        return files
            .filter((file) => {
                const match = file.match(this.file_regex)
                if (compressed) {
                    return match && match[5] === ".gz"
                }
                return match && match[5] === undefined
            })
            .sort((a, b) => {
                const match1 = a.match(this.file_regex)
                const match2 = b.match(this.file_regex)
                const yearDiff = Number(match2![1]) - Number(match1![1])
                if (yearDiff !== 0) return yearDiff
                const monthDiff = Number(match2![2]) - Number(match1![2])
                if (monthDiff !== 0) return monthDiff
                const dayDiff = Number(match2![3]) - Number(match1![3])
                if (dayDiff !== 0) return dayDiff
                return Number(match2![4]) - Number(match1![4])
            })
    }

    // match file_name against file_regex
    is_today_file(file_name: string): boolean {
        const match = file_name.match(this.file_regex)!
        if (!match) return false

        const [_, year, month, day, id] = match
        if (!id) return false

        const now = new Date()
        return (
            now.getUTCFullYear() === Number(year) &&
            now.getUTCMonth() + 1 === Number(month) &&
            now.getUTCDate() === Number(day)
        )
    }

    // retrieve the biggest id
    // for files in logger_folder and rotate_folder
    retrieve_biggest_file_id(): number {
        const log_files = this.filter_valid_files(
            fs.readdirSync(this.folder_path),
            false
        ).filter((file) => this.is_today_file(file))

        let biggest_log_file_id = 0
        if (log_files.length !== 0 && this.is_today_file(log_files[0])) {
            biggest_log_file_id = Number(
                log_files[0].match(this.file_regex)![4]
            )
        }

        const rotate_files = this.filter_valid_files(
            fs.readdirSync(this.rotate_folder.folder_path),
            true
        ).filter((file) => this.is_today_file(file))

        let biggest_rotate_file_id = 0
        if (rotate_files.length !== 0 && this.is_today_file(rotate_files[0])) {
            biggest_rotate_file_id = Number(
                rotate_files[0].match(this.file_regex)![4]
            )
        }

        return Math.max(biggest_log_file_id, biggest_rotate_file_id)
    }

    // rotate the files that are 'old' in the folder
    // return tuple [string, ...Promise]
    // where the newest file_path at [0]
    recover_folder(): [string] | [string, ...Promise<void>[]] {
        const valid_files = this.filter_valid_files(
            fs.readdirSync(this.folder_path),
            false
        )

        const out = [
            "",
            ...Array.from({ length: valid_files.length }, () =>
                Promise.resolve()
            ),
        ] as [string, ...Promise<void>[]]
        out[0] = ""
        if (valid_files.length == 0) {
            return out
        }

        for (let i = valid_files.length - 1; i > 0; i--) {
            out[i + 1] = this.rotate_file(valid_files[i])
        }

        if (!this.is_today_file(valid_files[0])) {
            out[1] = this.rotate_file(valid_files[0])
            return out
        }

        out[0] = path.join(this.folder_path, valid_files[0])
        return out
    }

    // assume the file_name exists
    // compress file using gzip and
    // moving it to rotate_folder
    async rotate_file(file_name: string): Promise<void> {
        const file_path = path.join(this.folder_path, file_name)
        const rotate_path =
            path.join(this.rotate_folder.folder_path, file_name) + ".gz"

        return new Promise((resolve, reject) => {
            exec(`gzip ${file_path}`, (err) => {
                if (err) {
                    console.error(`Failed to rotate file: ${file_path}`)
                    reject()
                }

                fs.renameSync(file_path + ".gz", rotate_path)

                console.log(`File: ${file_path} rotated successfully`)
                resolve()
            })
        })
    }
}
