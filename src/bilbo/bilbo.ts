import net from "node:net"
import { LoggingsSpawner } from "./loggings_spawn"
import { UNIX_SOCK_PATH } from "../constants"

type LoggerMandatory = {
    level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL"
    message: string
    at: number
}

type UserFields = Record<string, any>
type LoggerFields = LoggerMandatory & UserFields

export interface Log<F extends LoggerFields> {
    message(msg: string): Log<F>
    field<K extends keyof Omit<F, keyof LoggerMandatory>>(
        key: K,
        val: F[K]
    ): Log<F>
    log(): Promise<void>
}

class LogEntry<F extends LoggerFields> implements Log<F> {
    public _entry: Partial<F> = {}

    constructor(public log_fn: (log: LogEntry<F>) => Promise<void>) {}

    get entry(): Partial<F> {
        return this._entry
    }

    level(level: F["level"]): Log<F> {
        this._entry.level = level
        return this
    }

    message(message: string): Log<F> {
        this._entry.message = message
        return this
    }

    at(at: number): Log<F> {
        this._entry.at = at
        return this
    }

    field<K extends keyof F>(key: K, val: F[K]): Log<F> {
        this._entry[key] = val
        return this
    }

    reset(): void {
        let key: keyof F

        for (key in this._entry) {
            delete this._entry[key]
        }
    }

    async log(): Promise<void> {
        await this.log_fn(this)
    }
}

export class Bilbo<
    U extends UserFields,
    F extends LoggerFields = U & LoggerMandatory,
> {
    public server: Promise<net.Socket>

    public log_pool: LogEntry<F>[] = []

    private constructor(public log_file_path: string) {
        this.server = new Promise((resolve) => {
            const server = net
                .connect(UNIX_SOCK_PATH)
                .on("data", (data: Buffer) => {
                    switch (data.toString()) {
                        case "awk":
                            console.log("Bilbo connected")
                            console.log("---------------")
                            resolve(server)
                            break
                        default:
                            console.info("Unexpected msg:", data.toString())
                            break
                    }
                })
                .on("error", (error) => {
                    console.error("Bilbo Socket error:", error)
                    server.end()
                })
                .on("end", () => {
                    console.log("bilbo disconnected")
                })
        })
    }

    static async logger<U extends UserFields>(
        log_file_path: string
    ): Promise<Bilbo<U>> {
        await LoggingsSpawner.spawn(log_file_path)

        return new Bilbo<U>(log_file_path)
    }

    async close(): Promise<void> {
        const server = await this.server
        server.end()
    }

    get_log_from_pool(): LogEntry<F> {
        let log = this.log_pool.pop()
        if (!log) {
            log = new LogEntry<F>(this.log_to_loggings.bind(this))
        }

        return log
    }

    return_log_to_pool(log: LogEntry<F>): void {
        log.reset()

        this.log_pool.push(log)
    }

    level(level: LoggerMandatory["level"], message: string): Log<F> {
        const log = this.get_log_from_pool()

        log.field("level", level)
        log.field("at", Date.now())
        log.field("message", message)

        return log
    }

    DEBUG(message: string): Log<F> {
        return this.level("DEBUG", message)
    }

    INFO(message: string): Log<F> {
        return this.level("INFO", message)
    }

    WARN(message: string): Log<F> {
        return this.level("WARN", message)
    }

    ERROR(message: string): Log<F> {
        return this.level("ERROR", message)
    }

    FATAL(message: string): Log<F> {
        return this.level("FATAL", message)
    }

    async log_to_loggings(log: LogEntry<F>): Promise<void> {
        const server = await this.server

        console.log(log.entry)
        server.write(JSON.stringify(log.entry) + "\n")

        this.return_log_to_pool(log)
    }
}
