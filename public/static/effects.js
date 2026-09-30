// AI-GEN-BEGIN
(function () {
  const weather = document.body.getAttribute("data-weather") || "none";
  const cursor = document.body.getAttribute("data-cursor") || "none";
  if (weather === "none" && cursor === "none") return;

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
      for (let i = 0; i < 12; i++) {
        const ang = t * 4 + (i / 12) * Math.PI * 2;
        const rad = 10 + (i % 4) * 4;
        const x = mouse.x + Math.cos(ang) * rad;
        const y = mouse.y + Math.sin(ang) * rad;
        ctx.beginPath();
        ctx.fillStyle = `rgba(120,180,255,${0.35 - i * 0.02})`;
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(160,200,255,0.25)";
      ctx.lineWidth = 1;
      ctx.arc(mouse.x, mouse.y, 16 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (cursor === "animal") {
      trails.push({ x: mouse.x, y: mouse.y, life: 1 });
      if (trails.length > 28) trails.shift();
      for (let i = 0; i < trails.length; i++) {
        const tr = trails[i];
        tr.life *= 0.92;
        const size = 4 + (i / trails.length) * 10;
        const alpha = tr.life * 0.45;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,180,120,${alpha})`;
        // 简化「小兽」残影：椭圆身体 + 耳
        ctx.ellipse(tr.x, tr.y, size * 0.9, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,150,90,${alpha})`;
        ctx.arc(tr.x - size * 0.35, tr.y - size * 0.45, size * 0.28, 0, Math.PI * 2);
        ctx.arc(tr.x + size * 0.15, tr.y - size * 0.5, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawWeather();
    drawCursor();
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    resize();
    initWeather();
  });
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = -999;
    mouse.y = -999;
  });

  resize();
  initWeather();
  frame();

  window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
})();
// AI-GEN-END
