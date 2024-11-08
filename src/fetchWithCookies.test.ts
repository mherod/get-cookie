import { fetchWithCookies } from "./fetchWithCookies";
import { expect, describe, it } from "vitest";

describe("fetchWithCookies", () => {
  it("should fetch DNS records from Google DNS API", async () => {
    const url = "https://dns.google/resolve?name=www.google.com&type=A";
    const response = await fetchWithCookies(url);
    const data = await response.json();

    // Check response properties instead of instance
    expect(response).toBeDefined();
    expect(typeof response.json).toBe('function');
    expect(typeof response.text).toBe('function');
    expect(typeof response.arrayBuffer).toBe('function');
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(data).toEqual(expect.objectContaining({
      Status: 0,
      Answer: expect.arrayContaining([
        expect.objectContaining({
          name: 'www.google.com.',
          type: 1, // A record
          TTL: expect.any(Number),
          data: expect.stringMatching(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) // IPv4 address
        })
      ])
    }));
  });
});
