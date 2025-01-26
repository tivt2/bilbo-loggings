import fs from "fs"
import path from "path"

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"
type LogFields = { [key: string]: any }

export class Logger<T extends LogFields> {
    private log_entry: { level?: LogLevel } & Partial<T> = {}

    private file_name = ""
    private fd: number = -1
    private file_stream: fs.WriteStream

    constructor(
        private folder_path: string,
        private infix: string
    ) {
        folder_path = path.normalize(folder_path)
        fs.mkdirSync(folder_path, { recursive: true })
        this.file_name = this.get_file_name(this.infix)
        const file_path = path.join(this.folder_path, this.file_name)

        this.fd = fs.openSync(file_path, "w")
        this.file_stream = fs.createWriteStream("", { fd: this.fd, flags: "a" })
    }

    private get_file_name(infix: string): string {
        const now = new Date()
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth() + 1
        const day = now.getUTCDate()
        const file_name = `bilbo-${infix}-${year}-${month}-${day}.log`
        return file_name
    }

    debug(): Logger<T> {
        this.log_entry.level = "DEBUG"
        return this
    }

    info(): Logger<T> {
        this.log_entry.level = "INFO"
        return this
    }

    warn(): Logger<T> {
        this.log_entry.level = "WARN"
        return this
    }

    error(): Logger<T> {
        this.log_entry.level = "ERROR"
        return this
    }

    field<K extends keyof T>(key: K, val: T[K]): Logger<T> {
        this.log_entry[key] = val
        return this
    }

    log(): void {
        if (!this.log_entry.level) {
            throw new Error("Missing level")
        }

        this.file_stream.write(JSON.stringify(this.log_entry) + "\n")

        for (const key of Object.keys(this.log_entry)) {
            if (key !== "level") delete this.log_entry[key]
        }
        this.log_entry.level = undefined
    }
}
