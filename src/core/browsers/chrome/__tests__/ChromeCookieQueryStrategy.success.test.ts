import {
  setupChromeTest,
  mockCookieData,
  mockCookieFile,
  mockPassword,
  getEncryptedChromeCookie,
  listChromeProfilePaths,
  decrypt,
  chromePassword
} from '../testSetup';

describe('ChromeCookieQueryStrategy - Successful Querying', () => {
  let strategy: ReturnType<typeof setupChromeTest>;

  beforeEach(() => {
    strategy = setupChromeTest();
  });

  it('should query and decrypt cookies successfully', async () => {
    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(listChromeProfilePaths).toHaveBeenCalled();
    expect(chromePassword.getChromePassword).toHaveBeenCalled();
    expect(getEncryptedChromeCookie).toHaveBeenCalledWith({
      name: 'test-cookie',
      domain: 'example.com',
      file: mockCookieFile
    });
    expect(decrypt).toHaveBeenCalledWith(mockCookieData.value, mockPassword);

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: mockCookieData.name,
      value: 'decrypted-value',
      domain: mockCookieData.domain,
      meta: {
        file: mockCookieFile,
        browser: 'Chrome',
        decrypted: true
      }
    });
  });
});
