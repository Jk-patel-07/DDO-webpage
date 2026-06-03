import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FloatingSymbol } from '../types';

export default function MathParticles() {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  useEffect(() => {
    // Generate distinct science-math constants and symbols
    const mathChars = ['∑', 'π', '√', '∫', 'x²', 'dy/dx', 'λ', '∞', 'θ', 'sin(x)', 'f(n)', 'Δ', 'log(y)', 'e=mc²'];
    
    const initialSymbols: FloatingSymbol[] = Array.from({ length: 24 }).map((_, i) => {
      const char = mathChars[i % mathChars.length];
      return {
        id: `sym-${i}-${Math.random()}`,
        char,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 20 + 14, // size from 14px to 34px
        speedX: (Math.random() - 0.5) * 0.08,
        speedY: (Math.random() - 0.5) * 0.08 - 0.04, // slight upward drift
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.45 + 0.15,
        glow: Math.random() > 0.5
      };
    });

    setSymbols(initialSymbols);

    // Frame update loop
    let animationId: number;
    const updatePhysics = () => {
      setSymbols((prev) =>
        prev.map((sym) => {
          let newX = sym.x + sym.speedX;
          let newY = sym.y + sym.speedY;
          let newRotation = sym.rotation + sym.rotationSpeed;

          // Wrap around borders gracefully
          if (newX < -10) newX = 110;
          if (newX > 110) newX = -10;
          if (newY < -10) newY = 110;
          if (newY > 110) newY = -10;

          return {
            ...sym,
            x: newX,
            y: newY,
            rotation: newRotation,
          };
        })
      );
      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Soft light spheres */}
      <div className="absolute top-[20%] left-[10%] w-[450px] h-[450px] rounded-full bg-cyan-400/15 mix-blend-screen filter blur-[80px]" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-sky-400/20 mix-blend-screen filter blur-[90px]" />
      <div className="absolute top-[60%] left-[80%] w-[250px] h-[250px] rounded-full bg-teal-400/10 mix-blend-screen filter blur-[60px]" />

      {/* Math Floating Symbols */}
      {symbols.map((sym) => (
        <div
          key={sym.id}
          className="absolute font-mono select-none"
          style={{
            left: `${sym.x}%`,
            top: `${sym.y}%`,
            fontSize: `${sym.size}px`,
            opacity: sym.opacity,
            transform: `translate(-50%, -50%) rotate(${sym.rotation}deg)`,
            color: sym.glow ? '#22d3ee' : '#cbd5e1',
            textShadow: sym.glow ? '0 0 10px rgba(34, 211, 238, 0.6), 0 0 20px rgba(34, 211, 238, 0.2)' : 'none',
            fontWeight: sym.glow ? '600' : '500',
            transition: 'color 1s ease',
          }}
        >
          {sym.char}
        </div>
      ))}
    </div>
  );
}
