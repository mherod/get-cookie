import { getCookie } from "@mherod/get-cookie";

// Cookie values are credentials, so report only whether a readable match exists.
async function main(): Promise<void> {
  const cookies = await getCookie({
    name: "session_token",
    domain: "app.example.com",
  });

  if (cookies.length === 0) {
    console.log("No readable matching cookies were found.");
    return;
  }

  console.log(`Found ${cookies.length} matching cookie(s).`);
}

void main().catch(() => {
  console.error("Cookie lookup failed.");
  process.exitCode = 1;
});
