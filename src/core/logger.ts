import assert from "assert"
import fs from "fs"
import path from "path"

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
    print_mode?: LoggerPrintModes<F>
}

export class Logger<F extends LoggerFields> {
    private log_entry: Partial<F> = {}

    private file_regex
    private file_name
    private file_path
    private file_cur_lines
    private stream: fs.WriteStream
    private rotate_path

    constructor(private opts: LoggerOptions<F>) {
        this.opts.folder_path = path.normalize(this.opts.folder_path)
        if (!fs.existsSync(this.opts.folder_path)) {
            fs.mkdirSync(this.opts.folder_path, { recursive: true })
        }

        this.rotate_path = path.join(this.opts.folder_path, "rotate")
        this.file_regex = new RegExp(
            `bilbo-${this.opts.file_infix}-(\\d{4})-(\\d{1,2})-(\\d{1,2})-(\\d+)`
        )

        this.file_name = this.recover_folder()
        if (this.file_name === "") {
            this.file_name = this.generate_file_name()
        }
        this.file_path = path.join(this.opts.folder_path, this.file_name)

        if (!fs.existsSync(this.file_path)) {
            fs.appendFileSync(this.file_path, "")
        }
        this.file_cur_lines = fs
            .readFileSync(this.file_path, "utf8")
            .trim()
            .split("\n").length

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

    // generate file name with correct id based on
    // rotation folder files that have same date
    private generate_file_name(): string {
        let cur = 1
        if (fs.existsSync(this.rotate_path)) {
            const rotate_files = this.get_valid_files(
                this.rotate_path,
                ".log.gz"
            )
            if (
                rotate_files.length > 0 &&
                this.is_today_file(rotate_files[0])
            ) {
                cur = Number(rotate_files[0].match(this.file_regex)![4]) + 1
            }
        }

        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const file_name = `bilbo-${this.opts.file_infix}-${year}-${month}-${day}-${cur}.log`

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

        for (let i = valid_files.length - 1; i >= 0; i--) {
            this.rotate_file(valid_files[i])
        }

        if (!this.is_today_file(valid_files[0])) {
            this.rotate_file(valid_files[0])
            return ""
        }

        return valid_files[0]
    }

    private rotate_file(file_name: string): void {
        return
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

        if (
            this.opts.print_mode !== undefined &&
            this.opts.print_mode.levels.includes(this.log_entry.level)
        ) {
            this.print_log()
        }

        if (!this.stream.write(JSON.stringify(this.log_entry) + "\n")) {
            throw new Error("Log was not writen to file")
        }

        for (const key of Object.keys(this.log_entry)) {
            delete this.log_entry[key]
        }
    }
}
