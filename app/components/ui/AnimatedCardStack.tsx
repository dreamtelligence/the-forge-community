"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Layers, Mic, ShieldCheck, ArrowRight, Zap, Truck, MessageSquare, BarChart, Plug } from "lucide-react"
import { cn } from "@/lib/utils"

interface Card {
  id: number
  contentType: 1 | 2 | 3 | 4 | 5 | 6 | 7
}

const TOTAL_CARDS = 7

const cardData = {
  1: {
    title: "B2B SOURCING ENGINE.",
    description: "Direkter Zugang zu 50+ verifizierten Großhändlern. Samples & Orders per Klick. Kein Zwischenhändler, volle Marge für deine Brand.",
    gradient: "from-rose-500 via-red-600 to-orange-700",
    icon: Truck,
    font: "font-serif italic",
  },
  2: {
    title: "AD CAMPAIGN CONTROL.",
    description: "Vom Asset zur Ad. Verwalte Kampagnen, tracke den ROI und skaliere Winning-Creatives direkt aus dem Dashboard. Data-Driven Execution.",
    gradient: "from-purple-500 via-fuchsia-600 to-pink-700",
    icon: BarChart,
    font: "font-mono uppercase tracking-widest",
  },
  3: {
    title: "COMMUNITY BRAIN.",
    description: "Das Forum, das mitdenkt. Orion AI analysiert alle Threads, erkennt Trends und generiert Bilder direkt im Chat. Schwarmintelligenz auf Steroiden.",
    gradient: "from-cyan-500 via-blue-600 to-indigo-700",
    icon: MessageSquare,
    font: "font-sans font-bold",
  },
  4: {
    title: "VIDEO CHAIN REACTION.",
    description: "Erstelle 60s Viral-Clips aus 6x 10s Sequenzen. Der letzte Frame wird zum Start des nächsten. Perfekte Konsistenz mit Veo, Kling & Luma in einer Pipeline.",
    gradient: "from-amber-500 via-yellow-600 to-orange-700",
    icon: Layers,
    font: "font-sans font-black tracking-tighter",
  },
  5: {
    title: "IDENTITY FIRST. VOICE SYNC.",
    description: "Erst das Model (Flux), dann das Video. Dazu voll integrierte ElevenLabs Voice-Engine für emotionale Hooks. Dein Avatar spricht, wie du willst.",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    icon: Mic,
    font: "font-sans font-black tracking-tighter",
  },
  6: {
    title: "SAFE OPERATIONS. NO DRAMA.",
    description: "Rechtssichere Nutzung aller Assets dank integrierter Lizenzen. B2B-Vertragsmanagement und AI-Support regeln den Papierkram im Hintergrund.",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    icon: ShieldCheck,
    font: "font-mono uppercase tracking-widest",
  },
  7: {
    title: "INTEGRATION STACK.",
    description: "Native Syncs mit Slack & Notion plus API-Keys für Automations (n8n, Make, Zapier). Kein Copy-Paste mehr, alles fließt.",
    gradient: "from-slate-500 via-zinc-600 to-stone-700",
    icon: Plug,
    font: "font-sans font-bold tracking-tight",
  },
}

const initialCards: Card[] = [
  { id: 1, contentType: 1 },
  { id: 2, contentType: 2 },
  { id: 3, contentType: 3 },
]

const positionStyles = [
  { scale: 1, y: 0, opacity: 1 },
  { scale: 0.94, y: -25, opacity: 0.6 },
  { scale: 0.88, y: -50, opacity: 0.3 },
]

const exitAnimation = {
  y: 300,
  scale: 0.9,
  opacity: 0,
  transition: { duration: 0.4, ease: "easeOut" }
}

function CardContent({ contentType }: { contentType: 1 | 2 | 3 | 4 | 5 | 6 | 7 }) {
  const data = cardData[contentType]
  const Icon = data.icon

  return (
    <div className="flex h-full w-full flex-col p-6 text-white relative overflow-hidden group">
      {/* Background Gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", data.gradient)} />
      
      {/* Texture Overlay */}
      <div className="absolute inset-0 industrial-texture opacity-20 group-hover:scale-110 transition-transform duration-700" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="hidden sm:flex w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl items-center justify-center mb-6 border border-white/30">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className={cn("text-2xl sm:text-4xl mb-3 leading-tight", data.font)}>
            {data.title}
          </h3>
          <p className="text-white/80 text-xs sm:text-base leading-relaxed max-w-[90%]">
            {data.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-4">
          <span>Feature ansehen</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  )
}

function AnimatedCard({
  card,
  index,
  isAnimating,
}: {
  card: Card
  index: number
  isAnimating: boolean
}) {
  const style = positionStyles[index] ?? positionStyles[2]
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index

  return (
    <motion.div
      key={card.id}
      initial={{ y: -50, scale: 0.8, opacity: 0 }}
      animate={{ y: style.y, scale: style.scale, opacity: style.opacity }}
      exit={exitAnimation as any}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      style={{
        zIndex,
        left: "50%",
        x: "-50%",
        bottom: 40,
      }}
      className="absolute flex h-[360px] w-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl will-change-transform sm:w-[500px] glass-card"
    >
      <CardContent contentType={card.contentType} />
    </motion.div>
  )
}

export default function AnimatedCardStack() {
  const [cards, setCards] = useState(initialCards)
  const [isAnimating, setIsAnimating] = useState(false)
  const [nextId, setNextId] = useState(4)

  const handleAnimate = () => {
    if (isAnimating) return
    setIsAnimating(true)

    // Cycle through 1 to TOTAL_CARDS
    const nextContentType = ((cards[2].contentType % TOTAL_CARDS) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7

    setCards([...cards.slice(1), { id: nextId, contentType: nextContentType }])
    setNextId((prev) => prev + 1)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 400)
  }

  return (
    <div className="flex w-full flex-col items-center justify-center py-12">
      <div className="relative h-[460px] w-full overflow-hidden sm:w-[600px]">
        <AnimatePresence initial={false}>
          {cards.slice(0, 3).map((card, index) => (
            <AnimatedCard key={card.id} card={card} index={index} isAnimating={isAnimating} />
          ))}
        </AnimatePresence>
      </div>

      <div className="relative z-20 mt-4">
        <button
          onClick={handleAnimate}
          className="btn-shimmer flex h-12 cursor-pointer select-none items-center justify-center gap-3 overflow-hidden rounded-full bg-[var(--foreground)] px-8 text-sm font-bold uppercase tracking-widest text-[var(--background)] transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Next Card
          <Zap className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  )
}
