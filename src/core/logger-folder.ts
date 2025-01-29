import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { RotateFolder } from "./rotate-folder"

export class LoggerFolder {
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
    }

    create_folder(): void {
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

    // return files with valid naming sorted by year-month-day-id
    get_valid_files(folder_path: string): string[] {
        const valid_files = this.filter_valid_files(
            fs.readdirSync(folder_path),
            false
        )

        return valid_files
    }

    // assumes file_name is a string that matches this.file_regex
    is_today_file(file_name: string): boolean {
        const [_, year, month, day] = file_name.match(this.file_regex)!
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
        const log_files = this.get_valid_files(this.folder_path)

        let biggest_log_file_id = 0
        if (log_files.length !== 0 && this.is_today_file(log_files[0])) {
            biggest_log_file_id = Number(
                log_files[0].match(this.file_regex)![4]
            )
        }

        const rotate_files = this.get_valid_files(
            this.rotate_folder.folder_path
        )

        let biggest_rotate_file_id = 0
        if (rotate_files.length !== 0 && this.is_today_file(rotate_files[0])) {
            biggest_rotate_file_id = Number(
                rotate_files[0].match(this.file_regex)![4]
            )
        }

        return Math.max(biggest_log_file_id, biggest_rotate_file_id)
    }

    // rotate the files that are 'old' in the folder
    // return the newest file path if it matches the current date
    recover_folder(): string {
        const valid_files = this.get_valid_files(this.folder_path)
        if (valid_files.length == 0) {
            return ""
        }

        for (let i = valid_files.length - 1; i > 0; i--) {
            this.rotate_file(valid_files[i])
        }

        if (!this.is_today_file(valid_files[0])) {
            this.rotate_file(valid_files[0])
            return ""
        }

        return path.join(this.folder_path, valid_files[0])
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

                this.rotate_folder.create_folder()
                fs.renameSync(file_path + ".gz", rotate_path)

                console.log(`File: ${file_path} rotated successfully`)
                resolve()
            })
        })
    }
}
