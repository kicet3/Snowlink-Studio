import http from 'node:http';
import { authorize, failure, json } from './http.mjs';
import { ROBOTS_TAG, handleRobots } from './crawlers.mjs';

const HOP_HEADERS = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
export function createProxy({ target, allowedOrigins, parentOrigins, frontend }) {
  const upstream = new URL(target);
  return http.createServer(async (req, res) => {
    res.setHeader('X-Robots-Tag', ROBOTS_TAG);
    try { authorize(req, allowedOrigins); } catch (error) { failure(res, error); return; }
    if (!req.url.startsWith('/') || req.url.startsWith('//')) return json(res, 400, { error: 'Invalid path' });
    if (handleRobots(req, res)) return;
    try { if (frontend && await frontend(req, res)) return; } catch (error) { failure(res, error); return; }
    const headers = { ...req.headers, host: upstream.host };
    for (const key of HOP_HEADERS) delete headers[key];
    for (const key of Object.keys(headers)) if (/^(forwarded|x-forwarded-|tailscale-)/i.test(key)) delete headers[key];
    if (headers.origin) headers.origin = upstream.origin;
    if (headers.referer) headers.referer = upstream.origin + '/';
    const remote = http.request({ hostname: upstream.hostname, port: upstream.port, method: req.method, path: req.url, headers }, reply => {
      const outgoing = { ...reply.headers, 'x-robots-tag': ROBOTS_TAG };
      for (const key of HOP_HEADERS) delete outgoing[key];
      // Adapt only this integration origin. The original app keeps its frame policy.
      if (String(outgoing['content-type']).includes('text/html')) {
        const csp = String(outgoing['content-security-policy'] || '').split(';').map(s => s.trim()).filter(s => s && !s.startsWith('frame-ancestors'));
        csp.push(`frame-ancestors ${parentOrigins.join(' ')}`);
        outgoing['content-security-policy'] = csp.join('; ');
        delete outgoing['x-frame-options'];
      }
      if (String(outgoing.location || '').startsWith(upstream.origin + '/')) outgoing.location = outgoing.location.slice(upstream.origin.length);
      res.writeHead(reply.statusCode || 502, outgoing);
      res.flushHeaders();
      reply.pipe(res);
      reply.on('error', () => res.destroy());
    });
    remote.on('error', () => {
      if (res.headersSent) return res.destroy();
      json(res, 502, { error: '도구 서버에 연결할 수 없습니다. 작업실에서 연결 상태를 확인해주세요.' });
    });
    // SSE and long generation requests stay streamed and unbuffered.
    req.on('aborted', () => remote.destroy());
    res.on('close', () => remote.destroy());
    req.pipe(remote);
  });
}
