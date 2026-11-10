import { expect } from 'chai';
import { buildTachyonCommand, chooseProfiler, parseSampleRate, supportsTachyon } from '../../utilities/tachyonCommand';

const base = {
    pythonPath: 'C:/py/python.exe',
    outputFile: 'profile.pyspy',
    mode: 'cpu' as const,
    subprocesses: false,
    allThreads: false,
    ampersand: '',
};

describe('buildTachyonCommand', () => {
    it('runs a file', () => {
        const cmd = buildTachyonCommand({ ...base, file: 'a.py' });
        expect(cmd).to.equal(
            '"C:/py/python.exe" -m profiling.sampling run --collapsed -o profile.pyspy --mode cpu "a.py"'
        );
    });

    it('passes module args without a file', () => {
        const cmd = buildTachyonCommand({ ...base, args: ['-m', 'pytest', 'x.py'] });
        expect(cmd).to.equal(
            '"C:/py/python.exe" -m profiling.sampling run --collapsed -o profile.pyspy --mode cpu "-m" "pytest" "x.py"'
        );
    });

    it('adds rate, threads and subprocesses flags', () => {
        const cmd = buildTachyonCommand({
            ...base,
            file: 'a.py',
            rate: '5khz',
            allThreads: true,
            subprocesses: true,
        });
        expect(cmd).to.contain('-r 5khz');
        expect(cmd).to.contain('-a');
        expect(cmd).to.contain('--subprocesses');
    });

    it('omits the rate when unset', () => {
        expect(buildTachyonCommand({ ...base, file: 'a.py' })).to.not.contain(' -r ');
    });

    it('attaches to a pid', () => {
        const cmd = buildTachyonCommand({ ...base, pid: '123', ampersand: '& ' });
        expect(cmd).to.equal(
            '& "C:/py/python.exe" -m profiling.sampling attach --collapsed -o profile.pyspy --mode cpu 123'
        );
    });

    it('rejects a rate that is not a number with an optional unit', () => {
        expect(() => buildTachyonCommand({ ...base, file: 'a.py', rate: '1; rm -rf' })).to.throw();
    });
});

describe('supportsTachyon', () => {
    it('accepts 3.15 and newer', () => {
        expect(supportsTachyon('3.15.1')).to.equal(true);
        expect(supportsTachyon('3.16.0')).to.equal(true);
    });

    it('rejects older versions and junk', () => {
        expect(supportsTachyon('3.14.4')).to.equal(false);
        expect(supportsTachyon('')).to.equal(false);
    });
});

describe('chooseProfiler', () => {
    it('keeps py-spy when selected', () => {
        expect(chooseProfiler('py-spy', true)).to.equal('py-spy');
    });

    it('picks Tachyon on auto when supported', () => {
        expect(chooseProfiler('auto', true)).to.equal('tachyon');
        expect(chooseProfiler('auto', false)).to.equal('py-spy');
    });

    it('fails when Tachyon is forced on an old interpreter', () => {
        expect(chooseProfiler('tachyon', false)).to.equal(undefined);
        expect(chooseProfiler('tachyon', true)).to.equal('tachyon');
    });
});

describe('parseSampleRate', () => {
    it('uses Tachyon default of 1khz when unset', () => {
        expect(parseSampleRate(undefined)).to.equal(1000);
        expect(parseSampleRate('')).to.equal(1000);
    });

    it('reads plain numbers and units', () => {
        expect(parseSampleRate('250')).to.equal(250);
        expect(parseSampleRate('5khz')).to.equal(5000);
        expect(parseSampleRate('10k')).to.equal(10000);
        expect(parseSampleRate('500hz')).to.equal(500);
    });

    it('falls back to the default for junk', () => {
        expect(parseSampleRate('fast')).to.equal(1000);
    });
});
