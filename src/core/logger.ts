import path from "path"
import { LogFolder } from "./log-folder"
import { RotateFolder } from "./rotate-folder"
import { LogFile } from "./log-file"
import { create_file_regex } from "./util"

type LoggerGenericKeys<F extends LoggerFields> = Omit<
    Omit<F, "level">,
    "message"
>

export type LoggerFields = {
    level: Uppercase<string>
    message: string
    [key: string]: any
}

export type LoggerOptions<F extends LoggerFields> = {
    folder_path: string
    infix: string
    max_logs: number
    console?: {
        levels: F["level"][]
        pretty: boolean
    }
}

interface Log<F extends LoggerFields> {
    level(level: F["level"]): Log<F>
    message(msg: string): Log<F>
    add<K extends keyof LoggerGenericKeys<F>>(key: K, value: F[K]): Log<F>
    log(): void
}

class LogEntry<F extends LoggerFields> implements Log<F> {
    public entry: Partial<F> = {}

    constructor(private log_fn: (log: LogEntry<F>) => void) {}

    level(level: F["level"]): Log<F> {
        this.entry.level = level
        return this
    }

    message(msg: string): Log<F> {
        this.entry.message = msg
        return this
    }

    add<K extends keyof LoggerGenericKeys<F>>(key: K, value: F[K]): Log<F> {
        this.entry[key] = value
        return this
    }

    log(): void {
        this.log_fn(this)
    }

    reset(): void {
        for (const key of Object.keys(this.entry)) {
            delete this.entry[key]
        }
    }
}

export class Logger<F extends LoggerFields> {
    private log_pool: Log<F>[] = []

    private log_folder: LogFolder
    private rotate_folder: RotateFolder

    private log_file: LogFile
    private log_file_id: number = 1

    constructor(private opts: LoggerOptions<F>) {
        if (opts.max_logs < 1) {
            throw new Error("Logger Options.max_logs must be a positive number")
        }

        this.opts.folder_path = path.normalize(this.opts.folder_path)
        const file_regex = create_file_regex(this.opts.infix)

        this.rotate_folder = new RotateFolder(
            path.join(this.opts.folder_path, "rotate"),
            new RegExp(file_regex.source + ".gz")
        )
        this.log_folder = new LogFolder(
            this.opts.folder_path,
            this.opts.infix,
            file_regex,
            this.rotate_folder
        )
        this.log_folder.init_folder()
        this.rotate_folder.init_folder()

        let file_path = this.recover()
        if (file_path === "") {
            file_path = this.log_folder.create_file(this.log_file_id)
        }

        this.log_file = new LogFile(file_path)

        console.log(`Logging to file: ${this.log_file.file_path}`)
        console.log(`Line count: ${this.log_file.line_count}`)
        console.log("----------------------")
    }

    // rotate 'old' files
    // return newest file from today
    // else return ""
    private recover(): string {
        this.log_file_id = this.retrieve_biggest_file_id()

        const valid_files = this.log_folder.get_log_files()
        if (valid_files.length == 0) {
            this.log_file_id++
            return ""
        }

        for (let i = valid_files.length - 1; i > 0; i--) {
            const file_path = path.join(
                this.log_folder.folder_path,
                valid_files[i]
            )
            this.rotate_folder.rotate_file(file_path)
        }

        const newest_id = Number(
            valid_files[0].match(this.log_folder.file_regex)![4]
        )
        const newest_path = path.join(
            this.log_folder.folder_path,
            valid_files[0]
        )
        if (
            !this.log_folder.is_today_file(valid_files[0]) ||
            newest_id < this.log_file_id
        ) {
            this.log_file_id++
            this.rotate_folder.rotate_file(newest_path)
            return ""
        }

        return newest_path
    }

    // retrieve the biggest id from
    // files in log_folder and rotate_folder
    private retrieve_biggest_file_id(): number {
        const log_files = this.log_folder
            .get_log_files()
            .filter((file) => this.log_folder.is_today_file(file))

        let biggest_log_file_id = 0
        if (log_files.length !== 0) {
            biggest_log_file_id = Number(
                log_files[0].match(this.log_folder.file_regex)![4]
            )
        }

        const rotate_files = this.rotate_folder
            .get_rotate_files()
            .filter((file) => this.rotate_folder.is_today_rotate(file))

        let biggest_rotate_file_id = 0
        if (rotate_files.length !== 0) {
            biggest_rotate_file_id = Number(
                rotate_files[0].match(this.rotate_folder.rotate_regex)![4]
            )
        }

        return Math.max(biggest_log_file_id, biggest_rotate_file_id)
    }

    private rotate_cur_file(): void {
        this.log_file.finish().then((file_path) => {
            this.rotate_folder.rotate_file(file_path)
        })

        this.log_file_id++
        this.log_file = new LogFile(
            this.log_folder.create_file(this.log_file_id)
        )
    }

    // assumes options.print_mode != undefined
    private print_log(entry: Partial<F>): void {
        if (this.opts.console!.pretty) {
            console.log(
                `\x1b[48;5;15m\x1b[38;5;16m ${entry.level} \x1b[m ${entry.message}`
            )
        } else {
            console.log(`${entry.level}: ${entry.message}`)
        }
    }

    level(level: F["level"]) {
        let log = this.log_pool.pop()

        if (log === undefined) {
            log = new LogEntry<F>(this.log.bind(this))
        }

        log.level(level)
        return log
    }

    // logger .log() method will only be called by
    // instances of LogEntry during its .log() call
    private log(log: LogEntry<F>): void {
        if (!log.entry.level) {
            console.error("Log entry must have a valid level")
            log.reset()
            this.log_pool.push(log)
            return
        }

        if (this.log_file.line_count >= this.opts.max_logs) {
            this.rotate_cur_file()
        }

        if (
            this.opts.console !== undefined &&
            this.opts.console.levels.includes(log.entry.level)
        ) {
            this.print_log(log.entry)
        }

        if (!this.log_file.write_ln(JSON.stringify(log.entry))) {
            // TODO: fallback?
            console.error("Log was not writen to file")
        }

        log.reset()
        this.log_pool.push(log)
    }
}
