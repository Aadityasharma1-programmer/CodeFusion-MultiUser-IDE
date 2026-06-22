const express = require('express')
const router = express.Router()
const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const authMiddleware = require('../middleware/auth')

const optionalAuth = process.env.NODE_ENV === 'development'
  ? (req, _res, next) => next()
  : authMiddleware

// ── Helpers ──────────────────────────────────────────────────────────────────

const JUDGE0_LANGUAGES = {
  javascript: 93, // Node.js 18.15.0
  typescript: 94, // TypeScript 5.0.3
  python: 71,     // Python 3.8.1
  go: 60,         // Go 1.13.5
  c: 50,          // C (GCC 9.2.0)
  cpp: 54,        // C++ (GCC 9.2.0)
  java: 62,       // Java (OpenJDK 13.0.1)
  rust: 73,       // Rust 1.40.0
  ruby: 72,       // Ruby 2.7.0
  php: 68,        // PHP 7.4.1
  csharp: 51,     // C# (Mono 6.6.0.161)
  swift: 83       // Swift 5.2.3
}

async function runInJudge0(code, language) {
  const language_id = JUDGE0_LANGUAGES[language]
  if (!language_id) {
    return { output: `⚠️ Language "${language}" execution is not yet supported.\n`, exitCode: 1 }
  }

  try {
    const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id,
        source_code: code
      })
    })

    if (!response.ok) {
      const text = await response.text()
      return { output: `❌ Judge0 API Error: ${response.status} ${response.statusText}\n${text}`, exitCode: 1 }
    }

    const result = await response.json()
    
    let output = ''
    if (result.compile_output) output += result.compile_output + '\n'
    if (result.stdout) output += result.stdout
    if (result.stderr) output += result.stderr
    if (result.message) output += result.message + '\n'

    if (!output.trim()) {
      output = '(no output)\n'
    }

    // exit code > 0 if there's an error status
    const exitCode = result.status?.id > 3 ? 1 : 0
    return { output, exitCode }
  } catch (err) {
    return { output: `❌ Failed to connect to execution server: ${err.message}\n`, exitCode: 1 }
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/execute', optionalAuth, async (req, res) => {
  const { code, language = 'javascript' } = req.body

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Code content is required for execution' })
  }

  try {
    const { output, exitCode } = await runInJudge0(code, language)

    // Format the header to mimic a terminal session
    const header = `$ run ${language}\n`
    const exitLine = exitCode !== 0 ? `\nProcess exited with code ${exitCode}\n` : ''

    res.status(200).json({ output: header + output + exitLine })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
