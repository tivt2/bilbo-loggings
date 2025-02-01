export function dummy_logger_file_name(infix: string, id: number): string {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()
    return `bilbo-${infix}-${year}-${month}-${day}-${id}.log`
}
