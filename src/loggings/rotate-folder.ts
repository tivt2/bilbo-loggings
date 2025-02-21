import fs from "fs"
import path from "path"
import { exec } from "child_process"

export class RotateFolder {
    constructor(
        public folder_path: string,
        public rotate_regex: RegExp
    ) {
        this.folder_path = path.normalize(this.folder_path)
    }

    init_folder() {
        if (!fs.existsSync(this.folder_path)) {
            fs.mkdirSync(this.folder_path, { recursive: true })
        }
    }

    // filter files based on file_regex and
    // sort files based on order yy-mm-dd-id
    // filter out files from future
    get_rotate_files(): string[] {
        const files = fs.readdirSync(this.folder_path)

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()

        return files
            .filter((file) => {
                const match = file.match(this.rotate_regex)
                return (
                    match &&
                    Number(match[1]) <= year &&
                    Number(match[2]) <= month &&
                    Number(match[3]) <= day
                )
            })
            .sort((a, b) => {
                const match1 = a.match(this.rotate_regex)
                const match2 = b.match(this.rotate_regex)
                const yearDiff = Number(match2![1]) - Number(match1![1])
                if (yearDiff !== 0) return yearDiff
                const monthDiff = Number(match2![2]) - Number(match1![2])
                if (monthDiff !== 0) return monthDiff
                const dayDiff = Number(match2![3]) - Number(match1![3])
                if (dayDiff !== 0) return dayDiff
                return Number(match2![4]) - Number(match1![4])
            })
    }

    // assume rotate file_name is valid
    // match file_name against rotate_regex
    is_today_rotate(file_name: string): boolean {
        const match = file_name.match(this.rotate_regex)!
        if (!match) return false

        const [_, year, month, day] = match

        const now = new Date()
        return (
            now.getUTCFullYear() === Number(year) &&
            now.getUTCMonth() + 1 === Number(month) &&
            now.getUTCDate() === Number(day)
        )
    }

    // compress file using gzip and
    // moving it to rotate_folder with '.gz'
    async rotate_file(file_path: string): Promise<void> {
        if (!fs.existsSync(file_path) || fs.statSync(file_path).isDirectory()) {
            return
        }

        const file_name = path.basename(file_path)
        const rotate_file_path = path.join(this.folder_path, file_name) + ".gz"

        return new Promise((resolve, reject) => {
            exec(`gzip ${file_path}`, (err) => {
                if (err) {
                    console.error(`Failed to rotate file: ${file_path}`)
                    reject()
                }

                fs.renameSync(file_path + ".gz", rotate_file_path)

                console.log(`File: ${file_path} rotation successful`)
                resolve()
            })
        })
    }
}
