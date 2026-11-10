import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { Flamegraph } from '../../flamegraph';
import { isTachyonProfile, tachyonRowToPyspyRow } from '../../utilities/tachyon';

const FIXTURES_DIR = path.resolve(__dirname, '../../../src/test/fixtures');

describe('Tachyon collapsed output', () => {
    describe('isTachyonProfile', () => {
        it('detects the tid: prefix', () => {
            expect(isTachyonProfile('tid:1;a.py:f:3 5')).to.equal(true);
        });

        it('does not detect py-spy rows', () => {
            expect(isTachyonProfile('main.py (main.py:1) 1')).to.equal(false);
        });
    });

    describe('tachyonRowToPyspyRow', () => {
        it('drops the thread prefix and rewrites frames', () => {
            const row = tachyonRowToPyspyRow('tid:7;a.py:outer:9;a.py:inner:5 12');
            expect(row).to.equal('outer (a.py:9);inner (a.py:5) 12');
        });

        it('parses Windows paths that contain a colon', () => {
            const row = tachyonRowToPyspyRow('tid:7;C:\\proj\\a.py:f:4 3');
            expect(row).to.equal('f (C:\\proj\\a.py:4) 3');
        });

        it('strips leading <frozen> frames', () => {
            const row = tachyonRowToPyspyRow('tid:7;<frozen runpy>:_run_code:87;a.py:<module>:1 2');
            expect(row).to.equal('<module> (a.py:1) 2');
        });

        it('keeps deeper <frozen> frames without a file', () => {
            const row = tachyonRowToPyspyRow('tid:7;a.py:f:1;<frozen importlib._bootstrap>:_load:5;b.py:g:2 2');
            expect(row).to.equal('f (a.py:1);_load;g (b.py:2) 2');
        });

        it('returns undefined for a malformed row', () => {
            expect(tachyonRowToPyspyRow('garbage')).to.equal(undefined);
        });
    });

    describe('Flamegraph', () => {
        it('merges threads into one tree', () => {
            const data = 'tid:1;a.py:f:1 2\ntid:2;a.py:f:1 3';
            const fg = new Flamegraph(data);
            expect(fg.profileType).to.equal('tachyon');
            expect(fg.root.samples).to.equal(5);
            expect(fg.root.children.length).to.equal(1);
        });

        it('assigns line-level samples from the fixture', () => {
            const data = fs.readFileSync(path.join(FIXTURES_DIR, 'tachyon-collapsed.txt'), 'utf-8');
            const fg = new Flamegraph(data);
            const lines = fg.getFileProfile('tachyon_sample.py');
            expect(lines).to.exist;
            const byLine = new Map(lines!.map((l) => [l.line, l.nodes.reduce((s, n) => s + n.ownSamples, 0)]));
            expect(byLine.get(5)).to.equal(642);
            expect(byLine.get(4)).to.equal(150);
        });
    });
});
