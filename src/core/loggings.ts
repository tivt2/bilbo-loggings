import net from "node:net"
import path from "node:path"
import fs from "node:fs"
import crypto from "node:crypto"

export class Loggings {
    public unix_sock_path
    public server
    public clients: Map<string, net.Socket>

    public log_path
    public log_stream

    constructor(public unix_sock: string) {
        this.unix_sock_path = path.join("/tmp", unix_sock)

        this.log_path = path.join(__dirname, "loggings.log")
        fs.writeFileSync(this.log_path, "")
        this.log_stream = fs.createWriteStream(this.log_path, {
            flags: "a",
            encoding: "utf8",
        })

        this.clients = new Map()

        this.server = net
            .createServer()
            .on("connection", this.server_conn.bind(this))
            .on("drop", this.server_drop.bind(this))
            .on("error", this.server_err.bind(this))
            .on("close", this.server_close.bind(this))
            .listen(this.unix_sock_path, () => {
                console.info(`Loggings listening to ${this.unix_sock_path}`)
            })

        process.on("SIGINT", () => {
            this.server_cleanup()
        })
    }

    server_conn(client: net.Socket) {
        const uuid = crypto.randomUUID()
        console.info("new connection", uuid)
        this.clients.set(uuid, client)

        client.on("data", this.client_data(client))
        client.on("end", this.client_end(uuid))

        client.write("awk")
    }

    server_drop(data?: net.DropArgument) {
        console.info("connection droped")
        !data ? undefined : console.info(data)
    }

    server_err(error: Error) {
        console.error("Error:", error)
        this.server_close()
    }

    server_close(error?: Error) {
        if (error) {
            console.error("Error closing:", error)
        }
    }

    server_cleanup() {
        this.server.close()
        for (const [uuid, sock] of this.clients.entries()) {
            sock.end()
            this.clients.delete(uuid)
        }

        if (fs.existsSync(this.unix_sock_path)) {
            fs.unlinkSync(this.unix_sock_path)
        }
    }

    client_data(_: net.Socket): (data: Buffer) => void {
        let buff: Buffer = Buffer.from("")
        return (data: Buffer) => {
            let last_nl = -1
            for (let i = data.length - 1; i >= 0; i++) {
                if (data[i] === "\n".charCodeAt(0)) {
                    last_nl = i
                    break
                }
            }

            if (last_nl !== -1) {
                const message = Buffer.concat([
                    buff,
                    data.subarray(0, last_nl + 1),
                ]).toString()
                buff = Buffer.from(data.subarray(last_nl + 1))
                this.log_stream.write(message)
            } else {
                buff = Buffer.concat([buff, data])
            }
        }
    }

    client_end(uuid: string): () => void {
        return () => {
            console.info(`client '${uuid}' disconnected`)
            this.clients.delete(uuid)
        }
    }
}
