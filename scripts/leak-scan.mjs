import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

const roots = process.argv.slice(2)
const scanRoots = roots.length
  ? roots
  : ['.output/public', '.output/server', 'public']
const exactPatterns = [
  'SEALED_SENTINEL_DO_NOT_EXPOSE_7f91d2e4',
  '"hiddenPrompt"',
  '"hiddenAnswer"',
  '"sealedContent"',
  '"providerApiKey"',
  '"signingPrivateKey"',
]
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.txt',
  '.xml',
])
const findings = []

async function scan(path) {
  let metadata
  try {
    metadata = await stat(path)
  } catch {
    return
  }
  if (metadata.isDirectory()) {
    for (const entry of await readdir(path)) await scan(join(path, entry))
    return
  }
  if (!textExtensions.has(extname(path))) return
  const content = await readFile(path, 'utf8')
  for (const pattern of exactPatterns) {
    if (content.includes(pattern)) {
      findings.push(`${relative(process.cwd(), path)} contains ${pattern}`)
    }
  }
}

for (const root of scanRoots) await scan(resolve(root))

if (findings.length) {
  process.stderr.write(`Leak regression scan failed:\n${findings.join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(
  `Leak regression scan passed for ${scanRoots.join(', ')}.\n`,
)
