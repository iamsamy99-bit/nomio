'use client'
import { useEffect, useRef } from 'react'
import { motion, useAnimation, useInView } from 'framer-motion'

const CYAN = '#06B6D4'
const CYAN_DIM = 'rgba(6,182,212,0.35)'
const CYAN_FAINT = 'rgba(6,182,212,0.10)'
const BLUE = '#3B82F6'

function DrawPath({
  d,
  delay = 0,
  duration = 1.2,
  stroke = CYAN,
  strokeWidth = 1.5,
  fill = 'none',
  glow = false,
}: {
  d: string; delay?: number; duration?: number; stroke?: string
  strokeWidth?: number; fill?: string; glow?: boolean
}) {
  return (
    <>
      {glow && (
        <motion.path
          d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth * 3}
          strokeOpacity={0.15} pathLength={1}
          initial={{ strokeDasharray: 1, strokeDashoffset: 1 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration, delay, ease: 'easeInOut' }}
        />
      )}
      <motion.path
        d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        pathLength={1}
        initial={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration, delay, ease: 'easeInOut' }}
      />
    </>
  )
}

function Window({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  return (
    <motion.rect
      x={x} y={y} width={w} height={h} rx={1}
      initial={{ opacity: 0, fill: 'transparent' }}
      animate={{ opacity: 1, fill: 'rgba(6,182,212,0.25)' }}
      transition={{ duration: 0.4, delay }}
    >
      <animate
        attributeName="fill-opacity"
        values="0.25;0.5;0.25"
        dur={`${2.5 + Math.random() * 1.5}s`}
        repeatCount="indefinite"
        begin={`${delay + 0.5}s`}
      />
    </motion.rect>
  )
}

export default function BlueprintAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref as unknown as React.RefObject<Element>, { once: true, margin: '-100px' })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) controls.start('visible')
  }, [isInView, controls])

  // Floor plan horizontal lines (blueprint phase)
  const floorLines = [60, 95, 130, 165, 200, 235].map((y, i) => ({ y, i }))

  // Building windows: 5 rows x 4 cols in main tower
  const winCols = [185, 215, 245, 275]
  const winRows = [95, 125, 155, 185, 215]
  const windows = winRows.flatMap((y, ri) =>
    winCols.map((x, ci) => ({ x, y, delay: 4.0 + ri * 0.12 + ci * 0.06 }))
  )

  // Wing windows
  const wingWins = [
    { x: 105, y: 155, delay: 4.3 }, { x: 105, y: 185, delay: 4.4 },
    { x: 105, y: 215, delay: 4.5 },
    { x: 340, y: 155, delay: 4.3 }, { x: 340, y: 185, delay: 4.4 },
    { x: 340, y: 215, delay: 4.5 },
  ]

  return (
    <div ref={ref} className="relative w-full h-full select-none">
      <svg
        viewBox="0 0 480 320"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 30px rgba(6,182,212,0.15))' }}
      >
        <defs>
          <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={CYAN_FAINT} strokeWidth="0.5" />
          </pattern>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="build-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.8" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Blueprint grid background */}
        <motion.rect
          x="0" y="0" width="480" height="320"
          fill="url(#bp-grid)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* === PHASE 1: Floor plan horizontal lines === */}
        <motion.g
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 2.8 }}
        >
          {floorLines.map(({ y, i }) => (
            <g key={y}>
              <DrawPath
                d={`M 40 ${y} L 440 ${y}`}
                delay={0.5 + i * 0.15}
                duration={0.8}
                stroke={CYAN_DIM}
                strokeWidth={1}
              />
              {/* Cross marks */}
              <DrawPath
                d={`M 40 ${y - 6} L 40 ${y + 6} M 440 ${y - 6} L 440 ${y + 6}`}
                delay={0.5 + i * 0.15 + 0.6}
                duration={0.3}
                stroke={CYAN_DIM}
                strokeWidth={1}
              />
            </g>
          ))}
          {/* Dimension line */}
          <DrawPath
            d="M 30 60 L 30 235 M 26 60 L 34 60 M 26 235 L 34 235"
            delay={1.4}
            duration={0.5}
            stroke={CYAN_DIM}
            strokeWidth={0.8}
          />
          {/* Label text */}
          <motion.text
            x="15" y="150" fill={CYAN_DIM} fontSize="9" fontFamily="IBM Plex Mono" textAnchor="middle"
            transform="rotate(-90, 15, 150)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.4 }}
          >
            PLANTA TIPO
          </motion.text>
          {/* Room outlines */}
          <DrawPath
            d="M 80 60 L 80 235 M 200 60 L 200 235 M 320 60 L 320 235"
            delay={0.9}
            duration={0.9}
            stroke={CYAN_DIM}
            strokeWidth={0.7}
          />
        </motion.g>

        {/* === PHASE 2: Building elevation rises === */}

        {/* Ground line */}
        <DrawPath
          d="M 30 268 L 450 268"
          delay={2.6}
          duration={0.6}
          stroke={CYAN}
          strokeWidth={1.5}
          glow
        />

        {/* Main tower outline */}
        <DrawPath
          d="M 170 268 L 170 75 L 310 75 L 310 268"
          delay={3.0}
          duration={1.0}
          stroke={CYAN}
          strokeWidth={1.8}
          glow
        />

        {/* Left wing */}
        <DrawPath
          d="M 90 268 L 90 140 L 170 140"
          delay={3.2}
          duration={0.7}
          stroke={CYAN}
          strokeWidth={1.4}
          glow
        />

        {/* Right wing */}
        <DrawPath
          d="M 310 140 L 390 140 L 390 268"
          delay={3.2}
          duration={0.7}
          stroke={CYAN}
          strokeWidth={1.4}
          glow
        />

        {/* Antenna / spire */}
        <DrawPath
          d="M 240 75 L 240 45 M 235 55 L 245 55"
          delay={3.8}
          duration={0.4}
          stroke={CYAN}
          strokeWidth={1.2}
          glow
        />

        {/* Floor level lines on building */}
        {[100, 130, 160, 190, 220, 250].map((y, i) => (
          <DrawPath
            key={y}
            d={`M 170 ${y} L 310 ${y}`}
            delay={3.5 + i * 0.06}
            duration={0.35}
            stroke={CYAN_DIM}
            strokeWidth={0.7}
          />
        ))}

        {/* Wing floor lines */}
        {[160, 190, 220, 250].map((y, i) => (
          <g key={y}>
            <DrawPath d={`M 90 ${y} L 170 ${y}`} delay={3.55 + i * 0.06} duration={0.3} stroke={CYAN_FAINT} strokeWidth={0.6} />
            <DrawPath d={`M 310 ${y} L 390 ${y}`} delay={3.55 + i * 0.06} duration={0.3} stroke={CYAN_FAINT} strokeWidth={0.6} />
          </g>
        ))}

        {/* Vertical dividers */}
        {[200, 230, 260, 290].map((x, i) => (
          <DrawPath
            key={x}
            d={`M ${x} 75 L ${x} 268`}
            delay={3.6 + i * 0.05}
            duration={0.5}
            stroke={CYAN_FAINT}
            strokeWidth={0.6}
          />
        ))}

        {/* Main tower windows */}
        {windows.map(({ x, y, delay }, idx) => (
          <Window key={idx} x={x} y={y} w={22} h={18} delay={delay} />
        ))}

        {/* Wing windows */}
        {wingWins.map(({ x, y, delay }, idx) => (
          <Window key={`w${idx}`} x={x} y={y} w={16} h={18} delay={delay} />
        ))}

        {/* Dimension marks */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.2, duration: 0.5 }}
        >
          <line x1="170" y1="278" x2="310" y2="278" stroke={CYAN_DIM} strokeWidth="0.8" />
          <line x1="170" y1="274" x2="170" y2="282" stroke={CYAN_DIM} strokeWidth="0.8" />
          <line x1="310" y1="274" x2="310" y2="282" stroke={CYAN_DIM} strokeWidth="0.8" />
          <text x="240" y="290" fill={CYAN_DIM} fontSize="7" fontFamily="IBM Plex Mono" textAnchor="middle">14.0 m</text>

          <line x1="160" y1="75" x2="160" y2="268" stroke={CYAN_DIM} strokeWidth="0.8" />
          <line x1="156" y1="75" x2="164" y2="75" stroke={CYAN_DIM} strokeWidth="0.8" />
          <line x1="156" y1="268" x2="164" y2="268" stroke={CYAN_DIM} strokeWidth="0.8" />
          <text x="148" y="172" fill={CYAN_DIM} fontSize="7" fontFamily="IBM Plex Mono" textAnchor="middle" transform="rotate(-90, 148, 172)">18.5 m</text>
        </motion.g>

        {/* "ELEVACIÓN PRINCIPAL" label */}
        <motion.text
          x="240" y="308" fill={CYAN_DIM} fontSize="8" fontFamily="IBM Plex Mono" textAnchor="middle"
          letterSpacing="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.8, duration: 0.5 }}
        >
          ELEVACIÓN PRINCIPAL — ESC. 1:100
        </motion.text>

        {/* Corner brackets */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 4.5, duration: 0.5 }}
        >
          <path d="M 20 20 L 20 40 L 40 40" fill="none" stroke={CYAN} strokeWidth="1.5" />
          <path d="M 460 20 L 460 40 L 440 40" fill="none" stroke={CYAN} strokeWidth="1.5" />
          <path d="M 20 300 L 20 280 L 40 280" fill="none" stroke={CYAN} strokeWidth="1.5" />
          <path d="M 460 300 L 460 280 L 440 280" fill="none" stroke={CYAN} strokeWidth="1.5" />
        </motion.g>

        {/* Top title */}
        <motion.text
          x="240" y="30" fill={CYAN} fontSize="9" fontFamily="IBM Plex Mono" textAnchor="middle"
          letterSpacing="3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          PROYECTO CONSTRUCTORA — NOMIO v1.0
        </motion.text>
      </svg>
    </div>
  )
}
