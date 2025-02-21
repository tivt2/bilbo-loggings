import path from "node:path"
import net from "node:net"

type LoggerMandatory = {
    level: string
    message: string
    at: number
}

type UserFields = Record<string, any>
type LoggerFields = LoggerMandatory & UserFields

export class Bilbo<
    U extends UserFields,
    F extends LoggerFields = U & LoggerMandatory,
> {
    public server: Promise<net.Socket>

    public unix_sock_path
    constructor(public unix_sock: string) {
        this.unix_sock_path = path.join("/tmp", this.unix_sock)

        this.server = new Promise((resolve, reject) => {
            const server = net
                .connect(this.unix_sock_path)
                .on("ready", () => {
                    console.log("logger connected")
                    console.log("----------------\n")
                })
                .on("data", (data: Buffer) => {
                    if (data.toString() === "awk") {
                        resolve(server)
                    }
                    reject(data)
                })
                .on("error", (error) => {
                    console.error("Error:", error)
                    server.end()
                    reject(error)
                })
                .on("end", () => {
                    console.log("bilbo disconnected")
                })
        })
    }

    async log(log: U, print: boolean = false): Promise<void> {
        const data = {
            ...log,
            level: "DEBUG",
            message: "foo",
            at: Date.now(),
        } as F

        !print ? undefined : console.log(data)
        ;(await this.server).write(JSON.stringify(data) + "\n")
    }
}
