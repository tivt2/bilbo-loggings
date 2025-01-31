import fs from "fs"
import path from "path"

export class RotateFolder {
    constructor(public folder_path: string) {
        this.folder_path = path.normalize(this.folder_path)

        if (!fs.existsSync(this.folder_path)) {
            fs.mkdirSync(this.folder_path, { recursive: true })
        }
    }
}
