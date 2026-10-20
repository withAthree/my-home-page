"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 全屏 3D 星空 / 星云背景（Three.js）
 * ------------------------------------------------------------
 * · 单 Canvas 复用整站，避免多个 WebGL context
 * · 鼠标视差（lerp 0.05）+ 滚动驱动星云推进
 * · 无 WebGL 或 prefers-reduced-motion 时降级为纯 CSS 星空
 * · 页面隐藏时暂停渲染；卸载时释放全部 GPU 资源
 */
export default function StarField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // ---- 能力检测：决定是否走降级路径 ----
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hasWebGL = false;
    try {
      const probe = document.createElement("canvas");
      hasWebGL = !!(
        window.WebGLRenderingContext &&
        (probe.getContext("webgl2") || probe.getContext("webgl"))
      );
    } catch {
      hasWebGL = false;
    }

    if (!hasWebGL || reduced) {
      setFallback(true);
      return;
    }

    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const isSmall = window.matchMedia("(max-width: 768px)").matches;
      const lowMem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const isLowEnd = isSmall || (typeof lowMem === "number" && lowMem < 4);
      const COUNT = isLowEnd ? 1500 : 3400;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        62,
        window.innerWidth / window.innerHeight,
        0.1,
        900
      );
      camera.position.set(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isLowEnd,
        powerPreference: "high-performance",
      });
      const dpr = Math.min(window.devicePixelRatio || 1, isLowEnd ? 1.5 : 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      // ---------------- 星空粒子 ----------------
      const positions = new Float32Array(COUNT * 3);
      const colors = new Float32Array(COUNT * 3);
      const sizes = new Float32Array(COUNT);
      const phases = new Float32Array(COUNT);

      const palette = [
        new THREE.Color("#ffffff"),
        new THREE.Color("#cfe9ff"),
        new THREE.Color("#4cc9f0"),
        new THREE.Color("#b892ff"),
        new THREE.Color("#ff8fc4"),
      ];

      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 300;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 190;
        positions[i * 3 + 2] = -Math.random() * 320 - 12;

        const roll = Math.random();
        const c =
          roll > 0.94
            ? palette[4]
            : roll > 0.86
              ? palette[3]
              : roll > 0.74
                ? palette[2]
                : roll > 0.5
                  ? palette[1]
                  : palette[0];

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        sizes[i] = Math.random() > 0.985 ? 4.4 : 0.9 + Math.random() * 2.1;
        phases[i] = Math.random() * Math.PI * 2;
      }

      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      starGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      starGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      starGeo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

      const starMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: dpr },
          uOpacity: { value: 1 },
        },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aPhase;
          attribute vec3 aColor;
          uniform float uTime;
          uniform float uPixelRatio;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float twinkle = 0.55 + 0.45 * sin(uTime * 1.5 + aPhase);
            vAlpha = 0.35 + twinkle * 0.65;
            gl_PointSize = min(aSize * uPixelRatio * (260.0 / max(-mv.z, 1.0)), 26.0 * uPixelRatio);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            a = pow(a, 1.8);
            gl_FragColor = vec4(vColor, a * vAlpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const starGroup = new THREE.Group();
      const stars = new THREE.Points(starGeo, starMat);
      starGroup.add(stars);
      scene.add(starGroup);

      // ---------------- 星云光斑 ----------------
      const glowTexture = (rgb: string) => {
        const size = 256;
        const cv = document.createElement("canvas");
        cv.width = cv.height = size;
        const ctx = cv.getContext("2d")!;
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, `rgba(${rgb},0.55)`);
        g.addColorStop(0.35, `rgba(${rgb},0.2)`);
        g.addColorStop(0.7, `rgba(${rgb},0.05)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(cv);
        tex.needsUpdate = true;
        return tex;
      };

      const nebulae: { sprite: import("three").Sprite; seed: number }[] = [];
      const nebulaSpec = [
        { rgb: "76,201,240", pos: [-90, 40, -230] as const, scale: 320, opacity: 0.5 },
        { rgb: "123,47,247", pos: [95, -50, -260] as const, scale: 380, opacity: 0.55 },
        { rgb: "247,37,133", pos: [-30, -95, -200] as const, scale: 260, opacity: 0.38 },
        { rgb: "76,201,240", pos: [60, 90, -180] as const, scale: 220, opacity: 0.3 },
      ];

      nebulaSpec.forEach((n, i) => {
        const mat = new THREE.SpriteMaterial({
          map: glowTexture(n.rgb),
          transparent: true,
          opacity: n.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(n.pos[0], n.pos[1], n.pos[2]);
        sprite.scale.set(n.scale, n.scale, 1);
        scene.add(sprite);
        nebulae.push({ sprite, seed: i * 1.7 });
      });

      // ---------------- 流星 ----------------
      const streakTex = (() => {
        const w = 256;
        const h = 16;
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d")!;
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.72, "rgba(200,240,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,1)");
        ctx.fillStyle = g;
        ctx.fillRect(0, h / 2 - 2, w, 4);
        const tex = new THREE.CanvasTexture(cv);
        tex.needsUpdate = true;
        return tex;
      })();

      const meteorMat = new THREE.SpriteMaterial({
        map: streakTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const meteor = new THREE.Sprite(meteorMat);
      meteor.scale.set(46, 2.4, 1);
      meteor.position.set(-140, 80, -120);
      meteorMat.rotation = -0.32;
      scene.add(meteor);

      let meteorT = -1;
      let meteorNext = 3 + Math.random() * 4;
      let meteorStart = { x: 0, y: 0 };

      // ---------------- 交互状态 ----------------
      let scrollProgress = 0;
      let targetX = 0;
      let targetY = 0;
      let camX = 0;
      let camY = 0;

      const readScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      };

      const onPointerMove = (e: PointerEvent) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 4.4;
        targetY = -(e.clientY / window.innerHeight - 0.5) * 2.8;
      };

      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        readScroll();
      };

      readScroll();
      window.addEventListener("scroll", readScroll, { passive: true });
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("resize", onResize);

      // ---------------- 渲染循环 ----------------
      const clock = new THREE.Clock();
      let hidden = false;

      const onVisibility = () => {
        hidden = document.hidden;
        if (!hidden && !raf) {
          raf = requestAnimationFrame(tick);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      const tick = () => {
        raf = 0;
        if (hidden || disposed) return;
        raf = requestAnimationFrame(tick);

        const t = clock.getElapsedTime();
        starMat.uniforms.uTime.value = t;

        camX += (targetX - camX) * 0.05;
        camY += (targetY - camY) * 0.05;
        camera.position.x = camX;
        camera.position.y = camY;

        starGroup.rotation.z = t * 0.008 + camX * 0.01;
        starGroup.rotation.x = Math.sin(t * 0.09) * 0.03;
        starGroup.position.z = scrollProgress * 165;
        starMat.uniforms.uOpacity.value = 1 - scrollProgress * 0.35;

        nebulae.forEach(({ sprite, seed }) => {
          sprite.position.x += Math.sin(t * 0.06 + seed) * 0.012;
          sprite.position.y += Math.cos(t * 0.05 + seed) * 0.012;
          sprite.material.rotation = Math.sin(t * 0.04 + seed) * 0.25;
        });

        // 流星
        if (meteorT < 0) {
          if (t > meteorNext) {
            meteorT = 0;
            meteorStart = {
              x: -160 + Math.random() * 120,
              y: 40 + Math.random() * 70,
            };
          }
        } else {
          meteorT += 0.011;
          const k = meteorT;
          meteor.position.x = meteorStart.x + k * 300;
          meteor.position.y = meteorStart.y - k * 110;
          meteorMat.opacity = Math.sin(Math.min(k, 1) * Math.PI) * 0.9;
          if (k >= 1) {
            meteorT = -1;
            meteorMat.opacity = 0;
            meteorNext = t + 4 + Math.random() * 6;
          }
        }

        renderer.render(scene, camera);
      };

      raf = requestAnimationFrame(tick);

      // ---------------- 清理 ----------------
      cleanup = () => {
        cancelAnimationFrame(raf);
        raf = 0;
        window.removeEventListener("scroll", readScroll);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);

        starGeo.dispose();
        starMat.dispose();
        nebulae.forEach(({ sprite }) => {
          sprite.material.map?.dispose();
          sprite.material.dispose();
        });
        streakTex.dispose();
        meteorMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  if (fallback) return <div className="css-sky" aria-hidden="true" />;

  return <div ref={hostRef} className="canvas-layer" aria-hidden="true" />;
}
