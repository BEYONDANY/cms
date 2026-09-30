// AI-GEN-BEGIN
(function () {
  const root = document.getElementById("home-banner");
  if (!root) return;
  const slides = [...root.querySelectorAll(".home-banner-slide")];
  const dots = [...root.querySelectorAll(".home-banner-dot")];
  if (slides.length < 2) return;

  let index = 0;
  let timer = 0;
  const interval = Number(root.getAttribute("data-interval") || 5000) || 5000;

  function go(n) {
    index = (n + slides.length) % slides.length;
    slides.forEach((el, i) => el.classList.toggle("is-active", i === index));
    dots.forEach((el, i) => el.classList.toggle("is-active", i === index));
  }

  function next() {
    go(index + 1);
  }

  function start() {
    stop();
    timer = window.setInterval(next, interval);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = 0;
  }

  root.querySelector(".home-banner-prev")?.addEventListener("click", () => {
    go(index - 1);
    start();
  });
  root.querySelector(".home-banner-next")?.addEventListener("click", () => {
    go(index + 1);
    start();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      go(Number(dot.getAttribute("data-index") || 0));
      start();
    });
  });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  start();
})();
// AI-GEN-END
