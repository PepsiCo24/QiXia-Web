import { test, expect, type Page } from '@playwright/test'

async function mockCamera(page: Page, failure?: string) {
  await page.addInitScript(({ failure }) => {
    const state = { requests: [] as unknown[], tracks: [] as MediaStreamTrack[] }
    Object.assign(window, { __cameraTest: state })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async (constraints: MediaStreamConstraints) => {
      state.requests.push(constraints)
      if (failure) throw new DOMException('test camera error', failure)
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#b06040'; ctx.fillRect(0, 0, 400, 600)
      ctx.fillStyle = '#206090'; ctx.fillRect(400, 0, 400, 600)
      const stream = canvas.captureStream(10)
      state.tracks.push(...stream.getTracks())
      return stream
    } })
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { configurable: true, value: async () => [{ kind: 'videoinput', deviceId: 'front' }, { kind: 'videoinput', deviceId: 'back' }] })
  }, { failure })
}

async function sample(page: Page) {
  return page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext('2d')!.getImageData(210, 210, 1, 1).data])
}

async function upload(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 1200
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#806040'; ctx.fillRect(0, 0, 800, 1200)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })
  await expect(page.getByRole('button', { name: '生成我的栖霞留影' })).toBeVisible()
}

test('map entry preserves map and links to the studio', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#map')).toBeVisible()
  await page.getByRole('link', { name: '开始留影' }).click()
  await expect(page).toHaveURL(/\/photo/)
  await expect(page.getByRole('link', { name: '返回山林地图' })).toHaveAttribute('href', '/#map')
})

for (const failure of ['NotAllowedError', 'NotFoundError', 'NotReadableError']) {
  test(`camera gracefully handles ${failure}`, async ({ page }) => {
    await mockCamera(page, failure); await page.goto('/photo')
    expect(await page.evaluate(() => (window as any).__cameraTest.requests.length)).toBe(0)
    await page.getByRole('button', { name: '开启摄像头，开始留影' }).click()
    await expect(page.locator('.photo-error[role=alert]')).toBeVisible()
    await expect(page.getByRole('button', { name: '上传照片也可以' })).toBeEnabled()
    expect(await page.evaluate(() => (window as any).__cameraTest.requests[0].audio)).toBe(false)
  })
}

test('camera countdown, cancellation, mirror, switching, retake and cleanup', async ({ page }) => {
  await mockCamera(page); await page.goto('/photo')
  await page.getByRole('button', { name: '开启摄像头，开始留影' }).click()
  const shoot = page.getByRole('button', { name: '3 秒倒计时拍摄' })
  await expect(shoot).toBeEnabled()
  const before = await sample(page)
  expect(before[2]).toBeGreaterThan(before[0]) // front camera is mirrored: blue side on left
  await shoot.click(); await expect(page.locator('.photo-countdown strong')).toHaveText('3')
  await page.getByRole('button', { name: '取消倒计时' }).click()
  await page.getByRole('button', { name: '切换镜头' }).click()
  await expect(shoot).toBeEnabled()
  expect(await page.evaluate(() => (window as any).__cameraTest.requests[1].video.facingMode.ideal)).toBe('environment')
  await page.getByRole('button', { name: '切换镜头' }).click(); await expect(shoot).toBeEnabled()
  await shoot.click()
  await expect(page.getByRole('button', { name: '生成我的栖霞留影' })).toBeVisible({ timeout: 7000 })
  expect(await sample(page)).toEqual(before)
  expect(await page.evaluate(() => (window as any).__cameraTest.tracks.every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true)
  await page.getByRole('button', { name: '重新拍摄', exact: true }).click(); await expect(shoot).toBeEnabled()
  await page.getByRole('button', { name: '结束本次留影并清空' }).click()
  expect(await page.evaluate(() => (window as any).__cameraTest.tracks.every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true)
})

test('upload, all frames, crop/filter export consistency, original, reset and download', async ({ page }) => {
  await page.goto('/photo'); await upload(page)
  for (const name of ['山间来信', '灵猫专属纪念', '栖小猫来合影', '栖霞枫叶季']) {
    const button = page.getByRole('button', { name: new RegExp(name) }); await button.click(); await expect(button).toHaveAttribute('aria-pressed', 'true')
  }
  const original = await sample(page)
  await page.getByRole('button', { name: '暖色', exact: true }).click()
  await expect.poll(() => sample(page)).not.toEqual(original)
  const warm = await sample(page)
  await page.getByRole('button', { name: '查看原图色调' }).click(); expect(await sample(page)).toEqual(original)
  await page.getByRole('button', { name: '返回滤镜效果' }).click(); expect(await sample(page)).toEqual(warm)
  await page.getByRole('slider', { name: '照片缩放' }).fill('1.5')
  await page.getByRole('slider', { name: '左右位置' }).fill('0.4')
  await page.getByRole('slider', { name: '上下位置' }).fill('-0.4')
  await page.getByRole('button', { name: '生成我的栖霞留影' }).click()
  await expect(page.getByRole('link', { name: '保存高清照片' })).toBeVisible()
  const exported = await page.locator('.photo-result').evaluate(async (image: HTMLImageElement) => {
    await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    canvas.getContext('2d')!.drawImage(image, 0, 0)
    return { width: image.naturalWidth, height: image.naturalHeight, pixel: [...canvas.getContext('2d')!.getImageData(420, 420, 1, 1).data] }
  })
  expect(exported.width).toBe(1200); expect(exported.height).toBe(1600)
  for (let i = 0; i < 3; i++) expect(Math.abs(exported.pixel[i] - warm[i])).toBeLessThanOrEqual(3)
  const download = page.waitForEvent('download'); await page.getByRole('link', { name: '保存高清照片' }).click()
  expect((await download).suggestedFilename()).toContain('栖霞留影')
  await page.getByRole('button', { name: '返回编辑', exact: true }).click()
  await page.getByRole('button', { name: '一键还原' }).click()
  expect(await sample(page)).toEqual(original)
})

test('public screen idle cleanup revokes URLs and clears private photos', async ({ page }) => {
  await page.goto('/photo'); await page.getByRole('button', { name: '景区大屏模式' }).click()
  await page.clock.install(); await upload(page)
  await page.getByRole('button', { name: '生成我的栖霞留影' }).click()
  await expect(page.locator('.photo-result')).toBeVisible()
  const url = await page.locator('.photo-result').getAttribute('src')
  await page.clock.fastForward(121000)
  await expect(page.getByRole('button', { name: '开启摄像头，开始留影' })).toBeVisible()
  await expect(page.locator('.photo-result')).toHaveCount(0)
  expect(await page.evaluate(async url => { try { await fetch(url!); return false } catch { return true } }, url)).toBe(true)
  await expect(page.getByRole('status')).toContainText('清空照片')
})

test('backgrounding clears photos and stops camera, late camera grants are discarded', async ({ page }) => {
  await mockCamera(page); await page.goto('/photo'); await upload(page)
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByRole('button', { name: '开启摄像头，开始留影' })).toBeVisible()
  await page.getByRole('button', { name: '开启摄像头，开始留影' }).click()
  await expect(page.getByRole('button', { name: '3 秒倒计时拍摄' })).toBeEnabled()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(await page.evaluate(() => (window as any).__cameraTest.tracks.every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true)
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => { await new Promise(resolve => { (window as any).__releaseCamera = resolve }); return original(constraints) } })
  })
  await page.getByRole('button', { name: '开启摄像头，开始留影' }).click()
  await page.getByRole('button', { name: '取消等待' }).click()
  await page.evaluate(() => (window as any).__releaseCamera())
  await expect.poll(() => page.evaluate(() => (window as any).__cameraTest.tracks.every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true)
  await expect(page.getByRole('button', { name: '开启摄像头，开始留影' })).toBeVisible()
})

test('unsupported camera and invalid uploads offer a usable fallback', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined }))
  await page.goto('/photo'); await page.getByRole('button', { name: '开启摄像头，开始留影' }).click()
  await expect(page.locator('.photo-error')).toContainText('不支持摄像头')
  await page.locator('input[type=file]').setInputFiles({ name: 'not-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('test') })
  await expect(page.locator('.photo-error')).toContainText('20 MB')
  await upload(page)
})

test('mobile and landscape layout have no horizontal overflow', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1920, height: 1080 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); await page.goto('/photo')
    if (viewport.width === 1920) await page.getByRole('button', { name: '景区大屏模式' }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: '开启摄像头，开始留影' })).toBeEnabled()
  }
})
