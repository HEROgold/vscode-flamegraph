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

export type ProfilerSetting = 'py-spy' | 'tachyon' | 'auto';

/**
 * Picks the profiler for the `flamegraph.profiler` setting.
 * @param setting - The value of the setting.
 * @param tachyonSupported - Whether the selected interpreter is Python 3.15 or newer.
 * @returns The profiler to use, or undefined when Tachyon was requested but is not supported.
 */
export function chooseProfiler(setting: ProfilerSetting, tachyonSupported: boolean): 'py-spy' | 'tachyon' | undefined {
    if (setting === 'py-spy') return 'py-spy';
    if (setting === 'tachyon') return tachyonSupported ? 'tachyon' : undefined;
    return tachyonSupported ? 'tachyon' : 'py-spy';
}

/** Tachyon's default sampling rate in samples per second. */
export const TACHYON_DEFAULT_RATE = 1000;

/**
 * Converts a Tachyon rate such as `5khz`, `10k` or `250` to samples per second.
 * @param rate - The rate as typed in the `flamegraph.tachyon.rate` setting.
 * @returns Samples per second. Tachyon's default of 1000 is used for an empty or invalid rate.
 */
export function parseSampleRate(rate: string | undefined): number {
    const match = rate?.trim().match(RATE_PATTERN);
    if (!match) return TACHYON_DEFAULT_RATE;
    const value = parseFloat(rate!);
    return match[2] && match[2].toLowerCase().startsWith('k') ? value * 1000 : value;
}
