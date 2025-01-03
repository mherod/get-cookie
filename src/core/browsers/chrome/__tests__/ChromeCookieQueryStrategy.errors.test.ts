import {
  setupChromeTest,
  mockCookieData,
  mockCookieFile,
  getEncryptedChromeCookie,
  decrypt
} from '../testSetup';

describe('ChromeCookieQueryStrategy - Error Handling', () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it('should handle decryption failures gracefully', async () => {
    jest.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: mockCookieData.value.toString('utf-8'),
      domain: mockCookieData.domain,
      meta: {
        file: mockCookieFile,
        browser: 'Chrome',
        decrypted: false
      }
    });
  });

  it('should handle cookie retrieval errors gracefully', async () => {
    jest.mocked(getEncryptedChromeCookie).mockRejectedValue(new Error('Failed to get cookies'));

    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(cookies).toEqual([]);
  });
});
