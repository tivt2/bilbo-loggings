export function create_file_regex(infix: string): RegExp {
    return new RegExp(
        `bilbo-${infix}-(\\d{4})-(\\d{1,2})-(\\d{1,2})-(\\d{1,3}).log`
    )
}
