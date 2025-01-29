import fs from "fs"
import path from "path"

export class RotateFolder {
    public rotate_file_regex: RegExp

    constructor(public folder_path: string) {
        this.folder_path = path.normalize(this.folder_path)
    }

    create_folder(): void {
        if (!fs.existsSync(this.folder_path)) {
            fs.mkdirSync(this.folder_path, { recursive: true })
        }
    }
}
