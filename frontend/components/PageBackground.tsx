/**
 * PageBackground — Interactive Constellation & Dynamic Path Chaining Canvas
 *
 * Implements the Apple-grade interactive network requested:
 *  1. Dynamic Dot-to-Dot Chaining:
 *     Moving the cursor near any dot interlinks it to the cursor, then chains it to
 *     adjacent dots, which in turn chain to their neighbors in a cascading network.
 *
 *  2. Trailing Fade-Out (Phosphor Decay):
 *     As the cursor glides forward, active connection lines behind it smoothly fade out
 *     and dissolve, leaving a fluid trailing dissipating trace.
 *
 *  3. Interactive Line Hovering:
 *     Moving the cursor over any background link energizes the connected nodes and
 *     propagates forward into adjacent links while trailing lines fade out.
 *
 *  4. Architectural Calibration & Impeccable Geometry:
 *     - Full viewport dot matrix grid.
 *     - Quiet measurement marks, coordinate crosshairs, and corner framing brackets.
 *     - Telemetry labels (e.g. "NODE·LON // GMT", "NODE·BLR // IST", "SYNC·OK").
 *
 *  5. Contextual Step 3 Transition:
 *     Switches dynamic link beams to emerald (#10B981) upon booking confirmation.
 *
 * Sits at z-index: 0, completely non-blocking (pointer-events-none), and performs
 * at 60/120fps with zero React re-renders.
 */
"use client";

import React, { useEffect, useRef } from "react";

interface PageBackgroundProps {
  /** Variant switches to 'success' on Step 3 (confirmation) */
  variant?: "default" | "success";
}

interface ConstellationNode {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  isHub: boolean;
  label?: string;
  energy: number; // 0.0 (rest) to 1.0 (fully excited); decays when cursor moves away
}

export function PageBackground({ variant = "default" }: PageBackgroundProps) {
  const isSuccess = variant === "success";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse tracking state
    const mouse = {
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      targetX: -9999,
      targetY: -9999,
      isHovered: false,
    };

    let nodes: ConstellationNode[] = [];

    // Telemetry labels assigned to designated hub nodes
    const hubLabels = [
      "NODE·LON // GMT",
      "PARENT·TZ // DETECTED",
      "SYNC·ACTIVE",
      "SLOT·ALLOCATION",
      "NODE·BLR // IST",
      "MENTOR·CORE",
      "30M·TRIAL",
      "CY·SCHEDULER",
      "TIMEZONE·MESH",
      "CAPACITY·2/DAY",
    ];

    // Initialize evenly distributed nodes across the viewport
    const initNodes = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Node count scaled by viewport area (dense enough to interlink gracefully everywhere)
      const count = Math.max(65, Math.min(125, Math.floor((width * height) / 14000)));
      nodes = [];

      // Calculate grid dimensions for balanced spatial distribution
      const cols = Math.ceil(Math.sqrt(count * (width / height)));
      const rows = Math.ceil(count / cols);
      const cellW = width / cols;
      const cellH = height / rows;

      let id = 0;
      let hubIndex = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (nodes.length >= count) break;

          // Jittered grid placement: organic constellation layout
          const px = c * cellW + cellW * 0.15 + Math.random() * (cellW * 0.7);
          const py = r * cellH + cellH * 0.15 + Math.random() * (cellH * 0.7);

          const isHub = Math.random() < 0.16;
          const label = isHub && hubIndex < hubLabels.length ? hubLabels[hubIndex++] : undefined;

          nodes.push({
            id: id++,
            x: px,
            y: py,
            baseX: px,
            baseY: py,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: isHub ? 3.5 : 2.0,
            isHub,
            label,
            energy: 0,
          });
        }
      }
    };

    initNodes();

    // Distance helper
    const distSq = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x1 - x2;
      const dy = y1 - y2;
      return dx * dx + dy * dy;
    };

    // Point-to-segment distance squared (for line-cursor proximity)
    const distToSegmentSq = (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
      const l2 = distSq(x1, y1, x2, y2);
      if (l2 === 0) return distSq(px, py, x1, y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return distSq(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
    };

    // Event listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovered = true;
      if (mouse.x < -1000) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
    };

    const handleMouseLeave = () => {
      mouse.isHovered = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };

    const handleResize = () => {
      initNodes();
      if (prefersReducedMotion) {
        render();
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // Interaction radii
    const MOUSE_CONNECT_RADIUS = 160;
    const MOUSE_CONNECT_RADIUS_SQ = MOUSE_CONNECT_RADIUS * MOUSE_CONNECT_RADIUS;
    const CHAIN_LINK_RADIUS = 145;
    const CHAIN_LINK_RADIUS_SQ = CHAIN_LINK_RADIUS * CHAIN_LINK_RADIUS;
    const LINE_HOVER_RADIUS_SQ = 35 * 35;

    let time = 0;

    // Main 60/120fps Animation Loop
    const render = () => {
      time += 0.016;

      // Smooth cursor position interpolation (Apple damped friction)
      if (mouse.isHovered) {
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
        mouse.x += (mouse.targetX - mouse.x) * 0.18;
        mouse.y += (mouse.targetY - mouse.y) * 0.18;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      // Color tokens (Impeccable & design-skill.md palette)
      const primaryColor = isSuccess ? "16, 185, 129" : "245, 166, 35";
      const secondaryColor = isSuccess ? "5, 150, 105" : "217, 139, 15";
      const slateColor = "100, 116, 139";
      const slateHairline = "148, 163, 184";

      // ── Step 1: Update node drift & direct cursor excitation ─────────
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (!prefersReducedMotion) {
          // Gentle ambient floating
          n.baseX += n.vx;
          n.baseY += n.vy;

          // Boundary bouncing
          if (n.baseX < 20 || n.baseX > width - 20) n.vx *= -1;
          if (n.baseY < 20 || n.baseY > height - 20) n.vy *= -1;

          // Subtle organic drift
          const driftX = Math.sin(time * 0.8 + n.id * 1.5) * 3;
          const driftY = Math.cos(time * 0.7 + n.id * 1.2) * 3;
          n.x = n.baseX + driftX;
          n.y = n.baseY + driftY;
        }

        // Direct cursor interaction: calculate proximity
        if (mouse.isHovered) {
          const d2 = distSq(mouse.x, mouse.y, n.x, n.y);
          if (d2 < MOUSE_CONNECT_RADIUS_SQ) {
            const prox = 1 - Math.sqrt(d2) / MOUSE_CONNECT_RADIUS;
            // Excite node to maximum energy
            n.energy = Math.max(n.energy, prox);

            // Gentle Apple-style magnetic attraction toward cursor (2-6px)
            const angle = Math.atan2(mouse.y - n.y, mouse.x - n.x);
            const pull = prox * 5;
            n.x += Math.cos(angle) * pull;
            n.y += Math.sin(angle) * pull;
          }
        }
      }

      // ── Step 2: Multi-Hop Interlinking & Chaining ────────────────────
      // "When I take my cursor to any dot and start moving, that dot gets interlinked
      // with another dot, and that another dot with another dot."
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (n1.energy <= 0.08) continue; // Only propagate from energized nodes

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const d2 = distSq(n1.x, n1.y, n2.x, n2.y);

          if (d2 < CHAIN_LINK_RADIUS_SQ) {
            // Forward chain energy from n1 to n2 (and vice versa)
            const prox = 1 - Math.sqrt(d2) / CHAIN_LINK_RADIUS;
            const chainBoost = n1.energy * prox * 0.82;
            if (chainBoost > n2.energy) {
              n2.energy = chainBoost;
            }
          }
        }
      }

      // Check cursor proximity to link lines (interactive line hovering)
      // "If I take my cursor over there to the line, as I move, it need to start linking"
      if (mouse.isHovered) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const d2 = distSq(n1.x, n1.y, n2.x, n2.y);
            if (d2 < CHAIN_LINK_RADIUS_SQ) {
              const segDist2 = distToSegmentSq(mouse.x, mouse.y, n1.x, n1.y, n2.x, n2.y);
              if (segDist2 < LINE_HOVER_RADIUS_SQ) {
                const boost = (1 - Math.sqrt(segDist2) / 35) * 0.95;
                n1.energy = Math.max(n1.energy, boost);
                n2.energy = Math.max(n2.energy, boost);
              }
            }
          }
        }
      }

      // ── Step 3: Draw Connection Lines (Active Chains & Resting Mesh) ──
      // "As the cursor moves forward, the back lines need to get invisible / fade out"
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const d2 = distSq(n1.x, n1.y, n2.x, n2.y);

          if (d2 < CHAIN_LINK_RADIUS_SQ) {
            const dist = Math.sqrt(d2);
            const distFactor = 1 - dist / CHAIN_LINK_RADIUS;
            const activeEnergy = Math.max(n1.energy, n2.energy);

            if (activeEnergy > 0.03) {
              // ── Active Chained Line (illuminated & fades out with energy decay) ──
              // As cursor moves ahead, energy decays -> alpha diminishes to 0 -> line fades out!
              const activeAlpha = Math.min(1, activeEnergy * distFactor * 0.92);

              ctx.beginPath();
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);

              // Outer soft luminous glow for high-energy chains
              if (activeAlpha > 0.35) {
                ctx.lineWidth = 2.2;
                ctx.strokeStyle = `rgba(${primaryColor}, ${activeAlpha * 0.35})`;
                ctx.stroke();
              }

              // Core crisp hairline link
              ctx.lineWidth = activeAlpha > 0.4 ? 1.4 : 0.9;
              ctx.strokeStyle = `rgba(${primaryColor}, ${activeAlpha})`;
              ctx.stroke();
            } else {
              // ── Resting Ambient Hairline (subtle background structure) ──
              const restingAlpha = distFactor * 0.08;
              if (restingAlpha > 0.015) {
                ctx.beginPath();
                ctx.moveTo(n1.x, n1.y);
                ctx.lineTo(n2.x, n2.y);
                ctx.lineWidth = 0.75;
                ctx.strokeStyle = `rgba(${slateHairline}, ${restingAlpha})`;
                ctx.stroke();
              }
            }
          }
        }

        // Draw direct link from cursor to nearby dots
        if (mouse.isHovered) {
          const d2Mouse = distSq(mouse.x, mouse.y, n1.x, n1.y);
          if (d2Mouse < MOUSE_CONNECT_RADIUS_SQ) {
            const cursorAlpha = (1 - Math.sqrt(d2Mouse) / MOUSE_CONNECT_RADIUS) * 0.85;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n1.x, n1.y);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = `rgba(${primaryColor}, ${cursorAlpha})`;
            ctx.stroke();
          }
        }
      }

      // ── Step 4: Draw Node Dots, Hub Halos & Telemetry ─────────────────
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const hasEnergy = n.energy > 0.03;

        // Current visual radius expands slightly on activation
        const currentR = n.radius + n.energy * 1.5;

        // 1. Concentric halo rings for energized nodes & hubs
        if (hasEnergy || n.isHub) {
          const ringAlpha = (n.isHub ? 0.35 : 0) + n.energy * 0.55;
          ctx.beginPath();
          ctx.arc(n.x, n.y, currentR + 4.5 + n.energy * 2, 0, Math.PI * 2);
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = hasEnergy
            ? `rgba(${primaryColor}, ${ringAlpha * 0.7})`
            : `rgba(${slateColor}, 0.25)`;
          ctx.stroke();
        }

        // 2. Hub outer technical ring
        if (n.isHub) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, currentR + 8, 0, Math.PI * 2);
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = hasEnergy
            ? `rgba(${secondaryColor}, ${0.3 + n.energy * 0.4})`
            : `rgba(${slateColor}, 0.2)`;
          ctx.stroke();
        }

        // 3. Core solid node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentR, 0, Math.PI * 2);
        if (hasEnergy) {
          ctx.fillStyle = `rgba(${primaryColor}, ${0.7 + n.energy * 0.3})`;
        } else if (n.isHub) {
          ctx.fillStyle = `rgba(${slateColor}, 0.75)`;
        } else {
          ctx.fillStyle = `rgba(${slateColor}, 0.4)`;
        }
        ctx.fill();

        // 4. Monospace technical telemetry label
        if (n.label) {
          const labelAlpha = hasEnergy ? 0.95 : 0.4;
          ctx.font = "600 8.5px 'SFMono-Regular', Consolas, monospace";
          ctx.fillStyle = hasEnergy
            ? `rgba(${secondaryColor}, ${labelAlpha})`
            : `rgba(${slateColor}, ${labelAlpha})`;
          ctx.fillText(n.label, n.x + currentR + 7, n.y + 3);
        }

        // ── Step 5: Smooth Energy Decay (Trail Fade-Out) ───────────────
        // As the cursor sweeps across and moves away, decay energy gracefully
        // The decay rate (~0.935) ensures lines linger for a fraction of a second,
        // then smoothly dissolve behind the cursor movement.
        n.energy *= 0.938;
        if (n.energy < 0.005) {
          n.energy = 0;
        }
      }

      // ── Step 6: Cursor Reticle (Subtle Apple-Style Magnetic Anchor) ──
      if (mouse.isHovered) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `rgba(${primaryColor}, 0.45)`;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryColor}, 0.85)`;
        ctx.fill();
      }

      // ── Step 7: Architectural Framing Marks (Impeccable Calibration) ─
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(${slateColor}, 0.25)`;

      // Top-Left corner bracket
      ctx.beginPath();
      ctx.moveTo(20, 48);
      ctx.lineTo(20, 20);
      ctx.lineTo(48, 20);
      ctx.stroke();

      // Top-Right corner bracket
      ctx.beginPath();
      ctx.moveTo(width - 20, 48);
      ctx.lineTo(width - 20, 20);
      ctx.lineTo(width - 48, 20);
      ctx.stroke();

      // Bottom-Left corner bracket
      ctx.beginPath();
      ctx.moveTo(20, height - 48);
      ctx.lineTo(20, height - 20);
      ctx.lineTo(48, height - 20);
      ctx.stroke();

      // Bottom-Right corner bracket
      ctx.beginPath();
      ctx.moveTo(width - 20, height - 48);
      ctx.lineTo(width - 20, height - 20);
      ctx.lineTo(width - 48, height - 20);
      ctx.stroke();

      // Viewport edge crosshairs
      const crosshairs = [
        { x: 34, y: 34 },
        { x: width - 34, y: 34 },
        { x: 34, y: height - 34 },
        { x: width - 34, y: height - 34 },
      ];
      for (const ch of crosshairs) {
        ctx.beginPath();
        ctx.moveTo(ch.x - 5, ch.y);
        ctx.lineTo(ch.x + 5, ch.y);
        ctx.moveTo(ch.x, ch.y - 5);
        ctx.lineTo(ch.x, ch.y + 5);
        ctx.stroke();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isSuccess]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 0 }}
    >
      {/* ── 1. Base Layer: Technical Dot Grid ─────────────────────────── */}
      <div className="absolute inset-0 bg-canvas-grid opacity-65" />

      {/* ── 2. Ambient Brand Radial Glow Orbs ─────────────────────────── */}
      <div
        className="absolute rounded-full bg-glow-amber transition-opacity duration-700 pointer-events-none"
        style={{
          width: "640px",
          height: "640px",
          top: "-120px",
          right: "-80px",
          opacity: isSuccess ? 0.3 : 0.75,
        }}
      />
      <div
        className="absolute rounded-full bg-glow-amber-sm pointer-events-none"
        style={{
          width: "480px",
          height: "480px",
          bottom: "-80px",
          left: "-60px",
          opacity: 0.6,
        }}
      />
      {isSuccess && (
        <div
          className="absolute rounded-full bg-glow-emerald transition-opacity duration-700 pointer-events-none"
          style={{
            width: "560px",
            height: "560px",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.9,
          }}
        />
      )}

      {/* ── 3. High-Performance Interactive Constellation Canvas ──────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
