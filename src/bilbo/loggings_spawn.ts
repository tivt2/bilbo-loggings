import fs from "node:fs"
import path from "node:path"
import child_process from "node:child_process"
import { UNIX_SOCK_PATH } from "../constants"

export class LoggingsSpawner {
    private static spawn_timeout_ms: number = 1000
    static async spawn(log_file_path: string): Promise<void> {
        if (fs.existsSync(UNIX_SOCK_PATH)) {
            return
        }
        const program_path = path.join(__dirname, "../loggings/index")

        return new Promise((resolve, reject) => {
            const child = child_process.spawn(
                "node",
                [program_path, log_file_path],
                {
                    detached: true,
                    stdio: ["ignore", process.stdout, process.stderr],
                }
            )

            child.on("error", (error) => {
                console.error("Loggings error:")
                reject(error)
            })
            child.on("spawn", () => {
                console.log("Loggings created")
                setTimeout(() => {
                    let created = fs.existsSync(UNIX_SOCK_PATH)
                    while (!created) {
                        // wait for the timeout duration checking for socket creation
                    }
                    if (created) {
                        resolve(undefined)
                    } else {
                        reject(
                            new Error(
                                `Failed to spawn Loggings in ${this.spawn_timeout_ms} ms`
                            )
                        )
                    }
                }, this.spawn_timeout_ms)
            })
        })
    }
}
