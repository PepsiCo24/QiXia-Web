// Runs the real app-side manifest validator against the shipped assets.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    filename,
  )
}

const root = path.resolve(__dirname, '..')
const { validatePetManifest, PET_ANIMATIONS } = require(path.join(root, 'lib/pet/pet-assets.ts'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/pet/qixia-cat/manifest.json'), 'utf8'))
validatePetManifest(manifest)
for (const [name, animation] of Object.entries(manifest.animations)) {
  for (const frame of animation.frames) {
    const file = path.resolve(root, 'public/pet/qixia-cat', frame.src || frame.sheet)
    if (!fs.existsSync(file)) throw new Error(`${name}: missing ${file}`)
  }
}
const missing = PET_ANIMATIONS.filter((name) => !manifest.animations[name])
if (missing.length) throw new Error(`manifest is missing ${missing.join(', ')}`)
console.log(JSON.stringify({
  validator: 'PASS',
  codeAnimations: PET_ANIMATIONS.length,
  manifestAnimations: Object.keys(manifest.animations).length,
}, null, 2))
