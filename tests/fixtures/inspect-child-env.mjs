// Synthetic-only child fixture. It reports environment names/values supplied
// by the test harness and never reads credentials or contacts a target.
process.stdout.write(JSON.stringify(process.env));
