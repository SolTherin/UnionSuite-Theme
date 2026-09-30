/* Hub sign-in page mockup: animated triangle field.
 *
 * One fixed <canvas> behind the page draws a mosaic of right triangles. Each
 * frame computes a signed tone per triangle (positive = light overlay,
 * negative = dark overlay) from:
 *   - the intro reveal: a left-to-right sweep that fades each triangle in with
 *     a brief highlight, instead of animating DOM elements or background images
 *   - a slow breathing twinkle and an occasional diagonal shimmer band
 *   - a soft glow that follows the pointer and uncovers the hidden grid
 *   - ripples sent out from the sign-in form on focus and submit
 *
 * Only the canvas repaints, so the page content never reflows. Motion stops
 * for prefers-reduced-motion and pauses while the tab is hidden.
 */
(function () {
  "use strict";

  var CELL = 64;                 // triangle cell size; recalculated on resize
  var LIGHT_MAX = 0.2;           // alpha at tone +1
  var DARK_MAX = 0.42;           // alpha at tone -1
  var REVEAL_SPREAD = 1.8;       // seconds the intro sweep takes to cross
  var REVEAL_DURATION = 1.8;     // seconds each triangle takes to fade in
  var SHIMMER_PERIOD = 16;       // seconds between shimmer passes
  var POINTER_RADIUS = 170;
  var RIPPLE_SPEED = 900;        // pixels per second
  var RIPPLE_LIFE = 1.6;         // seconds
  var IDLE_FRAME_MS = 32;        // ~30fps when only ambient motion is running

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var settings = { shimmer: true, pointer: true, ripple: true };

  var canvas = document.createElement("canvas");
  canvas.className = "login-field";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");

  var colours = readColours();
  var triangles = [];
  var width = 0;
  var height = 0;
  var dpr = 1;
  var startTime = performance.now();  // reset by playIntro; t = 0 draws nothing
  var lastDraw = 0;
  var frameId = 0;
  var ripples = [];
  var pointer = { x: 0, y: 0, sx: 0, sy: 0, strength: 0, target: 0 };

  /* ---------- Setup ---------- */

  function readColours() {
    var style = getComputedStyle(root);
    return {
      light: hexToRgb(style.getPropertyValue("--login-tri-light"), [90, 203, 248]),
      dark: hexToRgb(style.getPropertyValue("--login-tri-dark"), [0, 18, 26])
    };
  }

  function hexToRgb(value, fallback) {
    var match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
    if (!match) {
      return fallback;
    }
    var n = parseInt(match[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Deterministic per-cell random, so resizing keeps the same pattern.
  function cellRandom(col, row) {
    var seed = (col * 73856093) ^ (row * 19349663) ^ 0x5bd1e995;
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function smoothstep(edge0, edge1, x) {
    var t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    CELL = Math.round(Math.min(72, Math.max(40, width / 32)));
    buildTriangles();
    draw(performance.now(), true);
  }

  function buildTriangles() {
    triangles = [];
    var cols = Math.ceil(width / CELL) + 1;
    var rows = Math.ceil(height / CELL) + 1;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var rand = cellRandom(col, row);
        var x = col * CELL;
        var y = row * CELL;
        var r = x + CELL;
        var b = y + CELL;

        if (rand() < 0.5) {
          addTriangle([x, y, r, y, x, b], rand);
          addTriangle([r, y, r, b, x, b], rand);
        } else {
          addTriangle([x, y, r, y, r, b], rand);
          addTriangle([x, y, r, b, x, b], rand);
        }
      }
    }
  }

  function addTriangle(points, rand) {
    var cx = (points[0] + points[2] + points[4]) / 3;
    var cy = (points[1] + points[3] + points[5]) / 3;

    // Sweep position: 0 at the left edge, 1 at the right, slanted so the
    // pattern reaches further right along the top of the screen.
    var u = cx / width + (cy / height - 0.5) * 0.14;

    // Dense on the left, dissolving into plain gradient towards the right.
    var mask = 1 - smoothstep(0.26, 0.66, u + (rand() - 0.5) * 0.14);

    // Mostly quiet tones with occasional strong light or dark triangles.
    var tone = rand() * 2 - 1;
    tone = (tone < 0 ? -1 : 1) * Math.pow(Math.abs(tone), 1.35);
    if (tone < 0) {
      tone *= 1.1;
    }
    if (rand() < 0.2) {
      tone *= 0.15;
    }

    triangles.push({
      points: points,
      cx: cx,
      cy: cy,
      u: u,
      mask: mask,
      base: tone * mask,
      grain: 0.35 + rand() * 0.65,
      phase: rand() * Math.PI * 2,
      delay: Math.max(0, u) * REVEAL_SPREAD + rand() * 0.35
    });
  }

  /* ---------- Drawing ---------- */

  function motionAllowed() {
    return !reduceMotion.matches;
  }

  function draw(now, force) {
    var animate = motionAllowed();
    var t = (now - startTime) / 1000;
    var introRunning = animate && t < REVEAL_SPREAD + REVEAL_DURATION + 0.4;

    // Ease the pointer glow towards its target position and strength.
    pointer.sx += (pointer.x - pointer.sx) * 0.12;
    pointer.sy += (pointer.y - pointer.sy) * 0.12;
    pointer.strength += (pointer.target - pointer.strength) * 0.06;

    ripples = ripples.filter(function (ripple) {
      return (now - ripple.start) / 1000 < RIPPLE_LIFE;
    });

    var busy = introRunning ||
      ripples.length > 0 ||
      Math.abs(pointer.target - pointer.strength) > 0.01 ||
      Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.5;

    if (!force && !busy && now - lastDraw < IDLE_FRAME_MS) {
      return;
    }
    lastDraw = now;

    var shimmerAt = ((t % SHIMMER_PERIOD) / SHIMMER_PERIOD) * 1.8 - 0.4;
    var pointerOn = animate && settings.pointer && pointer.strength > 0.005;
    var shimmerOn = animate && settings.shimmer;
    var radius2 = 2 * POINTER_RADIUS * POINTER_RADIUS;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < triangles.length; i++) {
      var tri = triangles[i];
      var v = tri.base;

      if (animate) {
        var p = Math.min(1, Math.max(0, (t - tri.delay) / REVEAL_DURATION));
        var eased = p * p * (3 - 2 * p);  // ease in and out

        v = v * eased * (1 + 0.2 * Math.sin(t * 0.5 + tri.phase));

        // Brief highlight as each triangle arrives.
        v += Math.sin(Math.PI * p) * 0.22 * tri.grain * tri.mask;

        if (shimmerOn) {
          var ds = tri.u - shimmerAt;
          v += 0.3 * tri.grain * Math.exp(-(ds * ds) / 0.003) * (0.3 + 0.7 * tri.mask);
        }

        if (pointerOn) {
          var px = tri.cx - pointer.sx;
          var py = tri.cy - pointer.sy;
          v += pointer.strength * 0.8 * tri.grain * Math.exp(-(px * px + py * py) / radius2);
        }

        for (var r = 0; r < ripples.length; r++) {
          var ripple = ripples[r];
          var age = (now - ripple.start) / 1000;
          var rx = tri.cx - ripple.x;
          var ry = tri.cy - ripple.y;
          var ring = Math.sqrt(rx * rx + ry * ry) - age * RIPPLE_SPEED;
          v += ripple.amp * tri.grain * Math.exp(-(ring * ring) / 6000) * (1 - age / RIPPLE_LIFE);
        }
      }

      if (v > -0.01 && v < 0.01) {
        continue;
      }

      var rgb = v > 0 ? colours.light : colours.dark;
      var alpha = Math.min(1, v > 0 ? v * LIGHT_MAX : -v * DARK_MAX);
      var pts = tri.points;

      ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.lineTo(pts[4], pts[5]);
      ctx.closePath();
      ctx.fill();
    }
  }

  function loop(now) {
    draw(now, false);
    frameId = requestAnimationFrame(loop);
  }

  function startLoop() {
    cancelAnimationFrame(frameId);
    if (motionAllowed() && !document.hidden) {
      frameId = requestAnimationFrame(loop);
    } else {
      draw(performance.now(), true);
    }
  }

  /* ---------- Intro ---------- */

  function playIntro() {
    document.body.classList.remove("is-ready");
    void document.body.offsetWidth;  // restart the CSS animations
    startTime = performance.now();
    document.body.classList.add("is-ready");
    startLoop();
  }

  // Wait for web fonts (capped) so the logo text never swaps mid-animation.
  function whenFontsReady(callback) {
    var done = false;
    function finish() {
      if (!done) {
        done = true;
        callback();
      }
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(finish);
    }
    setTimeout(finish, 1000);
  }

  /* ---------- Interaction ---------- */

  function addRipple(element, amp) {
    if (!settings.ripple || !motionAllowed()) {
      return;
    }
    var box = element.getBoundingClientRect();
    ripples.push({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      amp: amp,
      start: performance.now()
    });
  }

  window.addEventListener("pointermove", function (event) {
    if (pointer.target === 0) {
      pointer.sx = event.clientX;
      pointer.sy = event.clientY;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.target = event.pointerType === "mouse" ? 1 : 0.7;
  }, { passive: true });

  document.addEventListener("pointerleave", function () {
    pointer.target = 0;
  });

  var form = document.querySelector(".login-form");
  var submit = document.querySelector(".login-submit");

  if (form && submit) {
    form.addEventListener("focusin", function (event) {
      if (event.target.tagName === "INPUT") {
        addRipple(event.target, 0.35);
      }
    });

    form.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && event.target.tagName === "INPUT") {
        submit.click();
      }
    });

    // Mockup only: iMIS posts back here. The ripple plays while it does.
    submit.addEventListener("click", function () {
      addRipple(submit, 0.9);
      submit.classList.add("is-busy");
      submit.textContent = "Signing in…";
      setTimeout(function () {
        submit.classList.remove("is-busy");
        submit.textContent = "Sign In";
      }, 1600);
    });
  }

  /* ---------- Preview controls ---------- */

  document.querySelectorAll(".demo-controls [data-demo]").forEach(function (button) {
    button.addEventListener("click", function () {
      var name = button.getAttribute("data-demo");
      if (name === "replay") {
        playIntro();
        return;
      }
      if (name === "brand") {
        var client = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(client));
        document.querySelectorAll(".login-brand[data-brand]").forEach(function (brand) {
          brand.hidden = (brand.getAttribute("data-brand") === "client") !== client;
        });
        playIntro();
        return;
      }
      settings[name] = !settings[name];
      button.setAttribute("aria-pressed", String(settings[name]));
    });
  });

  /* ---------- Lifecycle ---------- */

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  document.addEventListener("visibilitychange", startLoop);

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", startLoop);
  }

  resize();
  whenFontsReady(playIntro);
})();
