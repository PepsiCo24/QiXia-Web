'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function cameraError(error: unknown) {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '摄像头权限未开启。请在浏览器设置中允许访问，或上传照片继续。'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return '没有找到摄像头，可以上传一张喜欢的照片。'
  if (name === 'NotReadableError' || name === 'TrackStartError') return '摄像头可能正被其他应用占用，请关闭后重试，或上传照片。'
  if (name === 'OverconstrainedError') return '当前摄像头不支持此设置，请换一个摄像头或上传照片。'
  return '暂时无法开启摄像头，请检查设备与权限，或上传照片继续。'
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [canSwitch, setCanSwitch] = useState(false)
  const stop = useCallback(() => {
    generation.current++
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false); setBusy(false); setError('')
  }, [])
  const start = useCallback(async (next: 'user' | 'environment' = 'user') => {
    stop(); setError('')
    if (!window.isSecureContext) { setError('摄像头需要 HTTPS 或 localhost 安全环境。当前仍可上传照片。'); return false }
    if (!navigator.mediaDevices?.getUserMedia) { setError('此浏览器不支持摄像头，请使用较新的浏览器或上传照片。'); return false }
    const id = generation.current
    setBusy(true)
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: next }, width: { ideal: 1920 }, height: { ideal: 1440 } } })
      if (id !== generation.current) { media.getTracks().forEach(track => track.stop()); return false }
      stream.current = media
      const video = videoRef.current
      if (!video) { stop(); return false }
      video.srcObject = media
      await video.play()
      if (id !== generation.current) return false
      const actual = media.getVideoTracks()[0]?.getSettings().facingMode
      setFacing(actual === 'environment' ? 'environment' : next)
      setReady(true)
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      if (id === generation.current) setCanSwitch(devices.filter(device => device.kind === 'videoinput').length > 1)
      return true
    } catch (cause) {
      if (id === generation.current) { stop(); setError(cameraError(cause)) }
      return false
    } finally { if (id === generation.current) setBusy(false) }
  }, [stop])
  useEffect(() => () => { generation.current++; stream.current?.getTracks().forEach(track => track.stop()) }, [])
  return { videoRef, busy, ready, error, facing, canSwitch, start, stop }
}
