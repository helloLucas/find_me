"use client"

import { useState, useEffect, useCallback } from "react"

interface GlitchTextProps {
  text: string
  className?: string
  glitchInterval?: [number, number] // [min, max] in ms
  glitchDuration?: number // in ms
}

const GLITCH_CHARS = "!@#$%^&*()_+{}[]|;:,.<>?/\\0123456789ABCDEFØπΩΣ"

export default function GlitchText({ 
  text, 
  className = "", 
  glitchInterval = [4000, 8000],
  glitchDuration = 600 
}: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)

  const scramble = useCallback((originalText: string) => {
    return originalText
      .split("")
      .map((char) => {
        if (char === " ") return " "
        // 30% chance to change a character during glitch
        return Math.random() > 0.7 
          ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
          : char
      })
      .join("")
  }, [])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const triggerGlitch = () => {
      setIsGlitching(true)
      
      // Scramble several times during the glitch duration
      const scrambleInterval = setInterval(() => {
        setDisplayText(scramble(text))
      }, 150)

      setTimeout(() => {
        clearInterval(scrambleInterval)
        setDisplayText(text)
        setIsGlitching(false)
        
        // Schedule next glitch
        const nextInterval = Math.floor(Math.random() * (glitchInterval[1] - glitchInterval[0])) + glitchInterval[0]
        timeoutId = setTimeout(triggerGlitch, nextInterval)
      }, glitchDuration)
    }

    // Initial delay
    const initialDelay = Math.floor(Math.random() * glitchInterval[0])
    timeoutId = setTimeout(triggerGlitch, initialDelay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [text, scramble, glitchInterval, glitchDuration])

  return (
    <span className={`${className} ${isGlitching ? "glitch-jitter" : ""} transition-all duration-75`}>
      {displayText}
    </span>
  )
}
