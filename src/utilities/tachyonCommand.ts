/**
 * Builds the shell command that runs Python's built-in sampling profiler (Tachyon, Python 3.15 and later).
 * This module does not import `vscode`, so it can be unit tested.
 */

export type TachyonMode = 'wall' | 'cpu' | 'gil' | 'exception';

export interface TachyonCommandOptions {
    pythonPath: string;
    outputFile: string;
    mode: TachyonMode;
    /** Sampling rate such as `1000`, `5khz` or `10k`. Tachyon's own default is used when unset. */
    rate?: string;
    subprocesses: boolean;
    allThreads: boolean;
    /** Prefix needed to call an executable in PowerShell, `& ` on Windows and empty elsewhere. */
    ampersand: string;
    file?: string;
    args?: string[];
    pid?: string;
}

const RATE_PATTERN = /^\d+(\.\d+)?(k|khz|hz)?$/i;

/**
 * Builds a `python -m profiling.sampling run|attach --collapsed` command.
 * @param options - What to profile and how.
 * @returns The command line.
 * @throws If the rate is not a number with an optional `k`, `khz` or `hz` unit.
 */
export function buildTachyonCommand(options: TachyonCommandOptions): string {
    const { pythonPath, outputFile, mode, rate, subprocesses, allThreads, ampersand, file, args, pid } = options;
    if (rate && !RATE_PATTERN.test(rate)) {
        throw new Error(`Invalid Tachyon sampling rate "${rate}". Use a number such as 1000, 5khz or 10k.`);
    }
    const quotedArgs = args ? args.map((arg) => `"${arg}"`) : [];
    return [
        `${ampersand}"${pythonPath}" -m profiling.sampling ${pid ? 'attach' : 'run'}`,
        '--collapsed',
        `-o ${outputFile}`,
        `--mode ${mode}`,
        rate ? `-r ${rate}` : '',
        allThreads ? '-a' : '',
        subprocesses ? '--subprocesses' : '',
        pid ?? '',
        file ? `"${file}"` : '',
        ...quotedArgs,
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Checks whether a Python version string (for example `3.15.1`) is new enough to have Tachyon.
 * @param version - The version string.
 * @returns True for 3.15 and newer.
 */
export function supportsTachyon(version: string): boolean {
    const match = version.trim().match(/^(\d+)\.(\d+)/);
    if (!match) return false;
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return major > 3 || (major === 3 && minor >= 15);
}
