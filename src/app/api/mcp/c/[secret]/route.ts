import { handleMcpRequest } from '@/lib/mcp/server';

// Connector URL form: /api/mcp/c/<secret>. Works in apps that can't send headers (claude.ai).

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ secret: string }> };

async function handle(req: Request, { params }: Params) {
  const { secret } = await params;
  return handleMcpRequest(req, secret);
}

export { handle as GET, handle as POST, handle as DELETE };
