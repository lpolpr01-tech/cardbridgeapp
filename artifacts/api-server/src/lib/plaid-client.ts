import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function resolvePlaidEnv(): string {
  const env = (process.env["PLAID_ENV"] ?? "sandbox") as keyof typeof PlaidEnvironments;
  return PlaidEnvironments[env] ?? PlaidEnvironments.sandbox;
}

let _client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi | null {
  const clientId = process.env["PLAID_CLIENT_ID"];
  const secret =
    process.env["PLAID_SANDBOX_SECRET"] ?? process.env["PLAID_SECRET"];
  if (!clientId || !secret) return null;

  if (!_client) {
    const configuration = new Configuration({
      basePath: resolvePlaidEnv(),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
        },
      },
    });
    _client = new PlaidApi(configuration);
  }
  return _client;
}
