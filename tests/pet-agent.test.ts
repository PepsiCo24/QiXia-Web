import test from 'node:test'
import assert from 'node:assert/strict'
import { executeMapCommand, mapCommandSchema, petAnimations } from '../lib/pet/pet-actions'
import { buildPetSystemPrompt, localReply, validPersona } from '../lib/pet/pet-knowledge'

test('commands reject unknown and inherited IDs and unknown fields', () => {
  for (const poiId of ['__proto__', 'constructor', 'toString', 'missing']) {
    assert.equal(mapCommandSchema.safeParse({ type: 'focus_place', poiId }).success, false)
  }
  for (const personaId of ['__proto__', 'constructor', 'missing']) {
    assert.equal(mapCommandSchema.safeParse({ type: 'show_route', personaId }).success, false)
    assert.equal(validPersona(personaId), 'family')
  }
  assert.equal(mapCommandSchema.safeParse({ type: 'show_facilities', coordinates: [0, 0] }).success, false)
  assert.equal(mapCommandSchema.safeParse({ type: 'toggle_layer', layer: 'heat', visible: 'true' }).success, false)
  assert.equal(mapCommandSchema.safeParse({ type: 'play_animation', animation: 'dance' }).success, false)
  assert.equal(petAnimations.length, 10)
  assert.deepEqual(executeMapCommand({ type: 'focus_place', poiId: 'temple' }), { commands: [{ type: 'focus_place', poiId: 'temple' }] })
})

test('local fallback is deterministic and every emitted command is valid', () => {
  for (const text of ['带孩子怎么玩', '老人路线', '千佛岩', '今天红叶如何', '哪里有厕所', '有没有无障碍路线', '关闭设备', '你好', '票价多少钱', '数据来源']) {
    const first = localReply(text, 'family')
    assert.deepEqual(first, localReply(text, 'family'))
    assert.match(first.text, /本地演示/)
    for (const command of first.commands) assert.equal(mapCommandSchema.safeParse(command).success, true)
  }
})

test('fallback opens route and POI, and explicitly limits live and facility claims', () => {
  assert.ok(localReply('带孩子怎么玩', 'family').commands.some(c => c.type === 'show_route' && c.personaId === 'family'))
  assert.ok(localReply('介绍千佛岩', 'culture').commands.some(c => c.type === 'show_poi_card' && c.poiId === 'grottoes'))
  assert.match(localReply('今天停车位有多少', 'photo').text, /模拟数据/)
  const facilities = localReply('母婴室在哪里', 'family')
  assert.ok(facilities.commands.some(c => c.type === 'show_facilities'))
  assert.match(facilities.text, /没有经核验/)
  assert.match(localReply('轮椅能走吗', 'elder').text, /不能证明/)
  assert.match(localReply('数据来源', 'family').text, /未经现场核验/)
  assert.match(buildPetSystemPrompt('elder'), /绝不宣称某路段无台阶/)
  assert.doesNotMatch(buildPetSystemPrompt('elder'), /全程 8 处座椅|可推婴儿车至千佛岩前/)
})
