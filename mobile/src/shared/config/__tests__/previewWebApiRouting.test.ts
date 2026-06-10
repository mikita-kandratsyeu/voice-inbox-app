import {
  parseAppVersionMajor,
  parseBuildNumber,
  PREVIEW_WEB_API_MIN_BUILD_NUMBER,
  PREVIEW_WEB_API_MIN_MAJOR_VERSION,
  shouldUsePreviewWebApi,
} from '../previewWebApiRouting';

describe('previewWebApiRouting', () => {
  it('parses semver major', () => {
    expect(parseAppVersionMajor('2.0.0')).toBe(2);
    expect(parseAppVersionMajor('1.9.9')).toBe(1);
    expect(parseAppVersionMajor('')).toBeNull();
  });

  it('parses build numbers', () => {
    expect(parseBuildNumber('300')).toBe(300);
    expect(parseBuildNumber('301')).toBe(301);
    expect(parseBuildNumber('')).toBeNull();
  });

  it('routes v2+ with build 300+ to preview', () => {
    expect(shouldUsePreviewWebApi('2.0.0', '300')).toBe(true);
    expect(shouldUsePreviewWebApi('2.0.0', '301')).toBe(true);
    expect(shouldUsePreviewWebApi('3.1.0', '300')).toBe(true);
  });

  it('keeps older builds on production WEB_API_URL', () => {
    expect(shouldUsePreviewWebApi('2.0.0', '299')).toBe(false);
    expect(shouldUsePreviewWebApi('1.9.9', '400')).toBe(false);
    expect(shouldUsePreviewWebApi('', '')).toBe(false);
  });

  it('documents temporary routing thresholds', () => {
    expect(PREVIEW_WEB_API_MIN_MAJOR_VERSION).toBe(2);
    expect(PREVIEW_WEB_API_MIN_BUILD_NUMBER).toBe(300);
  });
});
