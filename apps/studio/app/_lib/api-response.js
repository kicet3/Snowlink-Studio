function invalidResponse(response) {
  const unavailable = [502, 503, 504].includes(response.status);
  return Object.assign(new Error(unavailable
    ? '서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
    : '서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.'), {
    status: response.status,
    code: unavailable ? 'API_UNAVAILABLE' : 'INVALID_API_RESPONSE',
  });
}

export async function readApiResponse(response) {
  if (response.status === 204) return null;
  const type = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() || '';
  if (type !== 'application/json' && !/^application\/[\w.+-]+\+json$/.test(type)) {
    throw invalidResponse(response);
  }
  let data;
  try { data = await response.json(); }
  catch { throw invalidResponse(response); }
  if (!response.ok) {
    if ([502, 503, 504].includes(response.status) && data?.code === 'API_UNAVAILABLE') {
      throw invalidResponse(response);
    }
    throw Object.assign(new Error(typeof data?.error === 'string' ? data.error
      : data?.error?.message || `요청을 완료하지 못했습니다 (${response.status}).`), { status: response.status, code: data?.code });
  }
  return data;
}
