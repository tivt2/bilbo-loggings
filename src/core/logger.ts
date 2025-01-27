import assert from "assert"
import fs from "fs"
import path from "path"

type LoggerFields = {
    level: Uppercase<string>
    message: string
    [key: string]: any
}

type LoggerGenericKeys<F extends LoggerFields> = Omit<
    Omit<F, "level">,
    "message"
>

type LoggerPrintModes<F extends LoggerFields> = {
    levels: F["level"][]
    pretty: boolean
}

type LoggerOptions<F extends LoggerFields> = {
    folder_path: string
    file_infix: string
    print_mode?: LoggerPrintModes<F>
}

export class Logger<F extends LoggerFields> {
    private log_entry: Partial<F> = {}

    private file_name
    private stream: fs.WriteStream

    constructor(private options: LoggerOptions<F>) {
        this.options.folder_path = path.normalize(this.options.folder_path)
        if (!fs.existsSync(this.options.folder_path)) {
            fs.mkdirSync(this.options.folder_path, { recursive: true })
        }

        this.file_name = this.get_file_name(this.options.file_infix)
        const file_path = path.join(this.options.folder_path, this.file_name)

        fs.appendFileSync(file_path, "")
        this.stream = fs.createWriteStream(file_path, { flags: "a" })
    }

    private get_file_name(infix: string): string {
        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const file_name = `bilbo-${infix}-${year}-${month}-${day}.log`
        return file_name
    }

    private print_log(): void {
        assert(
            this.options.print_mode !== undefined,
            "decode_slim() assume options.print_mode != undefined"
        )

        if (this.options.print_mode.pretty) {
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
            throw new Error("Log must have a valid level")
        }

        if (
            this.options.print_mode !== undefined &&
            this.options.print_mode.levels.includes(this.log_entry.level)
        ) {
            this.print_log()
        }

        this.stream.write(JSON.stringify(this.log_entry) + "\n")

        for (const key of Object.keys(this.log_entry)) {
            if (key !== "level") delete this.log_entry[key]
        }
        this.log_entry.level = undefined
    }
}
