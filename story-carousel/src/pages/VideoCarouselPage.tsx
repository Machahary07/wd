import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useNavigate } from 'react-router-dom'

// Simple demo data; replace srcs with your CDN/hosted video URLs (HLS/MP4)
const DEMO_VIDEOS: { id: string; src: string; duration?: number }[] = [
  { id: 'v1', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  { id: 'v2', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm' },
  { id: 'v3', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
]

function useVisibilityToggle(initial = true) {
  const [visible, setVisible] = useState(initial)
  const toggle = useCallback(() => setVisible((v) => !v), [])
  return { visible, toggle, setVisible }
}

function useWheelAndSwipe(onNext: () => void, onPrev: () => void) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isThrottled = useRef(false)

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (isThrottled.current) return
      const delta = e.deltaY
      if (Math.abs(delta) < 20) return
      if (delta > 0) onNext()
      else onPrev()
      isThrottled.current = true
      setTimeout(() => (isThrottled.current = false), 400)
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      touchStartX.current = t.clientX
      touchStartY.current = t.clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      // prevent native bounce for horizontal swipes
      if (e.cancelable) e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current == null || touchStartY.current == null) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStartX.current
      const dy = t.clientY - touchStartY.current
      const isHorizontal = Math.abs(dx) > Math.abs(dy)
      const threshold = 40
      if (isHorizontal && Math.abs(dx) > threshold) {
        if (dx < 0) onNext()
        else onPrev()
      }
      touchStartX.current = null
      touchStartY.current = null
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove as any)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onNext, onPrev])
}

export default function VideoCarouselPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const videoRefs = useRef<HTMLVideoElement[]>([])
  const { visible, toggle, setVisible } = useVisibilityToggle(true)

  const videos = useMemo(() => DEMO_VIDEOS, [])
  const total = videos.length

  const go = useCallback((i: number) => {
    setIndex(() => {
      const next = (i + total) % total
      return next
    })
  }, [total])

  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  useWheelAndSwipe(next, prev)

  useEffect(() => {
    // Autoplay current video; pause others
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === index) {
        v.currentTime = 0
        const playPromise = v.play()
        if (playPromise) playPromise.catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [index])

  useEffect(() => {
    // Show UI again on mouse move after hidden
    const onMove = () => {
      if (!visible) setVisible(true)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [visible, setVisible])

  useEffect(() => {
    // Small fade for UI show/hide
    const tl = gsap.timeline({ defaults: { duration: 0.2, ease: 'power2.out' } })
    tl.to('.overlay-ui', { opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' })
    return () => { tl.kill() }
  }, [visible])

  const onVideoEnded = useCallback(() => {
    next()
  }, [next])

  const onTimelineClick = useCallback(() => {
    toggle()
  }, [toggle])

  return (
    <div className="relative h-screen w-screen bg-black" onClick={onTimelineClick}>
      {/* Media layer */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {videos.map((v, i) => (
            <motion.div
              key={v.id + (i === index)}
              className="absolute inset-0"
              initial={{ opacity: i === index ? 0 : 0 }}
              animate={{ opacity: i === index ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <video
                ref={(el) => {
                  if (el) videoRefs.current[i] = el
                }}
                className="h-full w-full object-cover"
                src={v.src}
                playsInline
                muted
                autoPlay={i === index && isPlaying}
                onEnded={onVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                preload="metadata"
                controls={false}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tap target layer captures toggles; actual UI is inside and excluded from toggle propagation by stopPropagation */}

      {/* Overlay UI */}
      <div className="overlay-ui pointer-events-none absolute inset-0 flex flex-col">
        {/* Top bar with timeline + right logo */}
        <div className="pointer-events-auto flex items-center justify-between p-3 sm:p-4">
          {/* Timeline bar */}
          <div className="flex-1 max-w-[80%] sm:max-w-[70%] mr-3">
            <div className="flex gap-1">
              {videos.map((_, i) => (
                <Segment key={i} active={i === index} videoRef={videoRefs.current[i]} />
              ))}
            </div>
          </div>
          {/* Logo placeholder (top-right) */}
          <div className="pointer-events-auto">
            <LogoButton />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom controls: arrows + hamburger */}
        <div className="pointer-events-auto flex items-center justify-between p-3 sm:p-4">
          <button
            aria-label="Previous"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="text-white/90 hover:text-white active:scale-95 transition-transform text-2xl sm:text-3xl"
          >
            {'<'}
          </button>

          <button
            aria-label="Menu"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
            className="text-white/90 hover:text-white active:scale-95 transition-transform"
          >
            <HamburgerIcon />
          </button>

          <button
            aria-label="Next"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="text-white/90 hover:text-white active:scale-95 transition-transform text-2xl sm:text-3xl"
          >
            {'>'}
          </button>
        </div>
      </div>

      {/* Fullscreen Menu */}
      <FullScreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} onGoPhotos={() => navigate('/photos')} />
    </div>
  )
}

function Segment({ active, videoRef }: { active: boolean; videoRef?: HTMLVideoElement }) {
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const v = videoRef
    if (!v) return

    const update = () => {
      const duration = Math.max(0.01, v.duration || 0)
      const value = Math.min(1, v.currentTime / duration)
      setProgress(value)
      raf.current = requestAnimationFrame(update)
    }

    if (active) {
      cancelAnimationFrame(raf.current || 0)
      raf.current = requestAnimationFrame(update)
    } else {
      cancelAnimationFrame(raf.current || 0)
      setProgress(0)
    }

    return () => {
      cancelAnimationFrame(raf.current || 0)
    }
  }, [active, videoRef])

  return (
    <div className="h-1 w-full bg-white/20 rounded">
      <div
        className="h-full bg-white rounded"
        style={{ width: `${active ? progress * 100 : 0}%`, transition: active ? 'none' : 'width .2s ease' }}
      />
    </div>
  )
}

function LogoButton() {
  return (
    <button aria-label="Logo" className="rounded-full bg-white/10 p-2 backdrop-blur-sm">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5Zm0 7L2 4v13l10 5 10-5V4l-10 5Z" fill="currentColor" />
      </svg>
    </button>
  )
}

function HamburgerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FullScreenMenu({ open, onClose, onGoPhotos }: { open: boolean; onClose: () => void; onGoPhotos: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 p-6 sm:p-10 flex flex-col">
            <div className="flex justify-end">
              <button aria-label="Close Menu" onClick={onClose} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col items-start justify-center gap-6 text-xl sm:text-2xl">
              <a className="hover:text-white/90" onClick={onGoPhotos}>Photos</a>
              <a className="hover:text-white/90" href="#about">About the couples</a>
              <a className="hover:text-white/90" href="#company">Built by Company</a>
              <a className="hover:text-white/90" href="#socials">Social Links</a>
              <a className="hover:text-white/90" href="#contact">Contact</a>
            </div>

            <div className="text-xs text-white/60">© {new Date().getFullYear()} Your Company</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}