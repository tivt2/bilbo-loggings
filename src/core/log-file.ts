import fs, { WriteStream } from "fs"

export class LogFile {
    public stream: WriteStream
    public line_count: number

    constructor(public file_path: string) {
        if (!fs.existsSync(file_path)) {
            fs.appendFileSync(file_path, "")
        }

        const file_data = fs.readFileSync(file_path, "utf8")
        this.line_count =
            file_data.length === 0 ? 0 : file_data.trim().split("\n").length

        this.stream = fs.createWriteStream(file_path, { flags: "a" })
    }

    write_ln(log: string) {
        if (!this.stream.write(log + "\n")) {
            return false
        }
        this.line_count++
        return true
    }

    // finish writing to file
    // then return file_path or reject
    async finish(): Promise<string> {
        this.stream.end()

        return new Promise((resolve, reject) => {
            this.stream.on("finish", () => {
                this.stream.close(() => {
                    resolve(this.file_path)
                })
            })
            this.stream.on("error", (err) => {
                console.error(`Failed to finish stream ${this.file_path}`)
                console.error(err)
                reject()
            })
        })
    }
}
