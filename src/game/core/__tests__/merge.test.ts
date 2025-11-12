import { slideAndMerge } from '..';

describe('slideAndMerge', () => {
  it('compacts and merges with single-merge-per-tile', () => {
    expect(slideAndMerge([2,0,2,2])).toEqual({ row: [4,2,0,0], gainedScore: 4 });
    expect(slideAndMerge([4,4,8,8])).toEqual({ row: [8,16,0,0], gainedScore: 24 });
    expect(slideAndMerge([2,2,2,2])).toEqual({ row: [4,4,0,0], gainedScore: 8 });
    expect(slideAndMerge([0,0,0,2])).toEqual({ row: [2,0,0,0], gainedScore: 0 });
    expect(slideAndMerge([2,0,2,4])).toEqual({ row: [4,4,0,0], gainedScore: 4 });
  });
});
