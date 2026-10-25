'use client'
import { useState, useEffect } from 'react'

export default function BuildingAnimation() {
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="relative w-full max-w-[500px] h-[500px] mx-auto flex items-center justify-center overflow-hidden rounded-3xl border transition-all duration-700"
      style={{
        background: hovered 
          ? 'radial-gradient(circle at center, rgba(6, 182, 212, 0.12) 0%, rgba(5, 5, 7, 1) 70%)'
          : 'radial-gradient(circle at center, rgba(6, 182, 212, 0.03) 0%, rgba(5, 5, 7, 1) 70%)',
        borderColor: hovered ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.08)',
        boxShadow: hovered 
          ? '0 0 40px -10px rgba(6, 182, 212, 0.15), inset 0 0 20px rgba(6, 182, 212, 0.05)'
          : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background blueprint grid lines */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: hovered ? 0.35 : 0.2,
        }}
      />

      {/* Decorative Blueprint Coordinates / Info */}
      <div className="absolute top-4 left-4 font-mono text-[9px] text-cyan-500/40 select-none space-y-1">
        <p>SYS.MODEL: NOMIO_BLUEPRINT_3D</p>
        <p>SCALE: 1:250 | PLOT: ACTIVE</p>
        <p>GRID_COORD: 19.4326° N, 99.1332° W</p>
      </div>

      <div className="absolute bottom-4 right-4 font-mono text-[9px] text-cyan-500/40 select-none text-right space-y-1">
        <p>RENDER_ENGINE: WEBGL_VECTOR</p>
        <p>STATUS: {hovered ? 'CALCULATING_VOLUME...' : 'WAITING_INTERACTION'}</p>
        <p>© 2026 NOMIO ARCHITECTURE</p>
      </div>

      {/* Main SVG Vector Container */}
      <svg
        viewBox="0 0 400 400"
        className="w-[85%] h-[85%] z-10 select-none overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glowing gradients */}
          <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="amberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
          </linearGradient>

          {/* Semi-transparent 3D solid face gradients */}
          <linearGradient id="faceLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="faceRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.05" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 3D Solid Faces (Visible on hover to simulate transition from wireframe/flat blueprint to solid building) */}
        <g 
          className="transition-opacity duration-1000 ease-in-out" 
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {/* Base Platform Solid Face */}
          <path d="M 200,320 L 290,270 L 200,230 L 110,270 Z" fill="rgba(6, 182, 212, 0.08)" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="0.5" />
          
          {/* Lower Block Solid Faces */}
          <path d="M 120,265 L 200,305 L 200,190 L 120,150 Z" fill="url(#faceLeft)" />
          <path d="M 200,305 L 280,265 L 280,150 L 200,190 Z" fill="url(#faceRight)" />
          <path d="M 120,150 L 200,190 L 280,150 L 200,110 Z" fill="rgba(6, 182, 212, 0.15)" stroke="rgba(6, 182, 212, 0.3)" />

          {/* Upper Tower Solid Faces */}
          <path d="M 150,125 L 200,150 L 200,70 L 150,45 Z" fill="url(#faceLeft)" />
          <path d="M 200,150 L 250,125 L 250,45 L 200,70 Z" fill="url(#faceRight)" />
          <path d="M 150,45 L 200,70 L 250,45 L 200,20 Z" fill="url(#cyanGlow)" />
        </g>

        {/* Animated Blueprint Line Drawing (Always visible, draws with glowing strokes) */}
        <g filter="url(#glow)">
          {/* Floor & Base Guidelines */}
          <path 
            d="M 50,300 L 200,375 L 350,300 M 200,375 L 200,390" 
            stroke="rgba(6, 182, 212, 0.3)" 
            strokeWidth="1" 
            strokeDasharray="4 4" 
          />

          {/* Tower Outline - Left Side */}
          <path
            d="M 120,265 L 120,150 L 150,135 L 150,45 L 200,20"
            stroke="url(#cyanGlow)"
            strokeWidth={hovered ? "2" : "1.5"}
            className="blueprint-path-left"
            style={{
              transition: 'stroke-width 0.4s ease',
            }}
          />

          {/* Tower Outline - Right Side */}
          <path
            d="M 280,265 L 280,150 L 250,135 L 250,45 L 200,20"
            stroke="url(#cyanGlow)"
            strokeWidth={hovered ? "2" : "1.5"}
            className="blueprint-path-right"
            style={{
              transition: 'stroke-width 0.4s ease',
            }}
          />

          {/* Central Axis & Verticals */}
          <path 
            d="M 200,390 L 200,20" 
            stroke="rgba(6, 182, 212, 0.25)" 
            strokeWidth="0.75" 
            strokeDasharray="8 6" 
          />
          
          <path 
            d="M 200,305 L 200,70" 
            stroke="url(#cyanGlow)" 
            strokeWidth="1.5" 
          />

          {/* Lower Structure Divisions & Internal Perspective Lines */}
          <path d="M 120,225 L 200,265 L 280,225" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
          <path d="M 120,185 L 200,225 L 280,185" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
          
          {/* Upper Structure Divisions */}
          <path d="M 150,105 L 200,130 L 250,105" stroke="url(#cyanGlow)" strokeWidth="1" />
          <path d="M 150,75 L 200,100 L 250,75" stroke="url(#cyanGlow)" strokeWidth="1" />

          {/* Diagonal Structural Cross Bracings (Amber contrast lines, active on hover) */}
          <path 
            d="M 120,265 L 200,225 M 200,265 L 120,225 M 200,265 L 280,225 M 280,265 L 200,225" 
            stroke="url(#amberGlow)" 
            strokeWidth="1" 
            className="transition-all duration-700"
            style={{ 
              opacity: hovered ? 0.95 : 0.2, 
              strokeWidth: hovered ? '1.25' : '0.75' 
            }} 
          />

          <path 
            d="M 120,225 L 200,185 M 200,225 L 120,185 M 200,225 L 280,185 M 280,225 L 200,185" 
            stroke="url(#amberGlow)" 
            strokeWidth="1" 
            className="transition-all duration-700"
            style={{ 
              opacity: hovered ? 0.95 : 0.2, 
              strokeWidth: hovered ? '1.25' : '0.75' 
            }} 
          />

          {/* Laser Scanners (Glowing Amber dots sweeping over the building when hovered) */}
          {hovered && (
            <g className="animate-pulse">
              <circle cx="200" cy="70" r="3" fill="#fbbf24" filter="url(#glow)" />
              <line x1="50" y1="70" x2="350" y2="70" stroke="rgba(251, 191, 36, 0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
              
              <circle cx="200" cy="190" r="3.5" fill="#fbbf24" filter="url(#glow)" />
              <line x1="50" y1="190" x2="350" y2="190" stroke="rgba(251, 191, 36, 0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
            </g>
          )}

          {/* Compass / Angle Measure Indicators */}
          <path 
            d="M 80,100 A 30 30 0 0 1 110,120" 
            stroke="rgba(6, 182, 212, 0.25)" 
            strokeWidth="0.75" 
            strokeDasharray="2 2" 
          />
          <text x="70" y="95" className="font-mono text-[8px] fill-cyan-500/40">R:45.00°</text>
          
          <path 
            d="M 320,100 A 30 30 0 0 0 290,120" 
            stroke="rgba(6, 182, 212, 0.25)" 
            strokeWidth="0.75" 
            strokeDasharray="2 2" 
          />
          <text x="315" y="95" className="font-mono text-[8px] fill-cyan-500/40">L:45.00°</text>
        </g>
      </svg>

      {/* CSS Animation Keyframes for stroke dash drawing effect */}
      <style jsx global>{`
        @keyframes blueprint-draw {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .blueprint-path-left {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: blueprint-draw 5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .blueprint-path-right {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: blueprint-draw 5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  )
}
