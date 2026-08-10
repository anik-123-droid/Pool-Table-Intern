import React, { useEffect, useRef } from 'react';

const BilliardsBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initBalls();
    };

    window.addEventListener('resize', handleResize);

    // Mouse tracking
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false,
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Particles (Chalk Dust & Gold Shimmer)
    const dustCount = 45;
    const dustParticles = Array.from({ length: dustCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      color: Math.random() > 0.4 ? 'rgba(22, 101, 52, ' : 'rgba(180, 140, 70, ',
    }));

    // Billiard Balls Configuration
    const ballConfigs = [
      { number: '8', color: '#16161a', isStripe: false, radius: 40 },
      { number: 'Cue', color: '#FAF7F2', isCue: true, radius: 36 },
      { number: '9', color: '#EAB308', isStripe: true, radius: 34 },
      { number: '1', color: '#CA8A04', isStripe: false, radius: 38 },
      { number: '3', color: '#DC2626', isStripe: false, radius: 32 },
      { number: '7', color: '#701A75', isStripe: false, radius: 36 },
      { number: '10', color: '#2563EB', isStripe: true, radius: 35 },
      { number: '2', color: '#1D4ED8', isStripe: false, radius: 30 },
    ];

    let balls = [];

    const initBalls = () => {
      const isMobile = width < 768;
      const count = isMobile ? 5 : ballConfigs.length;
      
      const minX = 60;
      const maxX = width - 60;
      const minY = 80;
      const maxY = height - 80;

      balls = ballConfigs.slice(0, count).map((config, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const baseX = (width / 4) * (col + 1) + (Math.random() - 0.5) * 100;
        const baseY = (height / 3) * (row + 1) + (Math.random() - 0.5) * 80;

        return {
          ...config,
          x: Math.max(minX, Math.min(maxX, baseX)),
          y: Math.max(minY, Math.min(maxY, baseY)),
          baseX: baseX,
          baseY: baseY,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          scale: isMobile ? 0.75 : 1,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.005,
        };
      });
    };

    initBalls();

    // Bank shot trajectory lines
    const trajectoryPoints = [
      { x1: width * 0.1, y1: height * 0.2, x2: width * 0.35, y2: height * 0.85, x3: width * 0.6, y3: height * 0.15 },
      { x1: width * 0.85, y1: height * 0.3, x2: width * 0.65, y2: height * 0.75, x3: width * 0.9, y3: height * 0.9 },
    ];

    // Main Render Loop
    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. BASE BACKGROUND GRADIENT & OVERHEAD LIGHT BEAM
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#F6F3EE');
      bgGrad.addColorStop(0.5, '#F1ECE4');
      bgGrad.addColorStop(1, '#EAE3D7');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Overhead Billiards Spotlight Beam
      const spotlightX = width / 2 + (mouse.x - width / 2) * 0.05;
      const spotGrad = ctx.createRadialGradient(
        spotlightX,
        -100,
        50,
        spotlightX,
        height * 0.5,
        width * 0.7
      );
      spotGrad.addColorStop(0, 'rgba(22, 101, 52, 0.09)');
      spotGrad.addColorStop(0.4, 'rgba(22, 101, 52, 0.04)');
      spotGrad.addColorStop(0.8, 'rgba(212, 175, 55, 0.02)');
      spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);

      // Soft ambient felt glows in corners
      const cornerGlow1 = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.4);
      cornerGlow1.addColorStop(0, 'rgba(22, 101, 52, 0.07)');
      cornerGlow1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cornerGlow1;
      ctx.fillRect(0, 0, width, height);

      const cornerGlow2 = ctx.createRadialGradient(width, height, 0, width, height, width * 0.5);
      cornerGlow2.addColorStop(0, 'rgba(146, 64, 14, 0.06)');
      cornerGlow2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cornerGlow2;
      ctx.fillRect(0, 0, width, height);

      // 2. BANK SHOT TRAJECTORY VECTOR LINES
      ctx.save();
      ctx.setLineDash([6, 14]);
      ctx.lineWidth = 1.2;

      trajectoryPoints.forEach((pts) => {
        const lineGrad = ctx.createLinearGradient(pts.x1, pts.y1, pts.x3, pts.y3);
        lineGrad.addColorStop(0, 'rgba(22, 101, 52, 0.02)');
        lineGrad.addColorStop(0.5, 'rgba(22, 101, 52, 0.12)');
        lineGrad.addColorStop(1, 'rgba(22, 101, 52, 0.02)');

        ctx.strokeStyle = lineGrad;
        ctx.beginPath();
        ctx.moveTo(pts.x1, pts.y1);
        ctx.lineTo(pts.x2, pts.y2);
        ctx.lineTo(pts.x3, pts.y3);
        ctx.stroke();

        // Target Cue Points
        [ { x: pts.x1, y: pts.y1 }, { x: pts.x2, y: pts.y2 }, { x: pts.x3, y: pts.y3 } ].forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(22, 101, 52, 0.12)';
          ctx.fill();
        });
      });
      ctx.restore();

      // 3. FLOATING CHALK / SHIMMER DUST PARTICLES
      dustParticles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.1;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed) * 0.005;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0.1, Math.min(0.6, p.alpha))})`;
        ctx.fill();
      });

      // 4. PROCEDURAL 3D SHADED BILLIARD BALLS
      balls.forEach((ball) => {
        const r = ball.radius * ball.scale;

        // Drift motion
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.rot += ball.vRot;

        // Bounce gently off boundaries
        if (ball.x - r < 20 || ball.x + r > width - 20) ball.vx *= -1;
        if (ball.y - r < 20 || ball.y + r > height - 20) ball.vy *= -1;

        // Interactive Mouse Repulsion & Parallax
        if (mouse.active) {
          const dx = ball.x - mouse.x;
          const dy = ball.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = r + 140;

          if (dist < minDist && dist > 0) {
            const force = (minDist - dist) / minDist;
            ball.x += (dx / dist) * force * 3.5;
            ball.y += (dy / dist) * force * 3.5;
          }
        }

        // Subtly parallax shift towards center
        const parallaxX = (mouse.x - width / 2) * 0.015;
        const parallaxY = (mouse.y - height / 2) * 0.015;

        const drawX = ball.x + parallaxX;
        const drawY = ball.y + parallaxY;

        ctx.save();
        ctx.translate(drawX, drawY);

        // --- Realistic Soft Floor Drop Shadow ---
        ctx.beginPath();
        ctx.ellipse(4, r * 0.75, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
        const shadowGrad = ctx.createRadialGradient(4, r * 0.75, 0, 4, r * 0.75, r * 0.9);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
        shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.06)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.fill();

        // --- Base Ball Sphere Outer Clip ---
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();

        // --- Ball Color & Base Fill ---
        if (ball.isCue) {
          const cueGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
          cueGrad.addColorStop(0, '#FFFFFF');
          cueGrad.addColorStop(0.6, '#F8F4EC');
          cueGrad.addColorStop(1, '#DCD5C9');
          ctx.fillStyle = cueGrad;
          ctx.fill();

          // Red spot marker on cue ball
          ctx.beginPath();
          ctx.arc(r * 0.15, -r * 0.1, 3.5 * ball.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#DC2626';
          ctx.fill();
        } else {
          if (ball.isStripe) {
            // White body
            const stripeBgGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
            stripeBgGrad.addColorStop(0, '#FFFFFF');
            stripeBgGrad.addColorStop(0.7, '#F3EFE6');
            stripeBgGrad.addColorStop(1, '#D2C9BB');
            ctx.fillStyle = stripeBgGrad;
            ctx.fill();

            // Wide color stripe horizontally
            ctx.rotate(ball.rot);
            ctx.fillStyle = ball.color;
            ctx.fillRect(-r * 1.2, -r * 0.45, r * 2.4, r * 0.9);
            ctx.rotate(-ball.rot);
          } else {
            // Solid color
            const solidGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r * 1.1);
            solidGrad.addColorStop(0, ball.color);
            solidGrad.addColorStop(0.8, ball.color);
            solidGrad.addColorStop(1, '#0A0A0C');
            ctx.fillStyle = solidGrad;
            ctx.fill();
          }

          // --- White Number Circle ---
          const circleR = r * 0.42;
          ctx.beginPath();
          ctx.arc(0, 0, circleR, 0, Math.PI * 2);
          const circleGrad = ctx.createRadialGradient(-circleR * 0.2, -circleR * 0.2, 0, 0, 0, circleR);
          circleGrad.addColorStop(0, '#FFFFFF');
          circleGrad.addColorStop(1, '#F3EFEA');
          ctx.fillStyle = circleGrad;
          ctx.fill();

          // --- Number Text ---
          ctx.fillStyle = '#111115';
          ctx.font = `900 ${Math.round(r * 0.44)}px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.number, 0, 1);

          // Underline for 6 and 9
          if (ball.number === '6' || ball.number === '9') {
            ctx.beginPath();
            ctx.rect(-r * 0.12, r * 0.18, r * 0.24, 2);
            ctx.fillStyle = '#111115';
            ctx.fill();
          }
        }

        // --- 3D Specular Highlight & Glass Gloss Overlay ---
        const highlightGrad = ctx.createRadialGradient(
          -r * 0.35,
          -r * 0.35,
          0,
          -r * 0.3,
          -r * 0.3,
          r * 0.85
        );
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        highlightGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
        highlightGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
        highlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = highlightGrad;
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default BilliardsBackground;
