import {
  getGraphLayoutSaveBarBottom,
  getGraphLayoutSaveDockButtonStyle,
  getGraphLayoutSaveDockStyle,
  GRAPH_LAYOUT_SAVE_BUTTON_SIZE,
  GRAPH_LAYOUT_SAVE_CORNER_COLUMN_WIDTH,
  GRAPH_LAYOUT_SAVE_DOCK_HEIGHT,
  GRAPH_LAYOUT_SAVE_GRAPH_CONTROL_SIZE,
  GRAPH_LAYOUT_SAVE_SIDE_GUTTER,
  type GraphLayoutSaveBarColors,
} from '../graphLayoutSaveBarMetrics';

const color: GraphLayoutSaveBarColors = {
  background: { primary: '#1a1a1a' },
  text: { primary: '#e5e5e5' },
  border: { default: '#2e2e2e' },
  accent: { primary: '#3b82f6' },
  shadow: { color: '#000000', opacity: 0.06 },
};

describe('graphLayoutSaveBarMetrics', () => {
  it('positions the dock above the safe area with the graph control gutter', () => {
    expect(getGraphLayoutSaveBarBottom(0)).toBe(GRAPH_LAYOUT_SAVE_SIDE_GUTTER);
    expect(getGraphLayoutSaveBarBottom(34)).toBe(34 + GRAPH_LAYOUT_SAVE_SIDE_GUTTER);
  });

  it('reserves horizontal space for corner zoom/info controls', () => {
    expect(GRAPH_LAYOUT_SAVE_CORNER_COLUMN_WIDTH).toBe(
      GRAPH_LAYOUT_SAVE_GRAPH_CONTROL_SIZE + GRAPH_LAYOUT_SAVE_SIDE_GUTTER,
    );
  });

  it('defines inner layout for the frosted save dock', () => {
    const dock = getGraphLayoutSaveDockStyle();

    expect(dock.flexDirection).toBe('row');
    expect(dock.height).toBe(GRAPH_LAYOUT_SAVE_DOCK_HEIGHT);
    expect(dock.backgroundColor).toBeUndefined();
    expect(dock.borderWidth).toBeUndefined();
  });

  it('styles discard as a subtle icon chip and save as primary', () => {
    const discard = getGraphLayoutSaveDockButtonStyle(color, 'discard', true);
    const save = getGraphLayoutSaveDockButtonStyle(color, 'save');

    expect(discard.width).toBe(GRAPH_LAYOUT_SAVE_BUTTON_SIZE);
    expect(discard.height).toBe(GRAPH_LAYOUT_SAVE_BUTTON_SIZE);
    expect(save.backgroundColor).toBe(color.accent.primary);
    expect(discard.backgroundColor).not.toBe(color.accent.primary);
  });
});
