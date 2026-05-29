import { splitTrailingEllipsis } from '../splitTrailingEllipsis';

describe('splitTrailingEllipsis', () => {
  it('splits unicode ellipsis', () => {
    expect(splitTrailingEllipsis('Ответ генерируется…')).toEqual({
      base: 'Ответ генерируется',
      hasEllipsis: true,
    });
  });

  it('splits ascii ellipsis', () => {
    expect(splitTrailingEllipsis('Generating summary...')).toEqual({
      base: 'Generating summary',
      hasEllipsis: true,
    });
  });

  it('leaves titles without ellipsis unchanged', () => {
    expect(splitTrailingEllipsis('Loading model')).toEqual({
      base: 'Loading model',
      hasEllipsis: false,
    });
  });
});
