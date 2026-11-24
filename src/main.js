import "./styles/base.css";
import "./styles/hud.css";
import "./styles/stations.css";

import { createWorld } from "./engine/scene.js";
import { createAudio } from "./engine/audio.js";
import { STATIONS, mountStations } from "./engine/stations.js";
import { GALLERY, MEMBERS } from "./content.js";
import { watchPresence, defaultAvatar, getPresence } from "./engine/presence.js";
import {
  createGate,
  createGallery,
  createSoundToggle,
  createThemeToggle,
  createCursor,
  watchPointer,
} from "./engine/ui.js";

const $ = (sel) => document.querySelector(sel);

const canvas = $("#gl");
const layer = $("#station-layer");
const hints = $("#hints");
const loader = $("#loader");
const fallback = $("#ui-fallback");
const logo = $("#ui-logo");
const actions = $(".ui-actions");
const shutterEl = $("#shutter");
const flashEl = $("#flash");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const audio = createAudio();
const gallery = createGallery($("#ui-gallery"), $("#ui-gallery-grid"), GALLERY);
const gate = createGate($("#gate"), () => advance());
createCursor();

let musicArmed = false;
function startMusicOnce(event) {
  if (musicArmed) return;
  if (event?.target?.closest?.("#ui-sound")) return;
  musicArmed = true;
  window.removeEventListener("pointerdown", startMusicOnce);
  window.removeEventListener("keydown", startMusicOnce);
  if (audio.isOn) return;
  audio.toggle(true).then(() => soundToggle.paint());
}
window.addEventListener("pointerdown", startMusicOnce, { passive: true });
window.addEventListener("keydown", startMusicOnce);

let world = null;
try {
  world = canvas ? createWorld(canvas) : null;
} catch (err) {
  console.error(err);
}

function showFallback(detail = "") {
  const d = $("#ui-fallback-detail");
  if (d) d.textContent = detail;
  fallback.hidden = false;
  loader.classList.add("out");
  logo.classList.remove("is-on");
  actions.classList.remove("is-on");
  gate.hide();
}

if (!world) showFallback("WebGL2 context could not be created on this device.");

const theme = createThemeToggle($("#ui-theme"), document.documentElement, (next) => {
  world?.setTheme(next);
  audio.blip(next === "light" ? 880 : 520);
});
world?.setTheme(theme.get());

const soundToggle = createSoundToggle($("#ui-sound"), audio);

let stations = [];
let index = 0;
let bootDone = false;
let started = false;
let busy = false;

function applyStationDom(i, { instant = false } = {}) {
  stations.forEach((el, n) => {
    const current = n === i;
    el.dataset.state = current ? "in" : "out";
    el.setAttribute("aria-hidden", current ? "false" : "true");
    el.querySelectorAll("button, a, [role='button']").forEach((node) => {
      node.tabIndex = current ? 0 : -1;
    });
    if (instant) {
      el.style.transition = "none";
      requestAnimationFrame(() => (el.style.transition = ""));
    }
  });
}

function paintHints() {
  const hint = STATIONS[index].hint;
  hints.innerHTML = hint
    ? `<span>${hint}</span><span>E next · ← back · 1–5 to jump</span>`
    : `<span>E next · ← back · 1–5 to jump</span>`;
}

function buildStations() {
  stations = mountStations(layer);
  applyStationDom(index, { instant: true });
  paintHints();
}

let presenceStarted = false;

function startPresence() {
  if (presenceStarted) return;
  presenceStarted = true;
  watchPresence(MEMBERS, (id, info) => {
    const card = layer.querySelector(`.pc[data-id="${id}"]`);
    if (!card) return;
    const img = card.querySelector(".pc__av");
    if (img && info.img && img.getAttribute("src") !== info.img) img.src = info.img;
    const dot = card.querySelector(".pc__dot");
    if (dot) dot.dataset.status = info.status === "offline" ? "off" : info.status;
    const label = card.querySelector(".pc__foot b");
    if (label && info.name && label.textContent !== info.name) {
      label.textContent = info.name;
      card.setAttribute("aria-label", `${info.name} — ${label.nextElementSibling?.textContent || "member"}`);
    }
  });
}

function shutterIn() {
  shutterEl.classList.remove("out");
  shutterEl.classList.add("in");
  return sleep(760);
}

function shutterOut() {
  shutterEl.classList.remove("in");
  shutterEl.classList.add("out");
  setTimeout(() => shutterEl.classList.remove("out"), 700);
}

function enterPass() {
  const el = layer.querySelector(".pass");
  if (!el) return;
  el.classList.remove("is-enter");
  void el.offsetWidth;
  el.classList.add("is-enter");
}

function flashScreen() {
  if (!flashEl) return;
  flashEl.classList.remove("is-fire");
  void flashEl.offsetWidth;
  flashEl.classList.add("is-fire");
}

function stampPass(el) {
  el.classList.add("is-open");
  el.classList.remove("is-stamped");
  void el.offsetWidth;
  el.classList.add("is-stamped");
  flashScreen();
  audio.stamp();
}

function openPass() {
  const el = layer.querySelector(".pass");
  if (el && !el.classList.contains("is-open")) stampPass(el);
  bootDone = true;
  gate.setLabel("step inside");
  paintHints();
  gate.show();
}

async function goTo(target) {
  const to = Math.max(0, Math.min(STATIONS.length - 1, target));
  if (busy || gallery.isOpen() || memberDialog?.open) return;
  if (to === index) return;

  busy = true;
  gate.hide();
  audio.blip(540);
  await shutterIn();

  index = to;
  applyStationDom(index);
  world?.setStation(index);
  if (STATIONS[index].id === "pass") {
    const el = layer.querySelector(".pass");
    if (bootDone) el?.classList.add("is-open");
  }
  if (STATIONS[index].id === "crew") {
    startPresence();
    setTimeout(autoShuffle, 900);
  }
  paintNav();
  gate.setLabel(STATIONS[index].gate);
  paintHints();

  await sleep(60);
  shutterOut();
  audio.thud();
  await sleep(560);
  gate.show();
  busy = false;
}

async function restart() {
  if (busy || gallery.isOpen() || memberDialog?.open) return;
  busy = true;
  gate.hide();
  audio.blip(440);
  await shutterIn();

  index = 0;
  applyStationDom(0);
  world?.setStation(0);
  bootDone = false;
  const passEl = layer.querySelector(".pass");
  passEl?.classList.remove("is-enter", "is-open", "is-stamped");
  setTimeout(enterPass, 620);
  paintNav();
  gate.setLabel(STATIONS[0].gate);
  paintHints();

  await sleep(60);
  shutterOut();
  audio.thud();
  await sleep(560);
  gate.show();
  busy = false;
}

async function advance() {
  if (busy || gallery.isOpen() || memberDialog?.open) return;

  if (index === 0 && !bootDone) {
    openPass();
    return;
  }

  if (index >= STATIONS.length - 1) {
    await restart();
    return;
  }

  await goTo(index + 1);
}

const nav = $("#ui-nav");

function buildNav() {
  nav.innerHTML = STATIONS.map(
    (station, i) =>
      `<button type="button" class="ui-nav__item" data-to="${i}" ` +
      `aria-label="Go to ${i + 1} of ${STATIONS.length}: ${station.id}">` +
      `<span class="ui-nav__num">${String(i + 1).padStart(2, "0")}</span>` +
      `<span class="ui-nav__label">${station.id}</span></button>`,
  ).join("");
}

function paintNav() {
  nav.querySelectorAll("[data-to]").forEach((btn) => {
    const current = Number(btn.dataset.to) === index;
    btn.classList.toggle("is-current", current);
    if (current) btn.setAttribute("aria-current", "step");
    else btn.removeAttribute("aria-current");
  });
}

nav?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-to]");
  if (btn) goTo(Number(btn.dataset.to));
});

document.addEventListener("keydown", (event) => {
  if (gallery.isOpen()) return;
  if (memberDialog?.open) {
    if (event.key === "Escape") closeMember();
    return;
  }

  const el = event.target instanceof HTMLElement ? event.target : null;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;

  const card = el?.closest?.(".pc");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    card.classList.toggle("is-open");
    return;
  }

  if (el && /^(BUTTON|A)$/.test(el.tagName) && [" ", "Enter"].includes(event.key)) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goTo(index - 1);
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    const to = Number(event.key) - 1;
    if (to < STATIONS.length) {
      event.preventDefault();
      goTo(to);
    }
    return;
  }

  if (["e", "E", "Enter", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
    advance();
  }
});

canvas?.addEventListener("pointerdown", () => {
  if (started) advance();
});

logo.addEventListener("click", () => {
  if (index === 0 && !busy) {
    openPass();
    audio.blip(660);
  } else {
    goTo(0);
    audio.blip(440);
  }
});

$("#ui-gallery-btn").addEventListener("click", () => {
  gate.hide();
  gallery.open();
  audio.blip(820);
});
$("#ui-fallback-gallery").addEventListener("click", () => gallery.open());
$("#ui-gallery").addEventListener("close", () => {
  if (!busy) gate.show();
});

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function paintRailEnd() {
  const wrap = layer.querySelector(".rail-wrap");
  if (!wrap) return;
  wrap.classList.toggle("is-end", wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2);
}

function deckParts() {
  const rail = layer.querySelector(".rail");
  const wrap = layer.querySelector(".rail-wrap");
  if (!rail || !wrap) return null;
  return { rail, wrap, cards: [...rail.children] };
}

function flipAll(button) {
  const deck = deckParts();
  if (!deck) return;
  const open = !deck.rail.classList.contains("is-revealed");
  deck.rail.classList.toggle("is-revealed", open);
  deck.cards.forEach((card) => card.classList.remove("is-open"));
  button?.setAttribute("aria-pressed", String(open));
  const label = button?.querySelector("b");
  if (label) label.textContent = open ? "FLIP BACK" : "FLIP ALL";
  audio.blip(open ? 880 : 560);
}

function shuffleDeck(button) {
  const deck = deckParts();
  if (!deck) return;
  const { rail, wrap, cards } = deck;

  if (rail.dataset.busy === "1" && Date.now() - Number(rail.dataset.busyAt || 0) < 5200) return;
  deckAutoShuffled = true;

  const k = reduceMotion.matches ? 0.55 : 1;
  const at = (ms) => Math.round(ms * k);
  const label = button?.querySelector("b");
  const wasLabel = label?.textContent;

  try {
    rail.dataset.busy = "1";
    rail.dataset.busyAt = String(Date.now());
    rail.classList.add("is-shuffling");
    if (label) label.textContent = "SHUFFLING";
    button?.setAttribute("aria-busy", "true");

    const homes = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    const view = wrap.getBoundingClientRect();
    const pileX = view.left + view.width / 2;
    const pileY = view.top + view.height / 2;

    const toPile = cards.map((card) => {
      const r = homes.get(card);
      return { dx: pileX - (r.left + r.width / 2), dy: pileY - (r.top + r.height / 2) };
    });

    const put = (card, x, y, z, ry, rz, scale, ms, delay, ease = "cubic-bezier(0.45, 0, 0.2, 1)") => {
      card.style.transition = "transform " + at(ms) + "ms " + ease + " " + at(delay) + "ms";
      card.style.transform =
        "translate3d(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px, " + z.toFixed(1) + "px) " +
        "rotateY(" + ry.toFixed(1) + "deg) rotateZ(" + rz.toFixed(1) + "deg) scale(" + scale + ")";
    };

    cards.forEach((card, i) => {
      const d = toPile[i];
      card.style.zIndex = String(100 + i);
      put(card, d.dx, d.dy - i * 0.9, i * 1.8, (Math.random() - 0.5) * 44, (Math.random() - 0.5) * 12, 0.9, 620, i * 14);
    });
    audio.blip(392);

    setTimeout(() => {
      cards.forEach((card, i) => {
        const d = toPile[i];
        const half = i < cards.length / 2 ? -1 : 1;
        put(card, d.dx + half * 96, d.dy - 34, i * 1.8, half * 16, half * -6, 0.88, 400, 0, "ease-in-out");
      });
      audio.blip(494);
    }, at(900));

    setTimeout(() => {
      cards.forEach((card, i) => {
        const d = toPile[i];
        put(card, d.dx, d.dy - i * 0.9, i * 1.8, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 8, 0.9, 260, 0, "ease-in-out");
      });
      audio.blip(587);
    }, at(1320));

    setTimeout(() => {
      const dealt = [...cards].sort(() => Math.random() - 0.5);
      dealt.forEach((card) => rail.appendChild(card));

      requestAnimationFrame(() => {
        dealt.forEach((card, i) => {
          const d = toPile[i];
          const from =
            "translate3d(" + d.dx + "px, " + (d.dy - i * 0.9) + "px, " + i * 1.8 + "px) rotateY(0deg) rotateZ(0deg) scale(0.9)";
          const mid =
            "translate3d(" + (d.dx * 0.42).toFixed(1) + "px, " + (d.dy - 54).toFixed(1) + "px, 90px) " +
            "rotateY(" + (i % 2 ? 1 : -1) * 18 + "deg) rotateZ(" + (i % 2 ? 1 : -1) * 7 + "deg) scale(0.98)";
          const target = "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)";

          card.style.transition = "none";
          card.style.transform = "";
          card.style.zIndex = "";

          if (typeof card.animate === "function") {
            const fly = card.animate(
              [
                { transform: from, offset: 0 },
                { transform: mid, offset: 0.45 },
                { transform: target, offset: 1 },
              ],
              {
                duration: at(760),
                delay: at(i * 48),
                easing: "cubic-bezier(0.22, 0.9, 0.2, 1)",
                fill: "both",
              },
            );
            fly.onfinish = () => fly.cancel();
          } else {
            card.style.transition = "transform " + at(760) + "ms cubic-bezier(0.22, 0.9, 0.2, 1) " + at(i * 48) + "ms";
            card.style.transform = from;
            void card.offsetWidth;
            card.style.transform = target;
          }
        });
        audio.blip(698);
      });

      setTimeout(() => {
        dealt.forEach((card) => {
          card.style.transition = "";
          card.style.transform = "";
          card.style.zIndex = "";
        });
        rail.classList.remove("is-shuffling");
        delete rail.dataset.busy;
        delete rail.dataset.busyAt;
        if (label) label.textContent = wasLabel || "SHUFFLE";
        button?.removeAttribute("aria-busy");
      }, at(760 + dealt.length * 48 + 160));
    }, at(1620));
  } catch (error) {
    console.error(error);
    rail.classList.remove("is-shuffling");
    delete rail.dataset.busy;
    delete rail.dataset.busyAt;
    if (label) label.textContent = wasLabel || "SHUFFLE";
    button?.removeAttribute("aria-busy");
  }
}

let deckAutoShuffled = false;

function autoShuffle() {
  if (deckAutoShuffled) return;
  const deck = deckParts();
  if (!deck) return;
  deckAutoShuffled = true;
  shuffleDeck(layer.querySelector('[data-deck="shuffle"]'));
}

const memberDialog = $("#ui-member");
const memberPanel = $("#ui-member-panel");
const memberBody = $("#ui-member-body");
const memberName = $("#ui-member-name");
const memberMeta = $("#ui-member-meta");
const memberCard = $("#ui-member-card");
const memberClose = $("#ui-member-close");

let openCard = null;
let memberTicker = 0;

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );

function since(ms) {
  const mins = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m";
  const hours = Math.floor(mins / 60);
  return hours < 24 ? hours + "h " + (mins % 60) + "m" : Math.floor(hours / 24) + "d " + (hours % 24) + "h";
}

function mmss(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
}

function actMarkup(act) {
  const spotify = act.kind === "spotify";

  const art =
    '<span class="act__glyph" aria-hidden="true">' + (spotify ? "♫" : "✦") + "</span>" +
    (act.art ? '<img src="' + esc(act.art) + '" alt="" loading="lazy" />' : "");

  const tail = spotify
    ? '<span class="seek" data-bar data-start="' + (act.start || 0) + '" data-end="' + (act.end || 0) + '">' +
      '<span class="seek__rail"><i class="seek__fill"></i></span>' +
      '<span class="seek__time"><b data-elapsed>0:00</b><b data-total>0:00</b></span>' +
      "</span>"
    : '<span class="act__since" data-sub data-start="' + (act.start || 0) + '"></span>';

  return (
    '<article class="act' + (spotify ? " act--spotify" : "") + '">' +
    '<div class="act__art">' + art + "</div>" +
    '<div class="act__txt">' +
    '<span class="act__kind">' + esc(act.kind) + "</span>" +
    '<b class="act__title">' + esc(act.title) + "</b>" +
    '<span class="act__sub">' + esc(act.sub || "") + "</span>" +
    tail +
    "</div></article>"
  );
}

function paintTimes() {
  if (!memberBody) return;

  memberBody.querySelectorAll("[data-sub]").forEach((el) => {
    const start = Number(el.getAttribute("data-start") || 0);
    if (!start) return;
    const span = since(start);
    el.textContent = span === "just now" ? "" : span + " in";
  });

  memberBody.querySelectorAll("[data-bar]").forEach((bar) => {
    const start = Number(bar.getAttribute("data-start") || 0);
    const end = Number(bar.getAttribute("data-end") || 0);
    if (!start || !end || end <= start) return;
    const now = Date.now();
    const p = Math.min(1, Math.max(0, (now - start) / (end - start)));
    bar.style.setProperty("--p", p.toFixed(4));
    const elapsed = bar.querySelector("[data-elapsed]");
    const total = bar.querySelector("[data-total]");
    if (elapsed) elapsed.textContent = mmss(Math.min(now - start, end - start));
    if (total) total.textContent = mmss(end - start);
  });
}

function paintMember(id) {
  const member = MEMBERS.find((m) => m.id === id);
  const rec = getPresence(id) || {
    id,
    img: defaultAvatar(id),
    name: member?.name || null,
    user: null,
    status: "offline",
    live: false,
    custom: null,
    activities: [],
  };

  if (memberPanel) {
    memberPanel.classList.toggle("is-photo", Boolean(member?.bg));
    memberPanel.style.setProperty("--bg-gif", member?.bg ? "url('" + member.bg + "')" : "none");
  }

  const rank = member?.joker ? "★ joker" : member?.rank ? member.rank + member.suit : "card";
  if (memberCard) memberCard.textContent = "dxpeboys — " + rank;
  if (memberName) memberName.textContent = rec.name || member?.name || "dxpeboys";
  if (memberMeta) {
    memberMeta.innerHTML =
      '<span class="ui-member__status" data-status="' + rec.status + '"><i aria-hidden="true"></i>' + esc(rec.status) + "</span>" +
      (rec.user ? "<span>@" + esc(rec.user) + "</span>" : "");
  }

  const custom = rec.custom;
  const emojiMark = custom?.emoji
    ? custom.emoji.url
      ? '<img class="ui-member__emoji" src="' + esc(custom.emoji.url) + '" alt="" />'
      : '<span class="ui-member__emoji">' + esc(custom.emoji.name) + "</span>"
    : "";

  const quote =
    custom && (custom.text || custom.emoji)
      ? '<span class="ui-member__custom">' + emojiMark + (custom.text ? "<b>" + esc(custom.text) + "</b>" : "") + "</span>"
      : "<span>" + esc(member?.role || "member") + " of the deck</span><em>" + esc(rank) + "</em>";

  if (memberBody) {
    memberBody.innerHTML =
      '<div class="ui-member__id' + (member?.bg ? " is-photo" : "") + '">' +
      '<img class="ui-member__av" src="' + esc(rec.img) + '" alt="" />' +
      '<div class="ui-member__quote">' + quote + "</div></div>" +
      (rec.activities.length
        ? rec.activities.map(actMarkup).join("")
        : '<p class="ui-member__empty">nothing playing — just here.</p>');
  }

  paintTimes();
}

function zoomCard(card, on) {
  card?.classList.toggle("is-zoom", on);
}

function openMember(card) {
  openCard = card;
  paintMember(card.dataset.id);
  zoomCard(card, true);
  gate.hide();
  if (typeof memberDialog.showModal === "function") memberDialog.showModal();
  else memberDialog.setAttribute("open", "");
  requestAnimationFrame(() => memberDialog.classList.add("is-in"));
  clearInterval(memberTicker);
  memberTicker = setInterval(paintTimes, 1000);
  audio.blip(760);
}

function closeMember() {
  if (!memberDialog?.open) return;
  clearInterval(memberTicker);
  memberTicker = 0;
  memberDialog.classList.add("is-out");
  memberDialog.classList.remove("is-in");
  audio.blip(520);
  setTimeout(() => {
    if (memberDialog.open) memberDialog.close();
    memberDialog.classList.remove("is-out");
    zoomCard(openCard, false);
    openCard = null;
    if (!busy) gate.show();
  }, 280);
}

memberDialog?.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (img instanceof HTMLImageElement && memberDialog.contains(img)) img.remove();
  },
  true,
);

memberClose?.addEventListener("click", closeMember);
memberDialog?.addEventListener("click", (event) => {
  if (event.target === memberDialog) closeMember();
});
memberDialog?.addEventListener("close", () => {
  clearInterval(memberTicker);
  memberTicker = 0;
  memberDialog.classList.remove("is-in", "is-out");
  zoomCard(openCard, false);
  openCard = null;
  if (!busy) gate.show();
});

layer.addEventListener("click", (event) => {
  const act = event.target.closest("[data-act]");
  if (act?.dataset.act === "restart") restart();

  const deckBtn = event.target.closest("[data-deck]");
  if (deckBtn) {
    if (deckBtn.dataset.deck === "flip") flipAll(deckBtn);
    else shuffleDeck(deckBtn);
    return;
  }

  const card = event.target.closest(".pc");
  if (card) {
    card.classList.add("is-open");
    openMember(card);
  }
});

const pointerTick = watchPointer((x, y) => world?.setPointer(x, y));

let last = performance.now();
let frames = 0;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  pointerTick();
  try {
    world?.update(dt, now / 1000);
    world?.render();
  } catch (err) {
    console.error(err);
    showFallback(String(err?.message || err));
    return;
  }

  if (!started && ++frames > 2) {
    started = true;
    loader.classList.add("out");
    logo.classList.add("is-on");
    logo.disabled = false;
    actions.classList.add("is-on");
    if (layer.querySelector(".pass")) {
      setTimeout(enterPass, 420);
      setTimeout(() => {
        gate.setLabel(STATIONS[0].gate);
        gate.show();
        hints.classList.add("is-on");
        nav?.classList.add("is-on");
      }, 1560);
    }
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener("resize", () => world?.resize());
window.addEventListener("orientationchange", () => setTimeout(() => world?.resize(), 280));

const jump = Number(new URLSearchParams(location.search).get("s"));
const deepLink = Number.isFinite(jump) && jump >= 1 && jump <= STATIONS.length;

buildStations();
buildNav();
paintNav();

layer.querySelector(".rail-wrap")?.addEventListener("scroll", paintRailEnd, { passive: true });
window.addEventListener("resize", paintRailEnd);
paintRailEnd();

if (deepLink) {
  index = jump - 1;
  applyStationDom(index, { instant: true });
  world?.setStation(index);
  bootDone = true;
  paintHints();
  if (STATIONS[index].id === "crew") {
    startPresence();
    setTimeout(autoShuffle, 2400);
  }
  setTimeout(() => {
    loader.classList.add("out");
    logo.classList.add("is-on");
    logo.disabled = false;
    actions.classList.add("is-on");
    gate.setLabel(STATIONS[index].gate);
    gate.show();
    hints.classList.add("is-on");
    nav?.classList.add("is-on");
  }, 40);
}
