import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useNavigate } from 'react-router-dom'

const DEMO_IMAGES: { id: string; src: string }[] = [
  { id: 'p1', src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1920&auto=format&fit=crop' },
  { id: 'p2', src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop' },
  { id: 'p3', src: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1920&auto=format&fit=crop' },
  { id: 'p4', src: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1920&auto=format&fit=crop' },
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

export default function PhotoCarouselPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const { visible, toggle, setVisible } = useVisibilityToggle(true)

  const images = useMemo(() => DEMO_IMAGES, [])
  const total = images.length

  const go = useCallback((i: number) => {
    setIndex(() => (i + total) % total)
  }, [total])

  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  useWheelAndSwipe(next, prev)

  // 5 seconds per image timeline
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | null>(null)
  const startTs = useRef<number>(0)

  useEffect(() => {
    cancelAnimationFrame(raf.current || 0)
    setProgress(0)
    startTs.current = performance.now()

    const step = () => {
      const elapsed = performance.now() - startTs.current
      const durationMs = 5000
      const p = Math.min(1, elapsed / durationMs)
      setProgress(p)
      if (p >= 1) {
        next()
      } else {
        raf.current = requestAnimationFrame(step)
      }
    }

    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current || 0)
  }, [index, next])

  useEffect(() => {
    const onMove = () => { if (!visible) setVisible(true) }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [visible, setVisible])

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { duration: 0.2, ease: 'power2.out' } })
    tl.to('.overlay-ui', { opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' })
    return () => { tl.kill() }
  }, [visible])

  const onTap = useCallback(() => {
    toggle()
  }, [toggle])

  return (
    <div className="relative h-screen w-screen bg-black" onClick={onTap}>
      {/* Media layer */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {images.map((img, i) => (
            <motion.img
              key={img.id + (i === index)}
              className="absolute inset-0 h-full w-full object-cover"
              src={img.src}
              alt=""
              initial={{ opacity: i === index ? 0 : 0 }}
              animate={{ opacity: i === index ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Overlay UI */}
      <div className="overlay-ui pointer-events-none absolute inset-0 flex flex-col">
        {/* Top bar with timeline + logo */}
        <div className="pointer-events-auto flex items-center justify-between p-3 sm:p-4">
          <div className="flex-1 max-w-[80%] sm:max-w-[70%] mr-3">
            <div className="flex gap-1">
              {images.map((_, i) => (
                <div key={i} className="h-1 w-full bg-white/20 rounded">
                  <div className="h-full bg-white rounded" style={{ width: `${i === index ? progress * 100 : i < index ? 100 : 0}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-auto">
            <LogoButton />
          </div>
        </div>

        <div className="flex-1" />

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

      <FullScreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} onGoVideos={() => navigate('/videos')} />
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

function FullScreenMenu({ open, onClose, onGoVideos }: { open: boolean; onClose: () => void; onGoVideos: () => void }) {
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
              <a className="hover:text-white/90" onClick={onGoVideos}>Videos</a>
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