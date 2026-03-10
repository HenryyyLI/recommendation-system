import { useEffect, useRef, useCallback } from 'react';
import logoImg from '@/assets/logo.png';

// ─── Particle system with mouse interaction ───
const PARTICLE_COUNT = 30;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

function createParticle(): Particle {
  return {
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    size: Math.random() * 3.5 + 1.5,
    opacity: Math.random() * 0.6 + 0.3,
    hue: [200, 260, 280, 320, 160][Math.floor(Math.random() * 5)],
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.02 + 0.01,
  };
}

interface MousePos {
  x: number;
  y: number;
  active: boolean;
}

const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef<MousePos>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, createParticle);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const mouse = mouseRef.current;

      // Draw mouse glow
      if (mouse.active) {
        const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        mg.addColorStop(0, 'hsla(260, 100%, 75%, 0.15)');
        mg.addColorStop(0.3, 'hsla(200, 100%, 70%, 0.08)');
        mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg;
        ctx.fillRect(mouse.x - 180, mouse.y - 180, 360, 360);
      }

      for (const p of particlesRef.current) {
        // Mouse attraction
        if (mouse.active) {
          const mpx = (p.x / 100) * w;
          const mpy = (p.y / 100) * h;
          const mdx = mouse.x - mpx;
          const mdy = mouse.y - mpy;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 200 && mdist > 5) {
            const force = (1 - mdist / 200) * 0.03;
            p.vx += (mdx / mdist) * force;
            p.vy += (mdy / mdist) * force;
          }
        }

        // Damping
        p.vx *= 0.995;
        p.vy *= 0.995;

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.x < -2) p.x = 102;
        if (p.x > 102) p.x = -2;
        if (p.y < -2) p.y = 102;
        if (p.y > 102) p.y = -2;

        const px = (p.x / 100) * w;
        const py = (p.y / 100) * h;
        const pulseOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
        const pulseSize = p.size * (0.8 + 0.4 * Math.sin(p.pulse));

        // Outer glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, pulseSize * 8);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 75%, ${pulseOpacity * 0.7})`);
        grad.addColorStop(0.3, `hsla(${p.hue}, 100%, 65%, ${pulseOpacity * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(px - pulseSize * 8, py - pulseSize * 8, pulseSize * 16, pulseSize * 16);

        // Core
        ctx.beginPath();
        ctx.arc(px, py, pulseSize * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${pulseOpacity})`;
        ctx.fill();

        // Center dot
        ctx.beginPath();
        ctx.arc(px, py, pulseSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 97%, ${pulseOpacity * 0.9})`;
        ctx.fill();
      }

      // Connection lines
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dx = ((a.x - b.x) / 100) * w;
          const dy = ((a.y - b.y) / 100) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.18;
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 80%, 70%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo((a.x / 100) * w, (a.y / 100) * h);
            ctx.lineTo((b.x / 100) * w, (b.y / 100) * h);
            ctx.stroke();
          }
        }
      }

      // Draw lines from mouse to nearby particles
      if (mouse.active) {
        for (const p of particlesRef.current) {
          const px = (p.x / 100) * w;
          const py = (p.y / 100) * h;
          const dx = mouse.x - px;
          const dy = mouse.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.25;
            ctx.strokeStyle = `hsla(${p.hue}, 100%, 75%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { ...mouseRef.current, active: false };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 2 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
};

// ─── Orbiting rings component ───
const OrbitRings = () => (
  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
    {/* Orbit ring 1 */}
    <div className="absolute w-[300px] h-[300px] rounded-full border border-white/[0.04]" style={{
      animation: 'spin-slow 20s linear infinite',
    }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{
        background: 'hsl(200,100%,70%)',
        boxShadow: '0 0 10px 3px hsl(200,100%,60%)',
      }} />
    </div>
    {/* Orbit ring 2 */}
    <div className="absolute w-[420px] h-[420px] rounded-full border border-white/[0.03]" style={{
      animation: 'spin-slow 30s linear infinite reverse',
    }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{
        background: 'hsl(280,100%,70%)',
        boxShadow: '0 0 8px 2px hsl(280,100%,60%)',
      }} />
    </div>
    {/* Orbit ring 3 - elliptical */}
    <div className="absolute w-[500px] h-[250px] rounded-full border border-white/[0.02]" style={{
      animation: 'spin-slow 25s linear infinite',
      transform: 'rotateX(60deg)',
    }}>
      <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full" style={{
        background: 'hsl(320,100%,70%)',
        boxShadow: '0 0 6px 2px hsl(320,100%,60%)',
      }} />
    </div>
  </div>
);

// ─── Main panel ───
const LoginHeroPanel = () => {
  const panelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const glow = glowRef.current;
    if (!panel || !glow) return;

    const handleMove = (e: MouseEvent) => {
      const rect = panel.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glow.style.opacity = '1';
      glow.style.background = `radial-gradient(600px circle at ${x}px ${y}px, hsla(260,100%,65%,0.12), hsla(200,100%,65%,0.06), transparent 60%)`;
    };

    const handleLeave = () => {
      glow.style.opacity = '0';
    };

    panel.addEventListener('mousemove', handleMove);
    panel.addEventListener('mouseleave', handleLeave);
    return () => {
      panel.removeEventListener('mousemove', handleMove);
      panel.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div ref={panelRef} className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
      <div className="absolute inset-0 bg-[hsl(225,35%,3%)]">
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }} />

        {/* Vibrant liquid blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%]" style={{
            background: 'radial-gradient(circle, hsl(280,100%,60%) 0%, hsl(260,80%,40%) 50%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: 0.75,
            animation: 'morph-blob 15s ease-in-out infinite, float-slow 12s ease-in-out infinite',
          }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[75%] h-[75%]" style={{
            background: 'radial-gradient(circle, hsl(200,100%,55%) 0%, hsl(210,90%,40%) 50%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: 0.75,
            animation: 'morph-blob-alt 12s ease-in-out infinite, float-medium 8s ease-in-out infinite',
          }} />
          <div className="absolute top-[25%] right-[5%] w-[55%] h-[55%]" style={{
            background: 'radial-gradient(circle, hsl(320,100%,55%) 0%, hsl(300,80%,40%) 50%, transparent 70%)',
            filter: 'blur(35px)',
            opacity: 0.55,
            animation: 'morph-blob 18s ease-in-out infinite, float-fast 6s ease-in-out infinite',
          }} />
          <div className="absolute bottom-[15%] left-[15%] w-[45%] h-[45%]" style={{
            background: 'radial-gradient(circle, hsl(160,100%,45%) 0%, hsl(180,80%,35%) 50%, transparent 70%)',
            filter: 'blur(45px)',
            opacity: 0.45,
            animation: 'morph-blob-alt 20s ease-in-out infinite, float-medium 10s ease-in-out infinite',
            animationDelay: '3s',
          }} />
        </div>

        {/* Holographic shimmer overlay */}
        <div className="absolute inset-0 mix-blend-overlay opacity-35" style={{
          background: 'linear-gradient(135deg, transparent 0%, hsl(280,100%,80%) 25%, hsl(200,100%,70%) 50%, hsl(320,100%,75%) 75%, transparent 100%)',
          backgroundSize: '400% 400%',
          animation: 'metallic-shift 6s ease-in-out infinite',
        }} />

        {/* Mouse-following glow overlay */}
        <div
          ref={glowRef}
          className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
          style={{ zIndex: 3, opacity: 0 }}
        />

        {/* Particle canvas (with mouse interaction) */}
        <ParticleField />

        {/* Orbiting rings */}
        <OrbitRings />

        {/* Holographic ring behind logo */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 4 }}>
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-20 rounded-full opacity-20" style={{
              background: 'conic-gradient(from 0deg, hsl(280,100%,60%), hsl(200,100%,60%), hsl(320,100%,60%), hsl(160,100%,50%), hsl(280,100%,60%))',
              filter: 'blur(30px)',
              animation: 'spin-slow 10s linear infinite',
            }} />
            {/* Inner glow ring */}
            <div className="absolute -inset-12 rounded-full opacity-25" style={{
              background: 'conic-gradient(from 180deg, hsl(200,100%,70%), transparent 40%, hsl(280,100%,70%), transparent 80%, hsl(200,100%,70%))',
              filter: 'blur(15px)',
              animation: 'spin-slow 8s linear infinite reverse',
            }} />

            {/* Content */}
            <div className="text-center text-white space-y-6 relative">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-[0_0_40px_rgba(130,100,255,0.3),0_0_80px_rgba(100,200,255,0.15)]" style={{
                animation: 'pulse-glow 3s ease-in-out infinite',
              }}>
                <img src={logoImg} alt="NexPick" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-7xl font-bold tracking-[-0.04em]" style={{
                fontFamily: 'var(--font-display-alt)',
                background: 'linear-gradient(135deg, hsl(0,0%,100%) 0%, hsl(280,80%,80%) 30%, hsl(200,100%,80%) 60%, hsl(0,0%,100%) 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'metallic-text 4s ease-in-out infinite',
                filter: 'drop-shadow(0 0 30px hsla(260,100%,70%,0.4))',
              }}>
                NexPick
              </h1>
              <p className="text-sm opacity-70 tracking-[0.3em] uppercase font-semibold" style={{
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.35em',
                textShadow: '0 0 15px hsla(200,100%,70%,0.5)',
              }}>
                AI-Powered Shopping
              </p>
            </div>
          </div>
        </div>

        {/* Edge neon borders */}
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
          background: 'linear-gradient(90deg, transparent, hsl(280,100%,60%), hsl(200,100%,60%), transparent)',
          boxShadow: '0 0 15px 2px hsl(260,100%,60%)',
          opacity: 0.6,
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
          background: 'linear-gradient(90deg, transparent, hsl(200,100%,60%), hsl(280,100%,60%), transparent)',
          boxShadow: '0 0 15px 2px hsl(200,100%,60%)',
          opacity: 0.4,
        }} />
        <div className="absolute top-0 bottom-0 right-0 w-[1px]" style={{
          background: 'linear-gradient(180deg, hsl(280,100%,60%), hsl(200,100%,55%), hsl(320,100%,55%))',
          boxShadow: '0 0 20px 3px hsl(260,100%,55%)',
          opacity: 0.5,
        }} />
      </div>
    </div>
  );
};

export default LoginHeroPanel;
