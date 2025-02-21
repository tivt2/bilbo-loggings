import { Bilbo } from "./bilbo/bilbo"

const unix_sock = "/tmp/bilbo-loggings.sock"
const log_file = "./loggings.ndjson"

;(async () => {
    const bilbo = Bilbo.logger(unix_sock, log_file)
    const bilbo2 = Bilbo.logger(unix_sock, log_file)
    const bilbo3 = Bilbo.logger(unix_sock, log_file)

    for (let i = 0; i < 2; i++) {
        bilbo.DEBUG("bilbo message").log()
        bilbo2.DEBUG("bilbo2 message").log()
        bilbo3.DEBUG("bilbo3 message").log()
    }

    bilbo.close()
    bilbo2.close()
    bilbo3.close()
})()
