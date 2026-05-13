import 'dotenv/config'
import express from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { verifyToken } from './auth/verifyToken.js'
import { checkUserAccess } from './auth/checkUserAccess.js'
import { registerSearchContractorsTool } from './tools/search_contractors.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

function buildMCPServer(): McpServer {
  const server = new McpServer({
    name: 'ic-ratings-contractor-search',
    version: '1.0.0',
  })
  registerSearchContractorsTool(server)
  return server
}

app.post('/mcp', async (req, res) => {
  // Auth: verify JWT and check email exists in users table
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' })
    return
  }

  try {
    const payload = verifyToken(token)
    await checkUserAccess(payload.email)
  } catch (err) {
    res.status(403).json({ error: (err as Error).message })
    return
  }

  // Create a fresh server + transport per request (stateless mode)
  const server = buildMCPServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  res.on('close', async () => {
    await transport.close()
    await server.close()
  })

  transport.onerror = (err) => console.error('[MCP transport error]', err)

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('[MCP handleRequest error]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ic-ratings-mcp', version: '1.0.0' })
})

const PORT = parseInt(process.env.PORT ?? '3000', 10)
app.listen(PORT, () => {
  console.log(`IC Ratings MCP Server listening on port ${PORT}`)
})
