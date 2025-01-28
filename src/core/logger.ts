import fs from "fs"
import path from "path"
import { exec } from "child_process"

type LoggerGenericKeys<F extends LoggerFields> = Omit<
    Omit<F, "level">,
    "message"
>

type LoggerPrintModes<F extends LoggerFields> = {
    levels: F["level"][]
    pretty: boolean
}

export type LoggerFields = {
    level: Uppercase<string>
    message: string
    [key: string]: any
}

export type LoggerOptions<F extends LoggerFields> = {
    folder_path: string
    file_infix: string
    logs_until_rotation: number
    print_mode?: LoggerPrintModes<F>
}

export class Logger<F extends LoggerFields> {
    private log_entry: Partial<F> = {}

    private file_regex
    private file_name
    private file_path
    private file_cur_lines
    private file_cur_id
    private stream: fs.WriteStream
    private rotate_folder_path

    constructor(private opts: LoggerOptions<F>) {
        this.opts.folder_path = path.normalize(this.opts.folder_path)
        if (!fs.existsSync(this.opts.folder_path)) {
            fs.mkdirSync(this.opts.folder_path, { recursive: true })
        }

        this.rotate_folder_path = path.join(this.opts.folder_path, "rotate")
        this.file_regex = new RegExp(
            `bilbo-${this.opts.file_infix}-(\\d{4})-(\\d{1,2})-(\\d{1,2})-(\\d+)`
        )

        if (!fs.existsSync(this.rotate_folder_path)) {
            this.file_cur_id = this.retrieve_file_id(
                this.opts.folder_path,
                ".log"
            )
        } else {
            this.file_cur_id = Math.max(
                this.retrieve_file_id(this.opts.folder_path, ".log"),
                this.retrieve_file_id(this.rotate_folder_path, ".log.gz")
            )
        }

        this.file_name = this.recover_folder()
        if (this.file_name === "") {
            this.file_cur_id++
            this.file_name = this.generate_file_name(this.file_cur_id)
        }
        this.file_path = path.join(this.opts.folder_path, this.file_name)

        if (!fs.existsSync(this.file_path)) {
            fs.appendFileSync(this.file_path, "")
        }
        const file_data = fs.readFileSync(this.file_path, "utf8")
        this.file_cur_lines =
            file_data.length === 0 ? 0 : file_data.trim().split("\n").length

        this.stream = fs.createWriteStream(this.file_path, { flags: "a" })

        console.log(`Logging to file: ${this.file_path}`)
        console.log(`Line count: ${this.file_cur_lines}`)
        console.log("----------------------")
    }

    // assumes file_name is a string that matches this.file_regex
    private is_today_file(file_name: string): boolean {
        const [_, year, month, day] = file_name.match(this.file_regex)!
        const now = new Date()
        return (
            now.getUTCFullYear() === Number(year) &&
            now.getUTCMonth() + 1 === Number(month) &&
            now.getUTCDate() === Number(day)
        )
    }

    // retrieve the id + 1 for files in folder
    // that match file_regex
    private retrieve_file_id(folder_path: string, ext: string): number {
        const valid_files = this.get_valid_files(folder_path, ext)

        if (valid_files.length === 0 || !this.is_today_file(valid_files[0])) {
            return 0
        }

        return Number(valid_files[0].match(this.file_regex)![4])
    }

    // generate file name with correct id based on
    // rotation folder files that have same date
    private generate_file_name(id: number): string {
        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const file_name = `bilbo-${this.opts.file_infix}-${year}-${month}-${day}-${id}.log`

        return file_name
    }

    // return files with valid naming that match
    // logger infix, sorted by year-month-day-id
    private get_valid_files(folder_path: string, ext: string): string[] {
        const file_w_ext_regex = new RegExp(this.file_regex.source + ext)
        const valid_files = fs
            .readdirSync(folder_path)
            .filter((file) => file.match(file_w_ext_regex))
            .sort((a, b) => {
                const match1 = a.match(file_w_ext_regex)
                const match2 = b.match(file_w_ext_regex)
                const yearDiff = Number(match2![1]) - Number(match1![1])
                if (yearDiff !== 0) return yearDiff
                const monthDiff = Number(match2![2]) - Number(match1![2])
                if (monthDiff !== 0) return monthDiff
                const dayDiff = Number(match2![3]) - Number(match1![3])
                if (dayDiff !== 0) return dayDiff
                return Number(match2![4]) - Number(match1![4])
            })

        return valid_files
    }

    // check folder files for valid files
    // rotate the files that are 'old'
    // return the newest file if it matches the current date
    private recover_folder(): string {
        const valid_files = this.get_valid_files(this.opts.folder_path, ".log")
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

        return valid_files[0]
    }

    // assume the file_name exists
    // compress file using gzip and
    // moving it to rotate_folder
    private rotate_file(file_name: string): void {
        const file_path = path.join(this.opts.folder_path, file_name)

        exec(`gzip ${file_path}`, (err) => {
            if (err) {
                console.error(`Failed to rotate file: ${file_path}`)
                return
            }

            const rotate_file_path =
                path.join(this.rotate_folder_path, file_name) + ".gz"
            if (!fs.existsSync(this.rotate_folder_path)) {
                fs.mkdirSync(this.rotate_folder_path)
            }
            fs.renameSync(file_path + ".gz", rotate_file_path)

            console.log(`File: ${file_path} rotated successfully`)
        })
    }

    private rotate_cur_file(): void {
        const old_stream = this.stream
        const old_file_name = this.file_name

        old_stream.end()
        old_stream.on("finish", () => {
            this.rotate_file(old_file_name)

            old_stream.close()
        })
        old_stream.on("error", (err) => {
            console.error(`Failed to finish stream ${old_file_name}`)
            console.error(err)
        })

        this.file_cur_id++
        this.file_name = this.generate_file_name(this.file_cur_id)
        this.file_path = path.join(this.opts.folder_path, this.file_name)

        fs.appendFileSync(this.file_path, "")
        this.file_cur_lines = 0
        this.stream = fs.createWriteStream(this.file_path, { flags: "a" })
    }

    // assumes options.print_mode != undefined
    private print_log(): void {
        if (this.opts.print_mode!.pretty) {
            console.log(
                `\x1b[48;5;15m\x1b[38;5;16m ${this.log_entry.level} \x1b[m ${this.log_entry.message}`
            )
        } else {
            console.log(`${this.log_entry.level}: ${this.log_entry.message}`)
        }
    }

    level(level: F["level"]) {
        this.log_entry.level = level
        return this
    }

    message(msg: string) {
        this.log_entry.message = msg
        return this
    }

    add<K extends keyof LoggerGenericKeys<F>>(key: K, value: F[K]) {
        this.log_entry[key] = value
        return this
    }

    log(): void {
        if (!this.log_entry.level) {
            throw new Error("Log entry must have a valid level")
        }

        if (this.file_cur_lines >= this.opts.logs_until_rotation) {
            this.rotate_cur_file()
        }

        if (
            this.opts.print_mode !== undefined &&
            this.opts.print_mode.levels.includes(this.log_entry.level)
        ) {
            this.print_log()
        }

        if (!this.stream.write(JSON.stringify(this.log_entry) + "\n")) {
            throw new Error("Log was not writen to file")
        }
        this.file_cur_lines++

        for (const key of Object.keys(this.log_entry)) {
            delete this.log_entry[key]
        }
    }
}
