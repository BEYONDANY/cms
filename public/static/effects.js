// AI-GEN-BEGIN
(function () {
  const weather = document.body.getAttribute("data-weather") || "none";
  const cursor = document.body.getAttribute("data-cursor") || "none";
  const clickFx = document.body.getAttribute("data-click") || "none";
  if (weather === "none" && cursor === "none" && clickFx === "none") return;

  const layer = document.getElementById("fx-layer");
  if (!layer) return;

  const canvas = document.createElement("canvas");
  canvas.id = "fx-canvas";
  layer.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let particles = [];
  let trails = [];
  let bursts = [];
  // 紧跟指针：不做缓动插值，每帧直接用最新坐标
  let mouse = { x: -999, y: -999 };
  let raf = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function initWeather() {
    particles = [];
    const count =
      weather === "snow"
        ? 80
        : weather === "rain"
          ? 120
          : weather === "wind"
            ? 60
            : weather === "fog" || weather === "overcast"
              ? 40
              : 0;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: weather === "snow" ? 1.5 + Math.random() * 3 : 1 + Math.random() * 2,
        vx:
          weather === "wind"
            ? 2 + Math.random() * 4
            : weather === "rain"
              ? -0.5 + Math.random()
              : -0.4 + Math.random() * 0.8,
        vy:
          weather === "rain"
            ? 8 + Math.random() * 10
            : weather === "snow"
              ? 0.6 + Math.random() * 1.4
              : weather === "wind"
                ? -0.5 + Math.random()
                : 0.2 + Math.random() * 0.4,
        a: 0.15 + Math.random() * 0.35,
      });
    }
  }

  function drawWeather() {
    if (weather === "none") return;

    if (weather === "overcast") {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(90,100,120,0.22)");
      g.addColorStop(0.45, "rgba(70,80,95,0.12)");
      g.addColorStop(1, "rgba(40,45,55,0.05)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (weather === "fog") {
      for (const p of particles) {
        p.x += p.vx * 0.3;
        p.y += p.vy * 0.2;
        if (p.x < -80) p.x = w + 80;
        if (p.x > w + 80) p.x = -80;
        if (p.y < -80) p.y = h + 80;
        if (p.y > h + 80) p.y = -80;
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90 + p.r * 20);
        rg.addColorStop(0, `rgba(200,210,220,${p.a * 0.35})`);
        rg.addColorStop(1, "rgba(200,210,220,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 90 + p.r * 20, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (weather === "wind") p.x += 1.5;
      if (p.y > h + 10) {
        p.y = -10;
        p.x = Math.random() * w;
      }
      if (p.x > w + 20) p.x = -20;
      if (p.x < -20) p.x = w + 20;

      ctx.beginPath();
      if (weather === "rain") {
        ctx.strokeStyle = `rgba(160,190,220,${p.a})`;
        ctx.lineWidth = 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 2, p.y + 12);
        ctx.stroke();
      } else if (weather === "snow") {
        ctx.fillStyle = `rgba(255,255,255,${p.a + 0.2})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (weather === "wind") {
        ctx.strokeStyle = `rgba(220,230,240,${p.a * 0.5})`;
        ctx.lineWidth = 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 18 - p.vx * 2, p.y);
        ctx.stroke();
      } else if (weather === "overcast") {
        ctx.fillStyle = `rgba(150,160,175,${p.a * 0.25})`;
        ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCursor() {
    if (cursor === "none" || mouse.x < 0) return;
    const t = performance.now() / 1000;

    if (cursor === "whirlwind") {
      // 半径压到 3–9px，紧贴指针
      for (let i = 0; i < 10; i++) {
        const ang = t * 8 + (i / 10) * Math.PI * 2;
        const rad = 3 + (i % 3) * 2;
        const x = mouse.x + Math.cos(ang) * rad;
        const y = mouse.y + Math.sin(ang) * rad;
        ctx.beginPath();
        ctx.fillStyle = `rgba(120,180,255,${0.55 - i * 0.03})`;
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(160,200,255,0.35)";
      ctx.lineWidth = 1;
      ctx.arc(mouse.x, mouse.y, 7 + Math.sin(t * 10) * 1, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (cursor === "animal") {
      // 残影更短、衰减更快，减少拖尾间隙感
      trails.push({ x: mouse.x, y: mouse.y, life: 1 });
      if (trails.length > 10) trails.shift();
      for (let i = 0; i < trails.length; i++) {
        const tr = trails[i];
        tr.life *= 0.78;
        const size = 2.5 + (i / trails.length) * 5;
        const alpha = tr.life * 0.55;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,180,120,${alpha})`;
        ctx.ellipse(tr.x, tr.y, size * 0.85, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,150,90,${alpha})`;
        ctx.arc(tr.x - size * 0.3, tr.y - size * 0.4, size * 0.25, 0, Math.PI * 2);
        ctx.arc(tr.x + size * 0.12, tr.y - size * 0.45, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function spawnClick(x, y) {
    if (clickFx === "none") return;

    if (clickFx === "water") {
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 3.5;
        bursts.push({
          kind: "drop",
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 2.5,
          r: 2 + Math.random() * 2.5,
          life: 1,
        });
      }
      bursts.push({ kind: "ripple", x, y, r: 2, life: 1, max: 42 });
      return;
    }

    if (clickFx === "boom") {
      for (let i = 0; i < 3; i++) {
        bursts.push({
          kind: "ring",
          x,
          y,
          r: 4 + i * 6,
          life: 1,
          max: 70 + i * 18,
          w: 2.5 - i * 0.5,
        });
      }
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2;
        bursts.push({
          kind: "spark",
          x,
          y,
          vx: Math.cos(ang) * (4 + Math.random() * 3),
          vy: Math.sin(ang) * (4 + Math.random() * 3),
          life: 1,
          color: "200,220,255",
        });
      }
      return;
    }

    if (clickFx === "glass") {
      for (let i = 0; i < 22; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 7;
        bursts.push({
          kind: "shard",
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 1,
          rot: Math.random() * Math.PI,
          vr: -0.25 + Math.random() * 0.5,
          len: 4 + Math.random() * 10,
          life: 1,
        });
      }
      bursts.push({ kind: "flash", x, y, r: 18, life: 0.7, color: "220,235,255" });
      return;
    }

    if (clickFx === "nuke") {
      bursts.push({ kind: "flash", x, y, r: 80, life: 1, color: "255,255,220" });
      bursts.push({ kind: "fireball", x, y, r: 8, life: 1, max: 56 });
      bursts.push({ kind: "ring", x, y, r: 10, life: 1, max: 120, w: 3 });
      for (let i = 0; i < 36; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 5;
        bursts.push({
          kind: "smoke",
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 0.8,
          r: 6 + Math.random() * 14,
          life: 1,
        });
      }
      for (let i = 0; i < 20; i++) {
        const ang = Math.random() * Math.PI * 2;
        bursts.push({
          kind: "spark",
          x,
          y,
          vx: Math.cos(ang) * (3 + Math.random() * 6),
          vy: Math.sin(ang) * (3 + Math.random() * 6) - 2,
          life: 1,
          color: "255,160,60",
        });
      }
    }
  }

  function drawBursts() {
    const next = [];
    for (const b of bursts) {
      if (b.kind === "drop") {
        b.vy += 0.18;
        b.x += b.vx;
        b.y += b.vy;
        b.life *= 0.94;
        if (b.life > 0.05) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(120,190,255,${b.life * 0.85})`;
          ctx.ellipse(b.x, b.y, b.r * 0.7, b.r, 0, 0, Math.PI * 2);
          ctx.fill();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "ripple") {
        b.r += (b.max - b.r) * 0.12;
        b.life *= 0.9;
        if (b.life > 0.04) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(140,200,255,${b.life * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "ring") {
        b.r += (b.max - b.r) * 0.1;
        b.life *= 0.92;
        if (b.life > 0.04) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(180,210,255,${b.life * 0.8})`;
          ctx.lineWidth = b.w || 2;
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "spark") {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.94;
        b.vy *= 0.94;
        b.life *= 0.9;
        if (b.life > 0.05) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${b.color},${b.life})`;
          ctx.lineWidth = 1.5;
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2);
          ctx.stroke();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "shard") {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.12;
        b.rot += b.vr;
        b.life *= 0.93;
        if (b.life > 0.05) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(b.len, b.len * 0.25);
          ctx.lineTo(b.len * 0.2, b.len * 0.55);
          ctx.closePath();
          ctx.fillStyle = `rgba(210,230,255,${b.life * 0.75})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${b.life * 0.5})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          ctx.restore();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "flash") {
        b.life *= 0.82;
        if (b.life > 0.04) {
          const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          rg.addColorStop(0, `rgba(${b.color},${b.life * 0.9})`);
          rg.addColorStop(1, `rgba(${b.color},0)`);
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "fireball") {
        b.r += (b.max - b.r) * 0.14;
        b.life *= 0.93;
        if (b.life > 0.05) {
          const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          rg.addColorStop(0, `rgba(255,240,180,${b.life})`);
          rg.addColorStop(0.45, `rgba(255,140,40,${b.life * 0.7})`);
          rg.addColorStop(1, "rgba(80,20,0,0)");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          next.push(b);
        }
        continue;
      }

      if (b.kind === "smoke") {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.96;
        b.vy *= 0.96;
        b.r += 0.35;
        b.life *= 0.94;
        if (b.life > 0.04) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(60,55,50,${b.life * 0.22})`;
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          next.push(b);
        }
      }
    }
    bursts = next;
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawWeather();
    drawBursts();
    drawCursor();
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    resize();
    initWeather();
  });
  // pointermove 比 mousemove 更贴合触控板/指针更新时机
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true }
  );
  window.addEventListener("pointerleave", () => {
    mouse.x = -999;
    mouse.y = -999;
  });
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      spawnClick(e.clientX, e.clientY);
    },
    { passive: true }
  );

  resize();
  initWeather();
  frame();

  window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
})();
// AI-GEN-END
