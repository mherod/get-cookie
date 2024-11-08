/**
 * Class to build a User-Agent string.
 */
export class UserAgentBuilder {
  private platform: string;
  private engine: string;
  private browser: string;
  private layout: string;

  /**
   * Constructs a UserAgentBuilder instance.
   * @param platform - The platform information.
   * @param engine - The engine information.
   * @param browser - The browser information.
   * @param layout - The layout information.
   */
  constructor(
    platform: string = "Macintosh; Intel Mac OS X 10_15_7",
    engine: string = "AppleWebKit/537.36 (KHTML, like Gecko)",
    browser: string = "Chrome/118.0.0.0",
    layout: string = "Safari/537.36",
  ) {
    this.platform = platform;
    this.engine = engine;
    this.browser = browser;
    this.layout = layout;
  }

  /**
   * Builds the User-Agent string.
   * @returns The User-Agent string.
   */
  build(): string {
    return `${this.platform} ${this.engine} ${this.browser} ${this.layout}`;
  }
} 