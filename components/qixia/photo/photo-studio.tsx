'use client'

import { useLanguage, LanguageSwitcher } from '../language-provider'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Upload, RefreshCw, Download, Share2, ShieldCheck, Maximize2, Check, Sparkles } from 'lucide-react'
import { FRAMES, type FrameId } from '@/lib/photo/frames'
import { DEFAULT_EDIT, drawComposition, loadPhotoAssets, type EditSettings, type PhotoAssets } from '@/lib/photo/render'
import { useCamera } from './use-camera'

type Stage = 'intro' | 'live' | 'countdown' | 'edit' | 'generating' | 'result'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const dateLabel = () => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.')

export function PhotoStudio() {
  const { t, locale } = useLanguage()
  const camera = useCamera()
  const [stage, setStage] = useState<Stage>('intro')
  const [frame, setFrame] = useState<FrameId>('maple')
  const [settings, setSettings] = useState<EditSettings>({ ...DEFAULT_EDIT })
  const [assets, setAssets] = useState<PhotoAssets | null>(null)
  const [assetAttempt, setAssetAttempt] = useState(0)
  const [source, setSource] = useState<HTMLCanvasElement | HTMLImageElement | null>(null)
  const [date, setDate] = useState('')
  const [count, setCount] = useState(3)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [original, setOriginal] = useState(false)
  const [kiosk, setKiosk] = useState(false)
  const [remaining, setRemaining] = useState(120)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null)
  const [shareable, setShareable] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const session = useRef(0)
  const resultURL = useRef<string | null>(null)
  const pendingURL = useRef<string | null>(null)
  const lastActivity = useRef(0)
  const drag = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null)
  const sourceRef = useRef<typeof source>(null)
  sourceRef.current = source

  const clearPhoto = useCallback(() => {
    if (resultURL.current) URL.revokeObjectURL(resultURL.current)
    if (pendingURL.current) URL.revokeObjectURL(pendingURL.current)
    resultURL.current = null; pendingURL.current = null
    const old = sourceRef.current
    if (old instanceof HTMLCanvasElement) { old.width = 0; old.height = 0 }
    if (old instanceof HTMLImageElement) old.src = ''
    sourceRef.current = null
    setSource(null); setResult(null)
    if (inputRef.current) inputRef.current.value = ''
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])
  const reset = useCallback((message = '') => {
    session.current++; camera.stop(); clearPhoto()
    setStage('intro'); setSettings({ ...DEFAULT_EDIT }); setFrame('maple'); setOriginal(false)
    setDate(''); setError(''); setNotice(message); setUploading(false); setRemaining(120)
  }, [camera.stop, clearPhoto])

  useEffect(() => {
    let active = true
    loadPhotoAssets().then(value => { if (active) { setAssets(value); setError('') } }).catch(() => { if (active) setError("相框素材加载失败，请检查网络后重新加载。") })
    return () => { active = false }
  }, [assetAttempt])
  useEffect(() => {
    const leave = () => reset("已结束本次留影，照片已从页面清空。")
    const visibility = () => { if (document.hidden) leave() }
    window.addEventListener('pagehide', leave)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pagehide', leave); document.removeEventListener('visibilitychange', visibility)
      session.current++; camera.stop()
      if (resultURL.current) URL.revokeObjectURL(resultURL.current)
      if (pendingURL.current) URL.revokeObjectURL(pendingURL.current)
      const old = sourceRef.current
      if (old instanceof HTMLCanvasElement) { old.width = 0; old.height = 0 }
      if (old instanceof HTMLImageElement) old.src = ''
    }
  }, [camera.stop, reset])
  useEffect(() => {
    if (!kiosk) return
    lastActivity.current = Date.now()
    const activity = () => { lastActivity.current = Date.now(); setRemaining(120) }
    const timer = window.setInterval(() => {
      const left = Math.max(0, 120 - Math.floor((Date.now() - lastActivity.current) / 1000))
      setRemaining(left)
      if (!left) { reset("长时间未操作，已为你清空照片并关闭摄像头。"); lastActivity.current = Date.now() }
    }, 1000)
    window.addEventListener('pointerdown', activity); window.addEventListener('keydown', activity); window.addEventListener('input', activity)
    return () => { clearInterval(timer); window.removeEventListener('pointerdown', activity); window.removeEventListener('keydown', activity); window.removeEventListener('input', activity) }
  }, [kiosk, reset])

  const draw = useCallback((target: HTMLCanvasElement, raw = false) => {
    if (!assets) return
    const live = stage === 'live' || stage === 'countdown'
    const image = live && camera.ready ? camera.videoRef.current : source
    const w = image instanceof HTMLVideoElement ? image.videoWidth : image instanceof HTMLImageElement ? image.naturalWidth : image?.width || 0
    const h = image instanceof HTMLVideoElement ? image.videoHeight : image instanceof HTMLImageElement ? image.naturalHeight : image?.height || 0
    drawComposition(target, image, w, h, live ? DEFAULT_EDIT : settings, frame, assets, date || dateLabel(), live && camera.facing === 'user', raw)
  }, [assets, stage, source, settings, frame, date, camera.ready, camera.facing, camera.videoRef])
  useEffect(() => {
    if (stage === 'result') return
    let animation = 0
    const paint = () => {
      try { if (canvasRef.current) draw(canvasRef.current, original) } catch { setError("画面暂时无法渲染，请重新拍摄或更换照片。"); return }
      if (stage === 'live' || stage === 'countdown') animation = requestAnimationFrame(paint)
    }
    paint()
    return () => cancelAnimationFrame(animation)
  }, [draw, original, stage])

  const startCamera = async (facing: 'user' | 'environment' = 'user') => {
    session.current++; clearPhoto(); setError(''); setNotice(''); setSettings({ ...DEFAULT_EDIT }); setDate(dateLabel())
    setStage('live')
    const token = session.current
    const ok = await camera.start(facing)
    if (!ok && token === session.current) setStage('intro')
  }
  const capture = useCallback(() => {
    const video = camera.videoRef.current
    if (!video?.videoWidth || !camera.ready) { setError("摄像头尚未准备好，请稍后重试。"); setStage('live'); return }
    const shot = document.createElement('canvas')
    const scale = Math.min(1, 2048 / Math.max(video.videoWidth, video.videoHeight))
    shot.width = Math.round(video.videoWidth * scale); shot.height = Math.round(video.videoHeight * scale)
    const ctx = shot.getContext('2d')!
    if (camera.facing === 'user') { ctx.translate(shot.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0, shot.width, shot.height)
    setSource(shot); setDate(dateLabel()); setSettings({ ...DEFAULT_EDIT }); camera.stop(); setStage('edit')
  }, [camera.videoRef, camera.ready, camera.facing, camera.stop])
  useEffect(() => {
    if (stage !== 'countdown') return
    if (count === 0) { capture(); return }
    const timer = setTimeout(() => setCount(value => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [stage, count, capture])

  const upload = async (file?: File) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type) || file.size > 20 * 1024 * 1024) { setError("请选择 20 MB 以内的 JPG、PNG、WebP 或设备支持的照片。"); if (inputRef.current) inputRef.current.value = ''; return }
    session.current++; const token = session.current
    camera.stop(); clearPhoto(); setError(''); setNotice(''); setUploading(true); setStage('intro')
    const url = URL.createObjectURL(file); pendingURL.current = url
    try {
      const image = new Image(); image.src = url; await image.decode()
      if (token !== session.current) return
      if (image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error('oversize')
      const scaled = document.createElement('canvas')
      const ratio = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight))
      scaled.width = Math.max(1, Math.round(image.naturalWidth * ratio)); scaled.height = Math.max(1, Math.round(image.naturalHeight * ratio))
      scaled.getContext('2d')!.drawImage(image, 0, 0, scaled.width, scaled.height)
      image.src = ''; setSource(scaled); setDate(dateLabel()); setSettings({ ...DEFAULT_EDIT }); setStage('edit')
    } catch { if (token === session.current) setError("无法读取这张照片，或图片像素过大。请换一张 JPG、PNG 或 WebP（不超过 5000 万像素）。") }
    finally { URL.revokeObjectURL(url); if (pendingURL.current === url) pendingURL.current = null; if (token === session.current) setUploading(false) }
  }
  const generate = async () => {
    if (!assets || !source) return
    setStage('generating'); setError(''); setOriginal(false)
    const token = session.current
    try {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1600
      draw(canvas, false)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('encode')), 'image/jpeg', .94))
      canvas.width = 0; canvas.height = 0
      if (token !== session.current) return
      if (resultURL.current) URL.revokeObjectURL(resultURL.current)
      const url = URL.createObjectURL(blob); resultURL.current = url
      setResult({ url, blob }); setStage('result')
      const file = new File([blob], t('栖霞留影.jpg', 'qixia-memories.jpg'), { type: 'image/jpeg' })
      setShareable(!!navigator.canShare?.({ files: [file] }))
    } catch { if (token === session.current) { setStage('edit'); setError("照片生成失败，请重试，或缩小照片后重新上传。") } }
  }
  const share = async () => {
    if (!result) return
    try { await navigator.share({ files: [new File([result.blob], t('栖霞留影.jpg', 'qixia-memories.jpg'), { type: 'image/jpeg' })], title: t('栖小猫·栖霞留影', 'Qixia Cat · Photo Memories') }) }
    catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setError("系统分享未完成，请使用保存照片。") }
  }
  const statusCopy: Record<string, string> = {"摄像头权限未开启。请在浏览器设置中允许访问，或上传照片继续。": "Camera permission is off. Allow access in browser settings or upload a photo.", "没有找到摄像头，可以上传一张喜欢的照片。": "No camera found. Upload a photo instead.", "摄像头可能正被其他应用占用，请关闭后重试，或上传照片。": "The camera may be in use by another app. Close it and retry, or upload a photo.", "当前摄像头不支持此设置，请换一个摄像头或上传照片。": "This camera does not support these settings. Try another camera or upload a photo.", "暂时无法开启摄像头，请检查设备与权限，或上传照片继续。": "Cannot open the camera. Check your device and permissions or upload a photo.", "摄像头需要 HTTPS 或 localhost 安全环境。当前仍可上传照片。": "Camera access requires HTTPS or localhost. You can still upload a photo.", "此浏览器不支持摄像头，请使用较新的浏览器或上传照片。": "This browser does not support camera access. Use a newer browser or upload a photo.", "相框素材加载失败，请检查网络后重新加载。": "Could not load frames. Check your connection and retry.", "已结束本次留影，照片已从页面清空。": "Session ended. Photos cleared from this page.", "长时间未操作，已为你清空照片并关闭摄像头。": "Session timed out. Photos cleared and camera turned off.", "画面暂时无法渲染，请重新拍摄或更换照片。": "Cannot render this image. Retake or choose another photo.", "摄像头尚未准备好，请稍后重试。": "Camera not ready. Please try again shortly.", "请选择 20 MB 以内的 JPG、PNG、WebP 或设备支持的照片。": "Choose a JPG, PNG, WebP or supported photo under 20 MB.", "无法读取这张照片，或图片像素过大。请换一张 JPG、PNG 或 WebP（不超过 5000 万像素）。": "Cannot read this photo, or its resolution is too high. Choose a JPG, PNG or WebP up to 50 megapixels.", "照片生成失败，请重试，或缩小照片后重新上传。": "Could not create your photo. Retry or upload a smaller image.", "系统分享未完成，请使用保存照片。": "Sharing did not complete. Please save the photo instead.", "已取消摄像头请求，你也可以上传照片。": "Camera request canceled. You can also upload a photo.", "已发起下载；若手机未自动保存，可长按照片保存到相册。": "Download started. On mobile, long-press the photo to save it if needed.", "本次留影已结束，照片与摄像头已清空。": "Session ended. Photos cleared and camera turned off."}
  const localStatus = (value: string) => locale === 'en' ? statusCopy[value] ?? value : value
  const editing = stage === 'edit'
  const locked = stage === 'countdown' || stage === 'generating' || camera.busy || uploading
  const update = (key: keyof EditSettings, value: number) => setSettings(prev => ({ ...prev, [key]: value }))

  return <main className={`photo-studio ${kiosk ? 'photo-kiosk' : ''}`}>
    <header className="photo-topbar"><Link href="/#map" className="photo-back"><ArrowLeft size={18} /> {t("返回山林地图", "Back to mountain map")}</Link><Link href="/" className="photo-brand">{t("栖霞山", "Qixia Mountain")} <span>QIXIA MOUNTAIN</span></Link><LanguageSwitcher /><button className="photo-mode" aria-pressed={kiosk} onClick={() => { reset(); setKiosk(!kiosk) }}><Maximize2 size={16} /> {kiosk ? t("退出大屏模式", "Exit kiosk mode") : t("景区大屏模式", "Visitor kiosk mode")}</button></header>
    <section className="photo-heading"><div><p className="eyebrow">A LITTLE MOMENT, A LASTING MEMORY</p><h1>{t("栖小猫", "Qixia Cat")}<span> · </span>{t("栖霞留影", "Qixia Memories")}</h1><p>{t("和栖小猫一起，把栖霞的美好带回家。", "Bring Qixia’s beauty home with Qixia Cat.")}</p></div><div className="photo-privacy"><ShieldCheck size={18} /><span>{t("照片仅在本机处理", "Photos processed only on this device")}<br /><small>{t("不上传、不存储，离开页面即清空", "No upload or storage; cleared when you leave")}</small></span></div></section>
    <ol className="photo-steps" aria-label={t("留影步骤", "Photo steps")}>{[t("选一款相框", "Choose a frame"), t("拍下这一刻", "Capture the moment"), t("调整小美好", "Make it yours"), t("带走纪念照", "Save your keepsake")].map((label, i) => { const current = stage === 'intro' ? 0 : stage === 'live' || stage === 'countdown' ? 1 : stage === 'edit' || stage === 'generating' ? 2 : 3; return <li key={label} aria-current={i === current ? 'step' : undefined} data-active={i <= current}><span>{i < current ? <Check size={13} /> : `0${i + 1}`}</span>{label}</li> })}</ol>
    <div className="photo-workspace">
      <section className="photo-view-panel" aria-label={t("留影预览", "Photo preview")}>
        <div className="photo-view-header"><span><i /> {stage === 'result' ? t("你的栖霞纪念照", "Your Qixia keepsake") : stage === 'edit' ? t("留影编辑室", "Photo editor") : t("栖霞留影亭", "Qixia photo booth")}</span><small>{t("3 : 4 · 竖幅纪念照", "3 : 4 · Portrait keepsake")}</small></div>
        <div className="photo-canvas-wrap" data-editing={editing}>
          <video ref={camera.videoRef} muted playsInline className="photo-video-source" aria-hidden="true" />
          {stage === 'result' && result ? <img className="photo-result" src={result.url} alt={t("已生成的栖霞留影纪念照", "Your generated Qixia keepsake photo")} /> : <canvas width={600} height={800} ref={canvasRef} aria-label={t("照片与相框实时合成预览", "Live preview of your photo and frame")} onPointerDown={e => { if (!editing) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, sx: settings.x, sy: settings.y } }} onPointerMove={e => { const d = drag.current; if (!d || !editing) return; const rect = e.currentTarget.getBoundingClientRect(); setSettings(prev => ({ ...prev, x: Math.max(-1, Math.min(1, d.sx - (e.clientX - d.x) / rect.width * 2)), y: Math.max(-1, Math.min(1, d.sy - (e.clientY - d.y) / rect.height * 2)) })) }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} />}
          {stage === 'intro' && <div className="photo-welcome"><img src={`${basePath}/pet/qixia-cat/frames/wave-0.png`} alt={t("网站现有栖霞灵猫", "Qixia cat guide")} /><p className="eyebrow">HELLO, QIXIA</p><h2>{t("山林已就位，", "The forest is ready.")}<br />{t("就差一个你。", "All that’s missing is you.")}</h2><p>{t("选好喜欢的相框", "Choose your favorite frame")}<br />{t("让这一刻，成为旅途的小纪念。", "Turn this moment into a travel keepsake.")}</p></div>}
          {stage === 'countdown' && <div className="photo-countdown" role="status" aria-live="assertive"><strong key={count}>{count || t("咔嚓", "Click!")}</strong><span>{t("看镜头，栖小猫在陪你哦", "Look at the camera — Qixia Cat is with you")}</span></div>}
          {(camera.busy || uploading || stage === 'generating') && <div className="photo-loading" role="status"><RefreshCw className="animate-spin" size={26} /><p>{camera.busy ? t("等待摄像头授权与画面就绪…", "Waiting for camera permission and video…") : uploading ? t("正在读取照片…", "Reading your photo…") : t("正在装好这份栖霞记忆…", "Putting your Qixia memory together…")}</p>{camera.busy && <button onClick={() => reset("已取消摄像头请求，你也可以上传照片。")}>{t("取消等待", "Cancel")}</button>}</div>}
          {editing && <span className="photo-drag-hint">{t("拖动画面调整位置 · 可使用右侧滑块", "Drag to reposition, or use the sliders")}</span>}
        </div>
        <div className="photo-view-caption"><span>{stage === 'live' || stage === 'countdown' ? camera.facing === 'user' ? t("前置镜像 · 保存方向与取景一致", "Mirrored front camera · saved as previewed") : t("后置镜头 · 保持原始方向", "Rear camera · original orientation") : t("1200 × 1600 高清导出", "1200 × 1600 high-resolution export")}</span><span>{t("栖霞限定 · 旅途纪念", "Only in Qixia · a travel keepsake")}</span></div>
      </section>
      <aside className="photo-controls" aria-label={t("留影设置", "Photo settings")}>
        <section className="photo-control-section"><div className="photo-section-title"><h2><span>01</span> {t("选一款心动相框", "Choose your favorite frame")}</h2><small>{t("随心切换", "Try them all")}</small></div><div className="photo-frames">{FRAMES.map((item, i) => <button key={item.id} disabled={locked || stage === 'result'} className={`photo-frame-choice photo-frame-${i}`} aria-pressed={frame === item.id} onClick={() => setFrame(item.id)}><span className="photo-frame-swatch" aria-hidden="true"><span>{['枫', '山', '灵', '栖'][i]}</span><i /></span><span><strong>{t(item.name, ["Qixia Maple Season", "A Letter from the Mountains", "Cat Guide Keepsake", "A Photo with Qixia Cat"][i])}</strong><small>{t(item.description, ["Crimson maples, a memory of autumn", "Green mountain lines, a letter from the forest", "Cat and mountain moon, a special encounter", "Cats and pawprints, send today to tomorrow"][i])}</small></span>{frame === item.id && <Check size={16} />}</button>)}</div><p className="photo-fineprint">{t("复用本站灵猫素材 · 相框装饰为可替换设计稿", "Uses our cat artwork · frame decorations are design previews")}</p></section>
        {editing && <section className="photo-control-section"><div className="photo-section-title"><h2><span>02</span> {t("调整小美好", "Make it yours")}</h2><button onClick={() => { setSettings({ ...DEFAULT_EDIT }); setOriginal(false) }}>{t("一键还原", "Reset edits")}</button></div><label className="photo-slider">{t("照片缩放", "Photo zoom")} <output>{settings.zoom.toFixed(1)}×</output><input aria-label={t("照片缩放", "Photo zoom")} type="range" min="1" max="3" step="0.05" value={settings.zoom} onChange={e => update('zoom', Number(e.target.value))} /></label><div className="photo-position-sliders">{(['x', 'y'] as const).map((axis, i) => <label className="photo-slider" key={axis}>{i ? t("上下位置", "Vertical position") : t("左右位置", "Horizontal position")}<input aria-label={i ? t("上下位置", "Vertical position") : t("左右位置", "Horizontal position")} type="range" min="-1" max="1" step="0.02" value={settings[axis]} onChange={e => update(axis, Number(e.target.value))} /></label>)}</div><h3 className="photo-filter-title"><Sparkles size={14} /> {t("自然滤镜", "Natural filters")} <small>{t("全图色调，不改变五官", "Whole-image color; no facial changes")}</small></h3><div className="photo-filters">{(['none', 'bright', 'soft', 'warm'] as const).map((filter, i) => <button key={filter} aria-pressed={settings.filter === filter} onClick={() => setSettings(prev => ({ ...prev, filter }))}>{[t("原色", "Original"), t("提亮", "Bright"), t("柔和", "Soft"), t("暖色", "Warm")][i]}</button>)}</div><label className="photo-slider">{t("滤镜强度", "Filter strength")} <output>{Math.round(settings.intensity * 100)}%</output><input aria-label={t("滤镜强度", "Filter strength")} type="range" min="0" max="1" step="0.05" disabled={settings.filter === 'none'} value={settings.intensity} onChange={e => update('intensity', Number(e.target.value))} /></label><button className="photo-compare" aria-pressed={original} onClick={() => setOriginal(!original)}>{original ? t("返回滤镜效果", "Show filter effect") : t("查看原图色调", "Show original colors")}</button></section>}
        <section className="photo-actions" aria-label={t("拍摄与保存", "Capture and save")}>
          {(error || camera.error) && <div className="photo-error" role="alert">{localStatus(error || camera.error)}{!assets && <button onClick={() => { setError(''); setAssetAttempt(value => value + 1) }}>{t("重新加载相框", "Reload frames")}</button>}</div>}
          {notice && <p className="photo-notice" role="status">{localStatus(notice)}</p>}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" aria-label={t("选择本机照片", "Choose a photo from this device")} hidden onChange={e => void upload(e.target.files?.[0])} />
          {stage === 'intro' && <><button className="photo-primary" disabled={!assets || uploading} onClick={() => void startCamera()}><Camera size={20} /> {t("开启摄像头，开始留影", "Open camera and take a photo")}</button><button className="photo-secondary" disabled={uploading} onClick={() => inputRef.current?.click()}><Upload size={17} /> {t("上传照片也可以", "Upload a photo instead")}</button><p className="photo-fineprint">{t("点击后才请求视频权限，不使用麦克风。", "Camera permission is requested only after you click. No microphone is used.")}<br />{t("摄像头需 HTTPS 或 localhost；支持 20 MB 内照片。", "Camera requires HTTPS or localhost. Photos up to 20 MB.")}</p></>}
          {stage === 'live' && <><button className="photo-primary" disabled={!camera.ready || !assets} onClick={() => { setCount(3); setStage('countdown') }}><Camera size={22} /> {t("3 秒倒计时拍摄", "Take photo in 3 seconds")}</button><div className="photo-action-row">{camera.canSwitch && <button className="photo-secondary" disabled={camera.busy} onClick={() => void startCamera(camera.facing === 'user' ? 'environment' : 'user')}><RefreshCw size={17} /> {t("切换镜头", "Switch camera")}</button>}<button className="photo-secondary" disabled={camera.busy} onClick={() => inputRef.current?.click()}><Upload size={17} /> {t("改用上传", "Upload instead")}</button></div></>}
          {stage === 'countdown' && <button className="photo-secondary" onClick={() => setStage('live')}>{t("取消倒计时", "Cancel countdown")}</button>}
          {editing && <><button className="photo-primary" disabled={!assets} onClick={() => void generate()}><Sparkles size={19} /> {t("生成我的栖霞留影", "Create my Qixia keepsake")}</button><div className="photo-action-row"><button className="photo-secondary" onClick={() => void startCamera()}><RefreshCw size={17} /> {t("重新拍摄", "Retake photo")}</button><button className="photo-secondary" onClick={() => inputRef.current?.click()}><Upload size={17} /> {t("换张照片", "Choose another photo")}</button></div></>}
          {stage === 'result' && result && <><p className="photo-success" role="status"><Check size={20} /> {t("你的栖霞记忆，已装进相框。", "Your Qixia memory is framed and ready.")}</p><a className="photo-primary" href={result.url} download={`${t("栖霞留影", "qixia-memories")}-${date}.jpg`} onClick={() => setNotice("已发起下载；若手机未自动保存，可长按照片保存到相册。")}><Download size={20} /> {t("保存高清照片", "Save high-resolution photo")}</a>{shareable && <button className="photo-secondary" onClick={() => void share()}><Share2 size={17} /> {t("系统分享", "Share")}</button>}<button className="photo-secondary" onClick={() => setStage('edit')}>{t("返回编辑", "Back to editing")}</button><p className="photo-fineprint">{t("手机也可长按照片保存。系统分享切到后台时，本次页面照片会清空，分享文件由系统继续处理。", "On mobile, long-press to save. System sharing clears this page’s photo when backgrounded; your device continues handling the shared file.")}</p></>}
          {stage !== 'intro' && <button className="photo-end" onClick={() => reset("本次留影已结束，照片与摄像头已清空。")}>{t("结束本次留影并清空", "End session and clear photos")}</button>}
        </section>
        <section className="photo-collection-note"><ShieldCheck size={18} /><p><strong>{kiosk ? t("公共设备 · 安心留影", "Public device · private memories") : t("让美好留在你的设备里", "Keep your memories on your device")}</strong><span>{kiosk ? t(`120 秒无操作自动清空${remaining <= 30 ? ` · 剩余 ${remaining} 秒` : ''}。`, `Automatically cleared after 120 seconds of inactivity${remaining <= 30 ? ` · ${remaining} seconds left` : ''}.`) : t("离开或切到后台，会清空本次照片并关闭摄像头。", "Leaving or switching to the background clears photos and turns off the camera.")}{t("当前未接入临时存储，暂不提供扫码领取，不会上传照片。", "No temporary storage or QR retrieval is available. Photos are never uploaded.")}</span></p></section>
      </aside>
    </div>
    <footer className="photo-footer"><span>{t("一山秋色 · 一刻留影", "Autumn colors · lasting memories")}</span><p>{t("愿你带走的不止照片，还有栖霞的一点温柔。", "Take home more than a photo — a little of Qixia’s warmth.")}</p><span>QIXIA MEMORIES</span></footer>
  </main>
}
