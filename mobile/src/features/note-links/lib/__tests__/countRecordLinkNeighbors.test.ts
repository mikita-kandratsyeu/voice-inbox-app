import { countRecordLinkNeighbors } from '../countRecordLinkNeighbors';

describe('countRecordLinkNeighbors', () => {
  it('counts outgoing and incoming links without duplicates', () => {
    const records = [
      { id: 'main', linkedRecordIds: ['a', 'b'] },
      { id: 'a', linkedRecordIds: ['main'] },
      { id: 'b', linkedRecordIds: [] },
      { id: 'c', linkedRecordIds: ['main'] },
    ];

    expect(countRecordLinkNeighbors('main', ['a', 'b'], records)).toBe(3);
  });

  it('returns zero when there are no links', () => {
    expect(countRecordLinkNeighbors('solo', [], [{ id: 'solo', linkedRecordIds: [] }])).toBe(0);
  });
});
