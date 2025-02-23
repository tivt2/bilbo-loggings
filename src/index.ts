import { Bilbo } from "./bilbo/bilbo"

const log_file = "./loggings.ndjson"

;(async () => {
    const bilbo = await Bilbo.logger(log_file)
    const bilbo2 = await Bilbo.logger(log_file)
    const bilbo3 = await Bilbo.logger(log_file)

    for (let i = 0; i < 50; i++) {
        bilbo.DEBUG("bilbo message").log()
        bilbo2.DEBUG("bilbo2 message").log()
        bilbo3.DEBUG("bilbo3 message").log()
    }

    bilbo.close()
    bilbo2.close()
    bilbo3.close()
})()
