import React, { useEffect, useRef, useMemo } from 'react';
import './Particles.css';

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  pixelRatio?: number;
  className?: string;
}

const defaultColors: string[] = ['#ffffff', '#ffffff', '#ffffff'];

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) || 0;
  const g = ((int >> 8) & 255) || 0;
  const b = (int & 255) || 0;
  return [r, g, b];
};

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 200,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const colorsKey = useMemo(() => (particleColors ? particleColors.join(',') : ''), [particleColors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';

    container.appendChild(canvas);

    let width = container.clientWidth;
    let height = container.clientHeight;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) * pixelRatio : 1;

    const resize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };

    window.addEventListener('resize', resize, false);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = { x, y };
    };

    if (moveParticlesOnHover) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    const palette = particleColors && particleColors.length > 0 ? particleColors : defaultColors;
    const rgbPalette = palette.map(hexToRgb);

    const particles = Array.from({ length: particleCount }, () => {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      const rgb = rgbPalette[Math.floor(Math.random() * rgbPalette.length)];

      return {
        x: x * r * particleSpread,
        y: y * r * particleSpread,
        z: z * r * particleSpread * 10.0,
        randX: Math.random(),
        randY: Math.random(),
        randZ: Math.random(),
        randW: Math.random(),
        rgb
      };
    });

    let animationFrameId: number;
    let lastTime = performance.now();
    let elapsed = 0;

    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta * speed;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const uTime = elapsed * 0.001;

      const rotX = disableRotation ? 0 : Math.sin(elapsed * 0.0002) * 0.1;
      const rotY = disableRotation ? 0 : Math.cos(elapsed * 0.0005) * 0.15;
      const rotZ = disableRotation ? 0 : elapsed * 0.01 * speed;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      const mouseOffsetOffsetX = moveParticlesOnHover ? -mouseRef.current.x * particleHoverFactor : 0;
      const mouseOffsetOffsetY = moveParticlesOnHover ? -mouseRef.current.y * particleHoverFactor : 0;

      const fov = 15 * (Math.PI / 180);
      const f = 1 / Math.tan(fov / 2);
      const halfH = (height * dpr) / 2;
      const halfW = (width * dpr) / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const mx = p.x + Math.sin(uTime * p.randZ + 6.28 * p.randW) * (0.1 + 1.4 * p.randX) + mouseOffsetOffsetX;
        const my = p.y + Math.sin(uTime * p.randY + 6.28 * p.randX) * (0.1 + 1.4 * p.randW) + mouseOffsetOffsetY;
        const mz = p.z + Math.sin(uTime * p.randW + 6.28 * p.randY) * (0.1 + 1.4 * p.randZ);

        // 3D rotation
        const x1 = mx * cosY + mz * sinY;
        const z1 = -mx * sinY + mz * cosY;

        const y2 = my * cosX - z1 * sinX;
        const z2 = my * sinX + z1 * cosX;

        const x3 = x1 * cosZ - y2 * sinZ;
        const y3 = x1 * sinZ + y2 * cosZ;

        const viewZ = z2 + cameraDistance;
        if (viewZ <= 0.5) continue;

        const projX = (x3 / viewZ) * f * halfH + halfW;
        const projY = (-y3 / viewZ) * f * halfH + halfH;

        if (projX < -50 || projX > canvas.width + 50 || projY < -50 || projY > canvas.height + 50) {
          continue;
        }

        let pointSize: number;
        if (sizeRandomness === 0) {
          pointSize = particleBaseSize * pixelRatio;
        } else {
          pointSize = (particleBaseSize * pixelRatio * (1.0 + sizeRandomness * (p.randX - 0.5))) / viewZ;
        }
        const radius = Math.max(2.0, pointSize * 0.5 * dpr);

        const [r, g, b] = p.rgb;
        ctx.beginPath();
        ctx.arc(projX, projY, radius, 0, Math.PI * 2);
        ctx.fillStyle = alphaParticles ? `rgba(${r}, ${g}, ${b}, 0.8)` : `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
      }
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      if (moveParticlesOnHover) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
      if (container && container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    particleCount,
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    pixelRatio,
    colorsKey
  ]);

  return <div ref={containerRef} className={`particles-container ${className ?? ''}`} />;
};

export default React.memo(Particles);
