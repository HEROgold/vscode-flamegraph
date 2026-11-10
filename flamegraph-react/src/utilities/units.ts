let samplesPerSecond = 100;

/**
 * Sets the sampling rate used to convert samples to seconds. py-spy samples at 100 per second by default, Tachyon at
 * 1000.
 * @param rate - Samples per second.
 */
export function setSamplesPerSecond(rate: number) {
    samplesPerSecond = rate;
}

/**
 * Converts a number of samples to a unit string.
 * @param samples - The number of samples.
 * @param profileType - The type of profile.
 * @returns The unit string.
 */
export function toUnitString(samples: number, profileType: 'py-spy' | 'memray'): string {
    if (profileType === 'memray') {
        // convert bits to B, MB, GB, TB
        const units = ['B', 'kB', 'MB', 'GB', 'TB'];
        let index = 0;
        let value = samples;
        while (value >= 1024 && index < units.length - 1) {
            value /= 1024;
            index += 1;
        }
        return `${value % 1 === 0 ? Math.floor(value) : value.toFixed(1)}${units[index]}`;
    }
    return `${samples / samplesPerSecond}s`;
}
