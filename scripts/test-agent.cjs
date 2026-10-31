// Compile the small server-only unit-test dependency graph in memory.
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  module._compile(output, filename)
}
require('../tests/pet-agent.test.ts')
