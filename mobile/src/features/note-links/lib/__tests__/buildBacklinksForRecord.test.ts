import { buildBacklinkRecordIds } from '../buildBacklinksForRecord';

describe('buildBacklinkRecordIds', () => {
  it('finds records that link to the target', () => {
    const backlinks = buildBacklinkRecordIds('target', [
      { id: 'a', linkedRecordIds: ['target', 'other'] },
      { id: 'b', linkedRecordIds: ['other'] },
      { id: 'target', linkedRecordIds: ['a'] },
    ]);

    expect(backlinks).toEqual(['a']);
  });
});
