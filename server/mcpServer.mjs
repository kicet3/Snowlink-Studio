import { McpServer } from '@modelcontextprotocol/server';
import { studioToolDefinitions } from './studioTools.mjs';
import { STUDIO_GUIDE } from './studioActions.mjs';

export function studioMcpServer(execute) {
  const server = new McpServer({ name: 'snowlink-studio', title: 'Snowlink Studio', version: '0.2.0' }, { instructions: STUDIO_GUIDE, maxToolInputElements: 10000 });
  for (const [name, definition] of Object.entries(studioToolDefinitions)) {
    server.registerTool(name, definition, async input => {
      try {
        const result = await execute(name, input);
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error.status && error.status < 500 ? error.message : '작업을 완료하지 못했습니다. 서버 연결과 작업 상태를 확인해주세요.' }] };
      }
    });
  }
  server.registerResource('studio-workflow', 'snowfall://workflow', { description: '대화로 캐릭터·연속 시나리오·장면 노드를 만드는 순서', mimeType: 'text/plain' }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: STUDIO_GUIDE }] }));
  return server;
}
