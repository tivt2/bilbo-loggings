import net from "node:net"
import path from "node:path"
import fs from "node:fs"
import crypto from "node:crypto"
import { Transform, Writable } from "node:stream"
import { UNIX_SOCK_PATH } from "../constants"

export class Loggings {
    public server: net.Server
    public clients: Map<string, net.Socket>

    public log_path: string
    public log_stream: Writable

    public loggings_timeout?: NodeJS.Timeout
    public loggings_timeout_ms: number = Math.max(
        this.BATCH_TIMOUT_LIMIT_MS,
        2000
    )

    constructor(
        public log_file_path: string,
        public BATCH_MAX_SIZE: number = 20,
        public BATCH_TIMOUT_LIMIT_MS: number = 100
    ) {
        this.log_path = path.join(log_file_path)
        fs.writeFileSync(this.log_path, "")

        this.log_stream = this.batch_transform_stream()

        const file_stream = fs.createWriteStream(this.log_path, {
            flags: "a",
            encoding: "utf8",
        })

        this.log_stream.pipe(file_stream)

        this.clients = new Map()

        this.server = net
            .createServer()
            .on("connection", this.server_conn.bind(this))
            .on("drop", this.server_drop.bind(this))
            .on("error", this.server_err.bind(this))
            .on("close", this.server_close.bind(this))
            .listen(UNIX_SOCK_PATH, () => {
                console.info(`Loggings listening to ${UNIX_SOCK_PATH}`)
            })

        process.on("SIGINT", () => {
            clearTimeout(this.loggings_timeout)
            this.server_cleanup()
        })

        this.server_timeout(this.loggings_timeout_ms)
    }

    server_conn(client: net.Socket) {
        clearTimeout(this.loggings_timeout)

        const uuid = crypto.randomUUID()
        console.info("new connection", uuid)
        this.clients.set(uuid, client)

        client.on("data", this.client_data())
        client.on("error", this.client_error(uuid))
        client.on("end", this.client_end(uuid))

        client.write("awk")
    }

    server_drop(data?: net.DropArgument) {
        console.info("connection droped")
        !data ? undefined : console.info(data)
    }

    server_err(error: Error) {
        console.error("Loggings Error:", error)
        this.server_cleanup()
    }

    server_close(error?: Error) {
        if (error) {
            console.error("Error closing:", error)
        }
    }

    server_cleanup() {
        this.server.close()
        this.log_stream.end()
        for (const [uuid, sock] of this.clients.entries()) {
            sock.end()
            this.clients.delete(uuid)
        }

        if (fs.existsSync(UNIX_SOCK_PATH)) {
            fs.unlinkSync(UNIX_SOCK_PATH)
        }
    }

    server_timeout(delay: number) {
        this.loggings_timeout = setTimeout(() => {
            this.server_cleanup()
        }, delay)
    }

    client_data(): (data: Buffer) => void {
        return (data: Buffer) => {
            this.log_stream.write(data)
        }
    }

    client_error(uuid: string): (error: Error) => void {
        return (error: Error) => {
            console.error(`client error: '${error.message}'`)
            this.clients.delete(uuid)

            if (this.clients.size === 0) {
                this.server_timeout(this.loggings_timeout_ms)
            }
        }
    }

    client_end(uuid: string): () => void {
        return () => {
            console.info(`client '${uuid}' disconnected`)
            this.clients.delete(uuid)

            if (this.clients.size === 0) {
                this.server_timeout(2000)
            }
        }
    }

    batch_transform_stream(): Transform {
        const MAX_BATCH = this.BATCH_MAX_SIZE
        const MAX_BATCH_TIMOUT_LIMIT_MS = this.BATCH_TIMOUT_LIMIT_MS
        const nl_code = "\n".charCodeAt(0)

        let buffer = Buffer.from("")
        let buffer_count = 0

        let batch_timeout: NodeJS.Timeout

        const batch_stream = new Transform({
            transform(chunk: Buffer, _, callback) {
                clearTimeout(batch_timeout)

                let start = 0
                let i = 0
                while (i < chunk.length) {
                    if (chunk[i] === nl_code) {
                        buffer_count++
                    }

                    if (buffer_count >= MAX_BATCH) {
                        let batch
                        if (buffer.length === 0) {
                            batch = chunk.subarray(start, i + 1)
                        } else {
                            batch = Buffer.concat([
                                buffer,
                                chunk.subarray(start, i + 1),
                            ])
                            buffer = Buffer.from("")
                        }

                        this.push(batch)
                        buffer_count = 0
                        start = i + 1
                    }

                    i++
                }

                // concat remaining chunk into buffer
                if (start < chunk.length) {
                    buffer = Buffer.concat([buffer, chunk.subarray(start)])
                }

                batch_timeout = setTimeout(() => {
                    let last_nl = -1
                    for (let i = buffer.length - 1; i >= 0; i--) {
                        if (buffer[i] === nl_code) {
                            last_nl = i
                            break
                        }
                    }
                    this.push(buffer.subarray(0, last_nl + 1))
                    buffer = buffer.subarray(last_nl + 1)
                }, MAX_BATCH_TIMOUT_LIMIT_MS)

                callback()
            },
        })

        return batch_stream
    }
}
