import { test, expect } from '@playwright/test'

const longText = 'Supercalifragilisticexpialidocious'.repeat(9)
const mixed = `栖霞山 QIXIA MOUNTAIN ${longText} https://example.com/${longText}`

for (const width of [320, 375, 390, 768, 1440, 1920]) {
  test(`English and mixed text wrap inside photo and chat panels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/photo')
    await expect(page.locator('.photo-frame-choice').first()).toBeVisible()
    const failures = await page.evaluate(({ longText, mixed }) => {
      // Stress the actual layout with long untranslated service errors and URLs.
      document.querySelectorAll('.photo-frame-choice strong, .photo-frame-choice small, .photo-collection-note p span').forEach(el => { el.textContent = mixed })
      const error = document.createElement('p'); error.className = 'photo-error'; error.textContent = mixed
      document.querySelector('.photo-actions')!.prepend(error)
      const chat = document.createElement('section'); chat.className = 'pet-chat'; chat.style.cssText = 'position:relative;inset:auto;transform:none;width:100%;max-width:360px'
      chat.innerHTML = '<div class="pet-messages"><div style="display:flex"><div style="max-width:92%;white-space:pre-wrap"><span></span></div></div></div>'
      chat.querySelector('span')!.textContent = longText
      document.querySelector('main')!.append(chat)
      const targets = [...document.querySelectorAll<HTMLElement>('.photo-frame-choice, .photo-error, .photo-collection-note, .pet-messages')]
      return { pageOverflow: document.documentElement.scrollWidth > innerWidth, containers: targets.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className) }
    }, { longText, mixed })
    expect(failures).toEqual({ pageOverflow: false, containers: [] })
  })
}
