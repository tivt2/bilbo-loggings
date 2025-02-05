export function create_file_regex(infix: string): RegExp {
    return new RegExp(
        `bilbo-${infix}-(\\d{4})-(\\d{1,2})-(\\d{1,2})-(\\d{1,3}).log`
    )
}

export type Color = {
    r: number
    g: number
    b: number
}

const ansi_color_seq = [231, 6, 2, 3, 9, 1, 5]
export function ansi_text(text: string, bg_id: number): string {
    const bg = `\x1b[48;5;${ansi_color_seq[bg_id % ansi_color_seq.length]}m`
    const fg = `\x1b[38;5;0m`
    return `${bg}${fg}${text}\x1b[m`
}
