const API_URL =
  "https://script.google.com/macros/s/AKfycbzAiJtSwFsqBZCR3qQeJha4Z-jRarBMQN6hY529Pd5aL3R2U_FpF60ASul5FQEbZt2l/exec";


export async function apiGet<T>(
  params: Record<string, string>
): Promise<T> {
  const url = new URL(API_URL);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}