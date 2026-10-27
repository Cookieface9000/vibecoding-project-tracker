import { handleMcpRequest } from '@/lib/mcp/server';

// Header form: /api/mcp with "Authorization: Bearer <secret>", for clients that send headers.

export const dynamic = 'force-dynamic';

async function handle(req: Request) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
  return handleMcpRequest(req, match?.[1] ?? null);
}

export { handle as GET, handle as POST, handle as DELETE };
