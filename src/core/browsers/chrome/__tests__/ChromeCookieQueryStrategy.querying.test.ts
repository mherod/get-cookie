import { getEncryptedChromeCookie } from '../../getEncryptedChromeCookie';
import { listChromeProfilePaths } from '../../listChromeProfiles';
import { ChromeCookieQueryStrategy } from '../ChromeCookieQueryStrategy';
import { decrypt } from '../decrypt';
import { getChromePassword } from '../getChromePassword';

// Mock dependencies
jest.mock('../../listChromeProfiles');
jest.mock('../../getEncryptedChromeCookie');
jest.mock('../getChromePassword');
jest.mock('../decrypt');

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

describe('ChromeCookieQueryStrategy - Cookie Querying', () => {
  let strategy: ChromeCookieQueryStrategy;
  const mockPassword = 'test-password';
  const mockCookieFile = '/path/to/Cookies';
  const mockCookieData = {
    name: 'test-cookie',
    value: Buffer.from('encrypted-value'),
    domain: 'example.com',
    expiry: Date.now() + 86400000 // 1 day in the future
  };

  beforeEach(() => {
    strategy = new ChromeCookieQueryStrategy();
    Object.defineProperty(process, 'platform', {
      value: 'darwin'
    });

    // Setup mocks
    (listChromeProfilePaths as jest.Mock).mockReturnValue([mockCookieFile]);
    ((getChromePassword as unknown) as jest.Mock).mockResolvedValue(mockPassword);
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([mockCookieData]);
    (decrypt as jest.Mock).mockResolvedValue('decrypted-value');

    jest.clearAllMocks();
  });

  it('should query and decrypt cookies successfully', async () => {
    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(listChromeProfilePaths).toHaveBeenCalled();
    expect(getChromePassword).toHaveBeenCalled();
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

  it('should handle decryption failures gracefully', async () => {
    (decrypt as jest.Mock).mockRejectedValue(new Error('Decryption failed'));

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

  it('should handle non-buffer cookie values', async () => {
    const nonBufferCookie = {
      ...mockCookieData,
      value: 'non-buffer-value'
    };
    (getEncryptedChromeCookie as jest.Mock).mockResolvedValue([nonBufferCookie]);

    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(decrypt).toHaveBeenCalledWith(expect.any(Buffer), mockPassword);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe('decrypted-value');
  });

  it('should handle cookie retrieval errors gracefully', async () => {
    (getEncryptedChromeCookie as jest.Mock).mockRejectedValue(new Error('Failed to get cookies'));

    const cookies = await strategy.queryCookies('test-cookie', 'example.com');

    expect(cookies).toEqual([]);
  });
});
