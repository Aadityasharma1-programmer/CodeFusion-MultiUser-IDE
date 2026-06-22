const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const OpenAI = require('openai')
const { execFile } = require('child_process')
const path = require('path')

const optionalAuth = process.env.NODE_ENV === 'development'
  ? (req, res, next) => next()
  : authMiddleware

// ── OpenAI client (lazy-init so the server starts even without a key) ──────
let openai = null
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in server/.env')
    }
    openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:5173', 
        'X-Title': 'Codefusion',
      }
    })
  }
  return openai
}

function performInternetSearch(query) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../search_ddg.py')
    execFile('python', [scriptPath, query], (err, stdout, stderr) => {
      if (err) {
        console.error('[AI Search] Error:', err.message, stderr)
        return resolve({ error: 'Search failed' })
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (e) {
        console.error('[AI Search] JSON parse error:', e.message)
        resolve({ error: 'Failed to parse search results' })
      }
    })
  })
}

/**
 * POST /api/ai/chat
 *
 * Body:
 *   prompt      {string}  – the user's message
 *   code        {string}  – current editor content (optional)
 *   language    {string}  – 'python' | 'javascript' | etc. (optional)
 *   history     {Array}   – previous messages [{role, content}] (optional)
 *   mode        {string}  – 'chat' | 'explain' | 'fix' | 'complete' (optional, default 'chat')
 */
router.post('/chat', optionalAuth, async (req, res) => {
  const { prompt, code, language = 'javascript', history = [], mode = 'chat' } = req.body

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const ai = getOpenAI()

    // Build the system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode, language, code)

    // Build the messages array: system + conversation history + new user message
    const messages = [
      { role: 'system', content: systemPrompt },
      // Sanitize history – only pass role & content
      ...history.slice(-10).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: buildUserMessage(prompt, mode, code, language) },
    ]

    const tools = [
      {
        type: "function",
        function: {
          name: "search_internet",
          description: "Search the internet for up-to-date facts, documentation, or news using DuckDuckGo.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The search query" }
            },
            required: ["query"]
          }
        }
      }
    ]

    let completion = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'openai/gpt-3.5-turbo',
      messages,
      tools,
      max_tokens: 1500,
      temperature: mode === 'complete' ? 0.2 : 0.7,
      stream: false,
    })

    let message = completion.choices[0].message
    let usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0 }

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message)
      
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'search_internet') {
          const args = JSON.parse(toolCall.function.arguments)
          const searchResult = await performInternetSearch(args.query)
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(searchResult)
          })
        }
      }

      completion = await ai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'openai/gpt-3.5-turbo',
        messages,
        max_tokens: 1500,
        temperature: mode === 'complete' ? 0.2 : 0.7,
        stream: false,
      })
      
      message = completion.choices[0].message
      if (completion.usage) {
        usage.prompt_tokens += completion.usage.prompt_tokens || 0
        usage.completion_tokens += completion.usage.completion_tokens || 0
      }
    }

    const reply = message.content

    res.json({
      reply,
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
      },
    })
  } catch (error) {
    console.error('[AI] Error:', error.message)

    // Friendly error for missing API key
    if (error.message.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        error: 'AI service not configured. Add OPENAI_API_KEY to server/.env',
      })
    }
    // OpenRouter / OpenAI quota limits
    if (error?.status === 429) {
      return res.status(429).json({ error: 'AI rate limit or quota reached. Please check your OpenRouter credits.' })
    }

    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai/generate  (legacy endpoint – kept for backwards compat)
 */
router.post('/generate', optionalAuth, async (req, res) => {
  req.body.mode = 'chat'
  return router.handle(
    Object.assign(req, { url: '/chat', path: '/chat', route: null }),
    res,
    () => { }
  )
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(mode, language, code) {
  const base = `You are Codefusion, an expert coding assistant integrated inside a real-time collaborative code editor. You help developers write, debug, explain, and improve code.

Rules:
- Always reply in markdown format so the UI can render it properly.
- For code blocks, always include the language tag (e.g. \`\`\`${language}).
- Be concise and actionable. Skip unnecessary preamble.
- When giving fixed code, show only the relevant changed section unless the full file is needed.
- Current editor language: ${language}
`

  const codeContext = code?.trim()
    ? `\nCurrent code in the editor:\n\`\`\`${language}\n${code.slice(0, 3000)}\n\`\`\``
    : ''

  const modeInstructions = {
    explain: '\nYour task: Clearly explain what the selected/provided code does, line by line if helpful.',
    fix: '\nYour task: Identify bugs in the code and provide a corrected version with a brief explanation of what was wrong.',
    complete: '\nYour task: Complete or extend the code based on the user request. Output ONLY the code continuation, no explanation unless asked.',
    chat: '\nYour task: Answer the user\'s coding question helpfully. If the question relates to the code in the editor, reference it directly.',
  }

  return base + codeContext + (modeInstructions[mode] || modeInstructions.chat)
}

function buildUserMessage(prompt, mode, code, language) {
  const modePrefix = {
    explain: 'Explain this code: ',
    fix: 'Fix the bugs in this code: ',
    complete: 'Complete the following: ',
    chat: '',
  }
  return (modePrefix[mode] || '') + prompt
}

module.exports = router
