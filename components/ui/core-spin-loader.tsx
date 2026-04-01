'use client'

import React, { useState, useEffect } from 'react'

type CoreSpinLoaderProps = {
  showText?: boolean
  size?: number
  className?: string
  disableBlur?: boolean
  variant?: 'emerald' | 'forge' | 'alien'
}

export function CoreSpinLoader({
  showText = true,
  size = 80,
  className = '',
  disableBlur = false,
  variant = 'emerald'
}: CoreSpinLoaderProps) {
  const [loadingText, setLoadingText] = useState('Initializing')

  useEffect(() => {
    if (!showText) return
    const states = ['Loading...', 'Fetching Data..', 'Syncing...', 'Processing..', 'Optimizing...']
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % states.length
      setLoadingText(states[i])
    }, 1000)

    return () => clearInterval(interval)
  }, [showText])

  const rootClassName = [
    'flex flex-col items-center justify-center',
    showText ? 'min-h-[200px] gap-8' : 'gap-2',
    className
  ]
    .filter(Boolean)
    .join(' ')

  const palette =
    variant === 'forge'
      ? {
          baseGlow: 'bg-[#1A1410]',
          outerRing: 'border-[#6B4B1F]/35',
          mainArc: 'border-t-[#C08A3A]/55',
          mainShadow: 'shadow-none',
          reverseArc: 'border-b-[#6B4B1F]/35',
          reverseShadow: 'shadow-none',
          innerRing: 'border-l-[#8B5E23]/40',
          dot: 'bg-[#C08A3A]/70',
          dotShadow: 'shadow-none',
          core: 'bg-[#C08A3A]/80',
          coreShadow: 'shadow-none',
          text: 'text-[#C08A3A]/70'
        }
      : variant === 'alien'
      ? {
          baseGlow: 'bg-cyan-400/15',
          outerRing: 'border-cyan-400/40',
          mainArc: 'border-t-cyan-300',
          mainShadow: 'shadow-[0_0_6px_rgba(34,211,238,0.55)]',
          reverseArc: 'border-b-blue-500/80',
          reverseShadow: 'shadow-[0_0_6px_rgba(59,130,246,0.45)]',
          innerRing: 'border-l-cyan-200/70',
          dot: 'bg-cyan-300',
          dotShadow: 'shadow-[0_0_4px_rgba(34,211,238,0.9)]',
          core: 'bg-blue-300',
          coreShadow: 'shadow-[0_0_6px_rgba(59,130,246,0.6)]',
          text: 'text-cyan-200/80'
        }
      : {
          baseGlow: 'bg-emerald-400/15 dark:bg-cyan-500/10',
          outerRing: 'border-emerald-500/40 dark:border-cyan-500/20',
          mainArc: 'border-t-emerald-500 dark:border-t-cyan-400',
          mainShadow: 'shadow-[0_0_6px_rgba(16,185,129,0.5)] dark:shadow-[0_0_10px_rgba(34,211,238,0.4)]',
          reverseArc: 'border-b-green-600 dark:border-b-purple-500',
          reverseShadow: 'shadow-[0_0_6px_rgba(22,163,74,0.4)] dark:shadow-[0_0_10px_rgba(168,85,247,0.4)]',
          innerRing: 'border-l-green-700/60 dark:border-l-white/50',
          dot: 'bg-emerald-600 dark:bg-cyan-400',
          dotShadow: 'shadow-[0_0_4px_rgba(16,185,129,0.9)] dark:shadow-[0_0_6px_rgba(34,211,238,0.8)]',
          core: 'bg-emerald-700 dark:bg-white',
          coreShadow: 'shadow-[0_0_6px_rgba(16,185,129,0.6)] dark:shadow-[0_0_10px_rgba(255,255,255,0.8)]',
          text: 'text-emerald-700 dark:text-cyan-200/70'
        }

  return (
    <div className={rootClassName}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >

        {/* Base Glow */}
        <div
          className={`
          absolute inset-0 rounded-full animate-pulse
          ${palette.baseGlow}
          ${disableBlur ? '' : 'blur-xl'}
        `}
        />

        {/* Outer Dashed Ring */}
        <div className={`
          absolute inset-0 rounded-full border border-dashed
          ${palette.outerRing}
          animate-[spin_10s_linear_infinite]
        `} />

        {/* Main Arc */}
        <div className={`
          absolute inset-1 rounded-full border-2 border-transparent
          ${palette.mainArc}
          ${palette.mainShadow}
          animate-[spin_2s_linear_infinite]
        `} />

        {/* Reverse Arc */}
        <div className={`
          absolute inset-3 rounded-full border-2 border-transparent
          ${palette.reverseArc}
          ${palette.reverseShadow}
          animate-[spin_3s_linear_infinite_reverse]
        `} />

        {/* Inner Fast Ring */}
        <div className={`
          absolute inset-5 rounded-full border border-transparent
          ${palette.innerRing}
          animate-[spin_1s_ease-in-out_infinite]
        `} />

        {/* Orbital Dot 1 */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          <div className={`
            absolute top-0 left-1/2 -translate-x-1/2
            w-1 h-1 rounded-full
            ${palette.dot}
            ${palette.dotShadow}
          `} />
        </div>

        {/* Orbital Dot 2 (Faster and different angle) */}
        <div className="absolute inset-2 animate-[spin_2.5s_linear_infinite_reverse]">
          <div className={`
            absolute bottom-0 left-1/2 -translate-x-1/2
            w-1 h-1 rounded-full opacity-60
            ${palette.dot}
            ${palette.dotShadow}
          `} />
        </div>

        {/* Center Core */}
        <div className={`
          absolute w-2 h-2 rounded-full animate-pulse
          ${palette.core}
          ${palette.coreShadow}
        `} />
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col items-center gap-1 h-8 justify-center">
          <span
            key={loadingText}
            className={`
              text-[10px] font-medium tracking-[0.3em] uppercase
              ${palette.text}
              animate-in fade-in slide-in-from-bottom-2 duration-500
            `}
          >
            {loadingText}
          </span>
        </div>
      )}
    </div>
  )
}
