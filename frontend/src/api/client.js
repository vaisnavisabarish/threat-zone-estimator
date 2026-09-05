const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function validationMessage(detail) {
  if (!Array.isArray(detail)) return null;
  return detail.map((item) => {
    const location = Array.isArray(item.loc) ? item.loc.filter((part) => part !== 'body').join('.') : '';
    return `${location ? `${location}: ` : ''}${item.msg ?? 'Invalid value'}`;
  }).join('; ');
}

async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new ApiError(`Network error while contacting the API: ${networkError.message}`, 0, networkError);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON errors are reported below using the HTTP status.
  }

  if (!response.ok) {
    const message = validationMessage(body?.detail)
      ?? (typeof body?.detail === 'string' ? body.detail : null)
      ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body?.detail ?? body);
  }

  return body;
}

export async function postEstimate(payload) {
  return postJson(`${API_BASE_URL}/api/v1/estimate`, payload);
}

export async function postPostBlast(payload) {
  return postJson(`${API_BASE_URL}/api/v1/post-blast`, payload);
}
