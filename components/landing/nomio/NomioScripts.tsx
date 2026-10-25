'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/* Port of the design's animate.js, adapted for React.
   Operates on the server-rendered .nomio DOM via useEffect, with cleanup
   and idempotency guards so it is safe under React strict-mode double-invoke. */
export default function NomioScripts() {
  const pathname = usePathname()
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.nomio')
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(hover: none)').matches || window.innerWidth < 860
    const $ = (s: string, c?: Element | Document) => (c || root).querySelector<HTMLElement>(s)
    const $$ = (s: string, c?: Element | Document) => Array.from((c || root).querySelectorAll<HTMLElement>(s))

    const rafs: number[] = []
    const intervals: ReturnType<typeof setInterval>[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const cleanups: Array<() => void> = []
    const raf = (fn: FrameRequestCallback) => { const id = requestAnimationFrame(fn); rafs.push(id); return id }

    /* ---------- Split text into words for hero reveal ---------- */
    function splitText(el: HTMLElement) {
      if (el.dataset.splitdone === '1') return
      el.dataset.splitdone = '1'
      const html = el.innerHTML
      const frag = document.createDocumentFragment()
      function processNode(node: Node, target: Node) {
        node.childNodes.forEach((child) => {
          if (child.nodeType === 3) {
            const words = (child.textContent || '').split(/(\s+)/)
            words.forEach((w) => {
              if (w.trim() === '') { target.appendChild(document.createTextNode(w)); return }
              const word = document.createElement('span')
              word.className = 'word'
              const inner = document.createElement('span')
              inner.textContent = w
              word.appendChild(inner)
              target.appendChild(word)
            })
          } else if (child.nodeName === 'BR') {
            target.appendChild(document.createElement('br'))
          } else {
            const clone = child.cloneNode(false)
            processNode(child, clone)
            target.appendChild(clone)
          }
        })
      }
      const temp = document.createElement('div')
      temp.innerHTML = html
      processNode(temp, frag)
      el.innerHTML = ''
      el.appendChild(frag)
      el.classList.add('split')
      $$('.word > span', el).forEach((s, i) => { s.style.transitionDelay = (0.04 * i + 0.05) + 's' })
    }
    $$('[data-split]').forEach(splitText)

    /* ---------- In-view system (scroll-position based) ---------- */
    type Watcher = { el: HTMLElement; cb: (el: HTMLElement) => void; ratio: number; done: boolean }
    const watchers: Watcher[] = []
    function watch(el: HTMLElement, cb: (el: HTMLElement) => void, startRatio?: number) {
      watchers.push({ el, cb, ratio: startRatio == null ? 0.88 : startRatio, done: false })
    }
    function checkWatchers() {
      const vh = window.innerHeight
      for (const w of watchers) {
        if (w.done) continue
        const r = w.el.getBoundingClientRect()
        if (r.top < vh * w.ratio && r.bottom > 0) { w.done = true; w.cb(w.el) }
      }
    }

    /* ---------- Reveal with stagger ---------- */
    const revealEls = $$('.reveal, .reveal-l, .reveal-r, .reveal-scale, .split, .sec-head, .img-clip, [data-stagger]')
    if (reduce) {
      revealEls.forEach((el) => el.classList.add('in'))
    } else {
      revealEls.forEach((el) => watch(el, (target) => {
        target.classList.add('in')
        const kids = target.matches('[data-stagger]') ? Array.from(target.children) as HTMLElement[] : []
        kids.forEach((k, i) => { k.style.transitionDelay = (0.08 * i) + 's' })
      }))
    }

    /* ---------- Animated counters ---------- */
    function animateCount(el: HTMLElement) {
      const target = parseFloat(el.dataset.count || '0')
      const dec = parseInt(el.dataset.dec || '0', 10)
      const prefix = el.dataset.prefix || ''
      const suffix = el.dataset.suffix || ''
      const fmt = (v: number) => prefix + v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix
      if (reduce) { el.textContent = fmt(target); return }
      const dur = 1600; const start = performance.now()
      function tick(now: number) {
        const p = Math.min(1, (now - start) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = fmt(target * eased)
        if (p < 1) raf(tick)
      }
      raf(tick)
    }
    $$('[data-count]').forEach((el) => watch(el, animateCount, 0.82))

    /* ---------- Attendance grid light-up ---------- */
    $$('.att-grid').forEach((grid) => watch(grid, (g) => {
      $$('.att-cell', g).forEach((c, i) => { c.style.transitionDelay = (0.035 * i) + 's' })
      g.classList.add('lit')
    }, 0.82))

    /* ---------- Payroll bars fill ---------- */
    $$('[data-bars]').forEach((g) => watch(g, (grid) => {
      $$('.bar > i', grid).forEach((b, i) => { timeouts.push(setTimeout(() => { b.style.width = b.dataset.w || '0' }, 120 * i)) })
    }, 0.82))

    /* ---------- AI chat typewriter ---------- */
    function typeChat(container: HTMLElement) {
      if (reduce) {
        $$('[data-type]', container).forEach((el) => { el.textContent = el.dataset.type || '' })
        $$('.ai-line', container).forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none' })
        return
      }
      const lines = $$('.ai-line', container)
      let delay = 200
      lines.forEach((line) => {
        const typeEl = $('[data-type]', line)
        timeouts.push(setTimeout(() => {
          line.style.opacity = '1'; line.style.transform = 'none'
          if (typeEl) {
            const text = typeEl.dataset.type || ''
            const caret = document.createElement('span'); caret.className = 'ai-caret'
            typeEl.textContent = ''; typeEl.appendChild(caret)
            let i = 0
            const speed = typeEl.dataset.speed ? parseInt(typeEl.dataset.speed, 10) : 24
            const iv = setInterval(() => {
              i++
              typeEl.textContent = text.slice(0, i)
              typeEl.appendChild(caret)
              if (i >= text.length) { clearInterval(iv); timeouts.push(setTimeout(() => caret.remove(), 600)) }
            }, speed)
            intervals.push(iv)
          }
        }, delay))
        delay += (typeEl ? (typeEl.dataset.type || '').length * (parseInt(typeEl.dataset.speed || '24', 10)) + 500 : 500)
      })
    }
    const chatEl = $('[data-chat]')
    if (chatEl) watch(chatEl, typeChat, 0.82)

    /* ---------- AI prompt chips ---------- */
    $$('[data-chip-q]').forEach((chip) => {
      const onClick = () => {
        const chat = $('[data-chat]')
        if (!chat) return
        const q = $('[data-q-text]', chat)
        const a = $('[data-a-text]', chat)
        if (!q || !a) return
        q.dataset.type = chip.dataset.chipQ || ''
        a.dataset.type = chip.dataset.chipA || ''
        $$('.ai-line', chat).forEach((l) => { l.style.opacity = '0'; l.style.transform = 'translateY(12px)' })
        timeouts.push(setTimeout(() => typeChat(chat), 250))
      }
      chip.addEventListener('click', onClick)
      cleanups.push(() => chip.removeEventListener('click', onClick))
    })

    /* ---------- Parallax ---------- */
    const parallaxEls = $$('[data-parallax]')
    function parallax() {
      const vh = window.innerHeight
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '0')
        const rect = el.getBoundingClientRect()
        if (rect.bottom < -200 || rect.top > vh + 200) return
        const center = rect.top + rect.height / 2 - vh / 2
        el.style.transform = 'translate3d(0,' + (-center * speed) + 'px,0)'
      })
    }

    /* ---------- Scroll progress + nav state ---------- */
    const nav = $('.nav')
    const progress = $('.progress')
    function onScroll() {
      const sc = window.scrollY
      if (nav) nav.classList.toggle('scrolled', sc > 30)
      if (progress) {
        const h = document.documentElement.scrollHeight - window.innerHeight
        progress.style.width = (h > 0 ? (sc / h) * 100 : 0) + '%'
      }
      if (!reduce) { parallax(); checkWatchers() }
    }
    let ticking = false
    const scrollHandler = () => {
      if (!ticking) { raf(() => { onScroll(); ticking = false }); ticking = true }
    }
    window.addEventListener('scroll', scrollHandler, { passive: true })
    const resizeHandler = () => { checkWatchers(); if (!reduce) parallax() }
    window.addEventListener('resize', resizeHandler, { passive: true })
    cleanups.push(() => window.removeEventListener('scroll', scrollHandler))
    cleanups.push(() => window.removeEventListener('resize', resizeHandler))

    onScroll()
    checkWatchers()
    let primeStart: number | null = null
    function prime(ts: number) {
      if (primeStart == null) primeStart = ts
      checkWatchers()
      if (ts - primeStart < 1300) raf(prime)
    }
    raf(prime)
    const loadHandler = () => { checkWatchers(); if (!reduce) parallax() }
    window.addEventListener('load', loadHandler)
    cleanups.push(() => window.removeEventListener('load', loadHandler))
    timeouts.push(setTimeout(checkWatchers, 300))

    /* ---------- Custom cursor + magnetic ---------- */
    if (!isTouch && !reduce) {
      const dot = $('.cursor-dot'), ring = $('.cursor-ring')
      if (dot && ring) {
        let mx = window.innerWidth / 2, my = window.innerHeight / 2
        let rx = mx, ry = my
        const moveHandler = (e: MouseEvent) => {
          mx = e.clientX; my = e.clientY
          dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)'
        }
        window.addEventListener('mousemove', moveHandler)
        cleanups.push(() => window.removeEventListener('mousemove', moveHandler))
        const ringLoop = () => {
          rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18
          ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)'
          raf(ringLoop)
        }
        ringLoop()
        $$('a, button, .chip, [data-magnetic], [data-cursor]').forEach((el) => {
          const enter = () => ring.classList.add('is-hover')
          const leave = () => ring.classList.remove('is-hover')
          el.addEventListener('mouseenter', enter); el.addEventListener('mouseleave', leave)
          cleanups.push(() => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave) })
        })
        $$('[data-dark]').forEach((s) => {
          const enter = () => { dot.classList.add('is-dark'); ring.classList.add('is-dark') }
          const leave = () => { dot.classList.remove('is-dark'); ring.classList.remove('is-dark') }
          s.addEventListener('mouseenter', enter); s.addEventListener('mouseleave', leave)
          cleanups.push(() => { s.removeEventListener('mouseenter', enter); s.removeEventListener('mouseleave', leave) })
        })
        $$('[data-magnetic]').forEach((el) => {
          const baseStrength = parseFloat(el.dataset.magnetic || '0.4') || 0.4
          const move = (e: MouseEvent) => {
            const r = el.getBoundingClientRect()
            const x = e.clientX - r.left - r.width / 2
            const y = e.clientY - r.top - r.height / 2
            el.style.transform = 'translate(' + x * baseStrength + 'px,' + y * baseStrength + 'px)'
          }
          const leave = () => { el.style.transform = '' }
          el.addEventListener('mousemove', move as EventListener); el.addEventListener('mouseleave', leave)
          cleanups.push(() => { el.removeEventListener('mousemove', move as EventListener); el.removeEventListener('mouseleave', leave) })
        })
      }
    }

    /* ---------- Mobile menu ---------- */
    const burger = $('.nav-burger'), mmenu = $('.mmenu'), mclose = $('.mmenu-close')
    if (burger && mmenu) {
      const open = () => { mmenu.classList.add('open'); document.body.style.overflow = 'hidden' }
      const close = () => { mmenu.classList.remove('open'); document.body.style.overflow = '' }
      burger.addEventListener('click', open)
      cleanups.push(() => burger.removeEventListener('click', open))
      if (mclose) { mclose.addEventListener('click', close); cleanups.push(() => mclose.removeEventListener('click', close)) }
      $$('a', mmenu).forEach((a) => { a.addEventListener('click', close); cleanups.push(() => a.removeEventListener('click', close)) })
    }

    /* ---------- cleanup ---------- */
    return () => {
      rafs.forEach((id) => cancelAnimationFrame(id))
      intervals.forEach((iv) => clearInterval(iv))
      timeouts.forEach((t) => clearTimeout(t))
      cleanups.forEach((fn) => fn())
      document.body.style.overflow = ''
    }
  }, [pathname])

  return null
}
