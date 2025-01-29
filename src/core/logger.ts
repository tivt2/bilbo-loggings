import path from "path"
import { LoggerFolder } from "./logger-folder"
import { RotateFolder } from "./rotate-folder"
import { LogFile } from "./log-file"

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
    infix: string
    max_logs: number
    print_mode?: LoggerPrintModes<F>
}

export class Logger<F extends LoggerFields> {
    private log_entry: Partial<F> = {}

    private log_folder: LoggerFolder
    private rotate_folder: RotateFolder

    private log_file: LogFile
    private log_file_id: number

    constructor(private opts: LoggerOptions<F>) {
        this.opts.folder_path = path.normalize(this.opts.folder_path)

        this.rotate_folder = new RotateFolder(
            path.join(this.opts.folder_path, "rotate")
        )
        this.log_folder = new LoggerFolder(
            this.opts.folder_path,
            this.opts.infix,
            this.rotate_folder
        )
        this.log_folder.create_folder()
        this.rotate_folder.create_folder()

        this.log_file_id = this.log_folder.retrieve_biggest_file_id()
        let file_path = this.log_folder.recover_folder()
        if (file_path === "") {
            this.log_file_id++
            file_path = this.log_folder.create_file(this.log_file_id)
        }

        this.log_file = new LogFile(file_path)

        console.log(`Logging to file: ${this.log_file.file_path}`)
        console.log(`Line count: ${this.log_file.line_count}`)
        console.log("----------------------")
    }

    private rotate_cur_file(): void {
        this.log_file.finish().then((file_path) => {
            const file_name = path.basename(file_path)
            this.log_folder.rotate_file(file_name)
        })

        this.log_file_id++
        this.log_file = new LogFile(
            this.log_folder.create_file(this.log_file_id)
        )
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

        if (this.log_file.line_count >= this.opts.max_logs) {
            this.rotate_cur_file()
        }

        if (
            this.opts.print_mode !== undefined &&
            this.opts.print_mode.levels.includes(this.log_entry.level)
        ) {
            this.print_log()
        }

        if (!this.log_file.write_ln(JSON.stringify(this.log_entry))) {
            throw new Error("Log was not writen to file")
        }

        for (const key of Object.keys(this.log_entry)) {
            delete this.log_entry[key]
        }
    }
}
