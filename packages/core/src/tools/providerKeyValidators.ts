export function validateKey(
  provider: string,
  key: string,
  signal?: AbortSignal,
): Promise<boolean> {
  switch (provider) {
    case "openai":
      return validateKey_openai(key, signal);
    case "groq":
      return validateKey_groq(key, signal);
    case "anthropic":
      return validateKey_anthropic(key, signal);
    case "deepseek":
      return validateKey_deepseek(key, signal);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function validateKey_openaiLikeApi(
  url: string,
  key: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(url + "/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal,
    });

    return res.ok;
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("Fetch aborted");
    } else {
      console.error("Fetch error:", err);
    }

    return false;
  }
}

async function validateKey_openai(
  key: string,
  signal?: AbortSignal,
): Promise<boolean> {
  return validateKey_openaiLikeApi("https://api.openai.com/v1", key, signal);
}

async function validateKey_groq(
  key: string,
  signal?: AbortSignal,
): Promise<boolean> {
  return validateKey_openaiLikeApi(
    "https://api.groq.com/openai/v1",
    key,
    signal,
  );
}

async function validateKey_anthropic(
  key: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        "anthropic-dangerous-direct-browser-access": "true",
      }),
      signal
    });

    if (res.status !== 401) {
      return true;
    }

    return false;
  } catch (_) {
    return false;
  }
}

async function validateKey_deepseek(
  key: string,
  signal?: AbortSignal,
): Promise<boolean> {
  return validateKey_openaiLikeApi("https://api.deepseek.com/v1", key, signal);
}
