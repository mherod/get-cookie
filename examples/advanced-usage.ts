import { batchGetCookiesWithResults, getCookie } from "../src/index";

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

  const results = await batchGetCookiesWithResults(
    [
      { name: "session_token", domain },
      { name: "csrf_token", domain },
    ],
    {
      concurrency: 2,
      continueOnError: true,
    },
  );

  for (const result of results) {
    const label = `Cookie ${result.spec.name}`;
    if (result.error) {
      console.log(`${label}: query failed`);
      continue;
    }
    report(label, result.cookies.length);
  }
}

void runAdvancedExamples().catch(() => {
  console.error("Advanced cookie lookup failed.");
  process.exitCode = 1;
});
