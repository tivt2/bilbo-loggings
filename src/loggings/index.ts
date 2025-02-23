import { Loggings } from "./loggings"
import { argv, exit } from "node:process"

if (!argv[2]) {
    console.error(
        "Loggings must receive unix_sock_path and log_file_path as args"
    )
    exit(1)
}

new Loggings(argv[2], 2, 1500)
