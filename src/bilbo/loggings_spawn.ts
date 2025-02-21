import fs from "node:fs"
import path from "node:path"
import child_process from "node:child_process"

export class LoggingsSpawner {
    static async spawn(
        unix_sock_path: string,
        log_file_path: string
    ): Promise<boolean> {
        if (fs.existsSync(unix_sock_path)) {
            return true
        }
        console.log("loggings not running")

        // temporary to test with ts-node
        const ts_node_path = path.join(
            __dirname,
            "../../node_modules/.bin/ts-node"
        )
        const program_path = path.join(__dirname, "../loggings/index.ts")
        //

        return new Promise((resolve) => {
            const child = child_process.spawn(
                ts_node_path,
                [program_path, unix_sock_path, log_file_path],
                {
                    detached: true,
                    stdio: ["ignore", process.stdout, process.stdout],
                }
            )

            child.on("error", (error) => {
                console.error("Failed to spawn loggings")
                throw error
            })
            child.on("spawn", () => {
                console.log("spawned")
                resolve(true)
            })
        })
    }
}
