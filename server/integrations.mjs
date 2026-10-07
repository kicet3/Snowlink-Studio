import http from 'node:http';
import { json } from './http.mjs';

const RULES = {
  ima2: {
    GET: /^\/(?:api\/[\w/.-]+|generated\/(?:[^/]+\/)*[^/]+)$/,
    POST: /^\/api\/[\w/.-]+$/,
    PUT: /^\/api\/[\w/.-]+$/,
    PATCH: /^\/api\/[\w/.-]+$/,
    DELETE: /^\/api\/[\w/.-]+$/,
  },
  trends: {
    GET: /^\/api\/(?:categories|videos|trends|reels|tiktok|x|threads|ai|date|analysis|img|saved)$/,
    POST: /^\/api\/(?:saved|(?:reels|tiktok|x|threads)\/accounts)$/,
  },
};
const RESPONSE_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag', 'retry-after', 'x-ima2-event-cursor'];

// A same-origin, streaming API boundary; upstream UI and arbitrary URLs are excluded.
export function handleIntegration(req, res, url, config) {
  const match = /^\/integrations\/(ima2|trends)(\/.*)$/.exec(url.pathname);
  if (!url.pathname.startsWith('/integrations/')) return false;
  if (!match || !RULES[match[1]][req.method]?.test(match[2]) || /%2f|%5c|%2e/i.test(match[2])) {
    json(res, 404, { error: '지원하지 않는 도구 요청입니다.' });
    return true;
  }
  const target = new URL(config.tools[match[1]].target);
  const headers = { host: target.host };
  for (const key of ['content-type', 'content-length', 'accept', 'range', 'if-range', 'if-match', 'last-event-id', 'idempotency-key']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }
  if (req.headers.origin) headers.origin = target.origin;
  const upstream = http.request({ hostname: target.hostname, port: target.port, path: match[2] + url.search, method: req.method, headers }, reply => {
    // Never forward a redirect/cookie/HTML document into the studio's origin.
    if (String(reply.headers['content-type']).includes('text/html') || reply.statusCode >= 300 && reply.statusCode < 400) {
      reply.resume(); json(res, 502, { error: '도구 서버가 예상하지 못한 응답을 보냈습니다.' }); return;
    }
    const outgoing = { 'cache-control': 'no-store', 'x-accel-buffering': 'no' };
    for (const key of RESPONSE_HEADERS) if (reply.headers[key]) outgoing[key] = reply.headers[key];
    res.writeHead(reply.statusCode || 502, outgoing);
    res.flushHeaders();
    reply.pipe(res);
    reply.on('error', () => res.destroy());
  });
  upstream.on('error', () => {
    if (res.headersSent) res.destroy();
    else json(res, 502, { error: '도구 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.' });
  });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
  return true;
}
