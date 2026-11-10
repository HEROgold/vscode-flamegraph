import { expect } from 'chai';
import { buildTachyonCommand, supportsTachyon } from '../../utilities/tachyonCommand';

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
