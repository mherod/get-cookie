import {
  setupChromeTest,
  mockCookieData,
  mockPassword,
  getEncryptedChromeCookie,
  decrypt
} from '../testSetup';

describe('ChromeCookieQueryStrategy - Edge Cases', () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it('should handle non-buffer cookie values', async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: 'non-buffer-value'
    };
    jest.mocked(getEncryptedChromeCookie).mockResolvedValue([nonBufferCookie]);

    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(decrypt).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe('decrypted-value');
  });
});
