export function createGate(el, onPress) {
  el.innerHTML = `<button type="button" class="gate__btn">
      <span class="gate__key" aria-hidden="true">E</span>
      <span class="gate__label"></span>
      <span class="gate__tap" aria-hidden="true">↗</span>
    </button>`;

  const btn = el.querySelector(".gate__btn");
  const label = el.querySelector(".gate__label");
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    onPress();
  });

  return {
    el,
    setLabel(text) {
      label.textContent = text;
      btn.setAttribute("aria-label", text);
    },
    show() {
      el.classList.add("is-on");
    },
    hide() {
      el.classList.remove("is-on");
    },
  };
}

export function createGallery(dialog, grid, copy) {
  grid.innerHTML = `
    <span class="soon__mark" aria-hidden="true">✦</span>
    <p class="soon__kicker">${copy.kicker}</p>
    <p class="soon__word"><span>${copy.words[0]}</span><span class="soon__out">${copy.words[1]}</span></p>
    <p class="soon__copy">${copy.copy}</p>
    <p class="soon__note">${copy.note}</p>`;

  dialog.querySelector("#ui-gallery-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  return {
    open() {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    },
    close() {
      if (dialog.open) dialog.close();
    },
    isOpen() {
      return dialog.open;
    },
  };
}

export function createSoundToggle(button, audio) {
  const label = button.querySelector("#ui-sound-label");

  function paint() {
    const on = audio.isOn;
    document.body.classList.toggle("is-audio", on);
    if (label) label.textContent = on ? "SOUND ON" : "SOUND OFF";
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Turn the sound off" : "Turn the sound on");
  }

  button.addEventListener("click", async () => {
    const on = await audio.toggle();
    paint();
    if (on) audio.blip(700);
  });

  paint();
  return { paint };
}

export function createThemeToggle(button, root, onChange) {
  let theme = "dark";
  try {
    theme = localStorage.getItem("dxpe-theme") || "dark";
  } catch {
    theme = "dark";
  }

  function apply(next) {
    theme = next;
    root.dataset.theme = next;
    root.style.colorScheme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#050506" : "#ffffff");
    try {
      localStorage.setItem("dxpe-theme", next);
    } catch {}
    button.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  apply(theme);

  button.addEventListener("click", () => {
    apply(theme === "dark" ? "light" : "dark");
    onChange?.(theme);
  });

  return {
    get: () => theme,
    set: apply,
  };
}

export function createCursor() {
  const cur = document.querySelector("#cur");
  if (!cur) return;
  const fine = matchMedia("(pointer: fine)").matches;
  document.body.classList.toggle("fine", fine);
  if (!fine) return;

  window.addEventListener(
    "pointermove",
    (event) => {
      cur.style.left = `${event.clientX}px`;
      cur.style.top = `${event.clientY}px`;
      const big = event.target.closest?.("a, button, .pc");
      cur.classList.toggle("big", Boolean(big));
    },
    { passive: true },
  );

  window.addEventListener("pointerdown", () => cur.classList.add("big"));
  window.addEventListener("pointerup", () => cur.classList.remove("big"));
}

export function watchPointer(onMove) {
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;

  window.addEventListener(
    "pointermove",
    (event) => {
      tx = (event.clientX / window.innerWidth) * 2 - 1;
      ty = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  return function tick() {
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    onMove(x, y);
  };
}
