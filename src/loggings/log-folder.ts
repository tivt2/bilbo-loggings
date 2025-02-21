import fs from "fs"
import path from "path"
import { RotateFolder } from "./rotate-folder"

export class LogFolder {
    constructor(
        public folder_path: string,
        public infix: string,
        public file_regex: RegExp,
        public rotate_folder: RotateFolder
    ) {
        this.folder_path = path.normalize(this.folder_path)
    }

    init_folder(): void {
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
    // filter out files from future
    get_log_files(): string[] {
        const files = fs.readdirSync(this.folder_path)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()

        return files
            .filter((file) => {
                const match = file.match(this.file_regex)
                return (
                    match &&
                    Number(match[1]) <= year &&
                    Number(match[2]) <= month &&
                    Number(match[3]) <= day
                )
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

    // assume file file_name is valid
    // match file_name against file_regex
    is_today_file(file_name: string): boolean {
        const match = file_name.match(this.file_regex)!
        if (!match) return false

        const [_, year, month, day] = match

        const now = new Date()
        return (
            now.getUTCFullYear() === Number(year) &&
            now.getUTCMonth() + 1 === Number(month) &&
            now.getUTCDate() === Number(day)
        )
    }
}
