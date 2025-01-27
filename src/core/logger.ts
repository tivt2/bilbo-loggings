import fs from "fs"
import path from "path"

type LoggerFields = {
    level: Uppercase<string>
    [key: string]: any
}

export class Logger<F extends LoggerFields> {
    private log_entry: Partial<F> = {}

    private file_name = ""
    private stream: fs.WriteStream

    constructor(
        private folder_path: string,
        private infix: string
    ) {
        folder_path = path.normalize(folder_path)
        if (!fs.existsSync(folder_path)) {
            fs.mkdirSync(folder_path, { recursive: true })
        }

        this.file_name = this.get_file_name(this.infix)
        const file_path = path.join(this.folder_path, this.file_name)

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

    level(level: F["level"]) {
        this.log_entry.level = level
        return this
    }

    add<K extends keyof Omit<F, "level">>(key: K, value: F[K]) {
        this.log_entry[key] = value
        return this
    }

    log(): void {
        if (!this.log_entry.level) {
            throw new Error("Log must have a valid level")
        }

        this.stream.write(JSON.stringify(this.log_entry) + "\n")

        for (const key of Object.keys(this.log_entry)) {
            if (key !== "level") delete this.log_entry[key]
        }
        this.log_entry.level = undefined
    }
}
