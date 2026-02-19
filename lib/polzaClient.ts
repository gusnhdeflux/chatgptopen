export const POLZA_BASE_URL = 'https://api.polza.ai/api/v1';

export function getPolzaApiKey() {
  const key = process.env.POLZA_API_KEY;

  if (!key) {
    throw new Error('POLZA_API_KEY is required');
  }

  return key;
}

export async function polzaChatCompletion(payload: Record<string, unknown>) {
  const response = await fetch(`${POLZA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getPolzaApiKey()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Polza request failed (${response.status}): ${text}`);
  }

  return response;
}
