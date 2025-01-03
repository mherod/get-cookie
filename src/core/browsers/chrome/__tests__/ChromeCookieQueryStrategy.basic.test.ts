import { ChromeCookieQueryStrategy } from '../ChromeCookieQueryStrategy';

// Mock the logger
jest.mock('@utils/logger', () => ({
  __esModule: true,
  default: {
    withTag: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  }
}));

describe('ChromeCookieQueryStrategy - Basic', () => {
  let strategy: ChromeCookieQueryStrategy;
  const originalPlatform = process.platform;

  beforeEach(() => {
    strategy = new ChromeCookieQueryStrategy();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
  });

  it('should return "Chrome" as the browser name', () => {
    expect(strategy.browserName).toBe('Chrome');
  });

  it('should return empty array for non-darwin platforms', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32'
    });

    const cookies = await strategy.queryCookies('test', 'example.com');
    expect(cookies).toEqual([]);
  });
});
