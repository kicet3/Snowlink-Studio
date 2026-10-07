export function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export function authorize(req, allowedOrigins) {
  const host = req.headers.host;
  const allowed = allowedOrigins.filter(origin => new URL(origin).host === host);
  if (!allowed.length) throw Object.assign(new Error('허용되지 않은 접속 주소입니다.'), { status: 403 });
  if (req.headers.origin && !allowed.includes(req.headers.origin)) {
    throw Object.assign(new Error('허용되지 않은 요청 출처입니다.'), { status: 403 });
  }
  if (req.headers['sec-fetch-site'] === 'cross-site' && !['GET', 'HEAD'].includes(req.method)) {
    throw Object.assign(new Error('외부 사이트의 변경 요청은 허용하지 않습니다.'), { status: 403 });
  }
}

export async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw Object.assign(new Error('JSON 요청이 필요합니다.'), { status: 415 });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 9 * 1024 * 1024) throw Object.assign(new Error('파일은 6MB 이하로 업로드해주세요.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('JSON 형식을 확인해주세요.'), { status: 400 }); }
}

export function failure(res, error) {
  if (res.headersSent) return res.destroy();
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  json(res, status, { error: status >= 500 && !error.status ? '서버 작업에 실패했습니다. 로그를 확인해주세요.' : error.message });
}
