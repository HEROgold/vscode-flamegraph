/**
 * Helpers for the output of `python -m profiling.sampling run --collapsed` (Python 3.15 and later).
 *
 * A row looks like `tid:<id>;<file>:<function>:<line>;<file>:<function>:<line> <samples>`.
 * Rows are converted to the py-spy row format, `<function> (<file>:<line>);... <samples>`, which the rest of the
 * extension already parses.
 */

const TACHYON_ROW = /^tid:\d+;/;
const TACHYON_FRAME = /^(.*):([^:]+):(\d+)$/;

/**
 * Checks whether a row of profile data is in the Tachyon collapsed format.
 * @param row - The first row of the profile data.
 * @returns True if the row starts with a thread prefix.
 */
export function isTachyonProfile(row: string): boolean {
    return TACHYON_ROW.test(row);
}

/**
 * Converts a Tachyon collapsed row to a py-spy row. The thread prefix is dropped, so all threads merge into one
 * tree. Leading `<frozen ...>` frames are removed. Deeper ones keep only their function name, because they have
 * no file to open.
 * @param row - A row in the Tachyon collapsed format.
 * @returns The row in py-spy format, or undefined if the row is malformed.
 */
export function tachyonRowToPyspyRow(row: string): string | undefined {
    const lastSpace = row.lastIndexOf(' ');
    if (lastSpace === -1 || !TACHYON_ROW.test(row)) return undefined;
    const samples = row.substring(lastSpace + 1);
    const frames = row.substring(0, lastSpace).split(';').slice(1);

    const converted: string[] = [];
    for (const frame of frames) {
        const match = frame.match(TACHYON_FRAME);
        if (!match) return undefined;
        const [, file, functionName, line] = match;
        if (file.startsWith('<frozen')) {
            if (converted.length > 0) converted.push(functionName);
            continue;
        }
        converted.push(`${functionName} (${file}:${line})`);
    }
    if (converted.length === 0) return undefined;
    return `${converted.join(';')} ${samples}`;
}
