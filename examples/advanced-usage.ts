import { batchGetCookies, getCookie } from "../src/index";

const domain = "app.example.com";

function report(label: string, count: number): void {
  if (count === 0) {
    console.log(`${label}: no readable matches`);
    return;
  }

  console.log(`${label}: ${count} matching cookie(s)`);
}

export async function runAdvancedExamples(): Promise<void> {
  // SQL-backed browsers use "%" for a name wildcard.
  const allForDomain = await getCookie({
    name: "%",
    domain,
  });
  report("All cookies for the placeholder domain", allForDomain.length);

  const knownCookies = await batchGetCookies(
    [
      { name: "session_token", domain },
      { name: "csrf_token", domain },
    ],
    {
      concurrency: 2,
      continueOnError: true,
    },
  );
  report("Known session and CSRF cookies", knownCookies.length);
}

void runAdvancedExamples().catch(() => {
  console.error("Advanced cookie lookup failed.");
  process.exitCode = 1;
});
