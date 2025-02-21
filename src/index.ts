import { Bilbo } from "./core/bilbo"
import { Loggings } from "./core/loggings"

const unix_sock = "bilbo-loggings.sock"

if (process.argv[2] === "bilbo") {
    const bilbo = new Bilbo(unix_sock)

    for (let i = 0; i < 500; i++) {
        bilbo.log({ id: process.argv[3] })
    }

    bilbo.server.then((server) => {
        server.end()
    })
} else if (process.argv[2] === "loggings") {
    new Loggings(unix_sock)
} else {
    console.info(`invalid mode ${process.argv[2]}`)
}
