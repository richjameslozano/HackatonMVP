import { useEffect, useState, useMemo } from 'react';

interface ConfettiAnimationProps {
    visible: boolean;
    onComplete?: () => void;
}

const CONFETTI_DURATION_MS = 2000;
const PARTICLE_COUNT = 30;
const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface Particle {
    id: number;
    color: string;
    x: number;
    y: number;
    angle: number;
    speed: number;
    size: number;
    rotation: number;
}

function generateParticles(): Particle[] {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
        x: 50 + (Math.random() - 0.5) * 10,
        y: 50 + (Math.random() - 0.5) * 10,
        angle: Math.random() * 360,
        speed: 40 + Math.random() * 60,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
    }));
}

export function ConfettiAnimation({ visible, onComplete }: ConfettiAnimationProps) {
    const [animating, setAnimating] = useState(false);
    const particles = useMemo(() => (visible ? generateParticles() : []), [visible]);

    useEffect(() => {
        if (visible) {
            setAnimating(true);
            const timer = setTimeout(() => {
                setAnimating(false);
                onComplete?.();
            }, CONFETTI_DURATION_MS);
            return () => clearTimeout(timer);
        }
    }, [visible, onComplete]);

    if (!visible && !animating) return null;

    return (
        <div
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
            aria-hidden="true"
        >
            {particles.map((p) => {
                const radians = (p.angle * Math.PI) / 180;
                const tx = Math.cos(radians) * p.speed;
                const ty = Math.sin(radians) * p.speed - 20;

                return (
                    <div
                        key={p.id}
                        className="absolute animate-confetti-burst"
                        style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            backgroundColor: p.color,
                            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                            transform: `rotate(${p.rotation}deg)`,
                            ['--confetti-tx' as string]: `${tx}vw`,
                            ['--confetti-ty' as string]: `${ty}vh`,
                            ['--confetti-rot' as string]: `${p.rotation + 720}deg`,
                        }}
                    />
                );
            })}
        </div>
    );
}
