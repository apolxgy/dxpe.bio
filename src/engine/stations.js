import { PASS, HERO, CREW, MEMBERS, AFFILIATIONS, JOIN, LINKS } from "../content.js";
import { defaultAvatar } from "./presence.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const isRed = (suit) => suit === "♥" || suit === "♦";

const BARS = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2];

function pass() {
  return `
    <div class="pass">
      <div class="pass__card glass">
        <span class="pass__cut pass__cut--l" aria-hidden="true"></span>
        <span class="pass__cut pass__cut--r" aria-hidden="true"></span>
        <header class="pass__head">
          <span class="pass__word">${esc(PASS.word)}</span>
          <span class="pass__serial">${esc(PASS.serial)}</span>
        </header>
        <div class="pass__lines" aria-hidden="true">
          <span>${esc(PASS.lines[0])}</span>
          <span class="pass__out">${esc(PASS.lines[1])}</span>
        </div>
        <p class="pass__note">${esc(PASS.note)}</p>
        <footer class="pass__foot">
          <ul class="pass__meta">${PASS.meta.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
          <div class="pass__code" aria-hidden="true">${BARS.map((w) => `<i style="width:${w}px"></i>`).join("")}</div>
        </footer>
        <span class="pass__stamp" aria-hidden="true"><b>${esc(PASS.stamp)}</b><i>${esc(PASS.word)}</i></span>
      </div>
      <p class="pass__hint">${esc(PASS.hint)}</p>
    </div>`;
}

function hero() {
  return `
    <div class="hero">
      <p class="stage__index">${esc(HERO.eyebrow)}</p>
      <h1 class="hero__mark">${esc(PASS.word)}</h1>
      <p class="hero__tag">${esc("TANONG MO SA GF MONG KA-DISCORD NAMIN KUNG SINO KAMI <3")}</p>
      <p class="stage__lede">${esc(HERO.lede)}</p>
    </div>`;
}

function crew() {
  const cards = MEMBERS.map((m, deckIndex) => {
    const red = !m.joker && isRed(m.suit);
    const rank = m.joker ? "★" : m.rank;
    const suit = m.joker ? "♛" : m.suit;
    return `<article class="pc${red ? " pc--red" : ""}${m.joker ? " pc--joker" : ""}" style="--i:${deckIndex}" data-id="${m.id}" tabindex="0" role="button" aria-label="${esc(m.name)} — ${esc(m.role)}">
        <div class="pc__inner">
          <div class="pc__side pc__side--back" aria-hidden="true">
            <div class="pc__lattice"></div>
            <span class="pc__backmark"><b>${rank}</b><small>${suit}</small></span>
            <span class="pc__backmark pc__backmark--br"><b>${rank}</b><small>${suit}</small></span>
            <span class="pc__emblem">✦</span>
            <span class="pc__brand">dxpe</span>
          </div>
          <div class="pc__side pc__side--front">
            <img class="pc__av" src="${defaultAvatar(m.id)}" alt="" loading="lazy" decoding="async" />
            <span class="pc__scrim" aria-hidden="true"></span>
            <span class="pc__corner"><b>${rank}</b><small>${suit}</small></span>
            <span class="pc__dot" data-status="off" aria-hidden="true"></span>
            <span class="pc__sheen" aria-hidden="true"></span>
            <span class="pc__foot"><b title="${esc(m.name)}">${esc(m.name)}</b><small>${esc(m.role)}</small></span>
          </div>
        </div>
      </article>`;
  }).join("");

  return `
    <div class="stage">
      <div class="stage__head">
        <div>
          <p class="stage__index">${esc(CREW.eyebrow)}</p>
          <h2 class="stage__title">${CREW.title}</h2>
        </div>
        <p class="stage__lede" style="margin: 0; max-width: 34ch">${esc(CREW.lede)}</p>
      </div>
      <div class="deck-bar">
        <span class="deck-count">${esc(CREW.count)}</span>
        <div class="deck-tools">
          <button class="deck-btn" type="button" data-deck="flip" aria-pressed="false">
            <b>FLIP ALL</b>
          </button>
          <button class="deck-btn" type="button" data-deck="shuffle">
            <b>SHUFFLE</b>
          </button>
        </div>
      </div>
      <div class="rail-wrap"><div class="rail">${cards}</div></div>
    </div>`;
}

function affiliations() {
  const partners = AFFILIATIONS.partners;

  const strip = partners
    .map((p) => `<span>${esc(p.name)}</span><span class="d">✦</span>`)
    .join("");

  const doors = partners
    .map((p) => {
      const plate = p.banner
        ? `background-image:url('${p.banner}')`
        : `background-image:url('${p.icon}');transform:scale(1.6);filter:blur(14px) saturate(1.2)`;

      return `<li>
        <a class="aff" href="${p.invite}" target="_blank" rel="noreferrer noopener"
           aria-label="join ${esc(p.name)} on discord">
          <span class="aff__banner" style="${plate}" aria-hidden="true"></span>
          <span class="aff__scrim" aria-hidden="true"></span>
          <span class="aff__ghost" aria-hidden="true">${esc((p.name.match(/[A-Za-z0-9]+/) || [p.name])[0].toLowerCase())}</span>
          <span class="aff__in">
            <span class="aff__icon" style="background-image:url('${p.icon}')" aria-hidden="true"></span>
            <span class="aff__name">${esc(p.name)}</span>
            <span class="aff__meta"><i aria-hidden="true"></i>${p.online} online · ${p.members} members</span>
            <span class="aff__go">join <i aria-hidden="true">↗</i></span>
          </span>
        </a>
      </li>`;
    })
    .join("");

  return `
    <div class="stage">
      <p class="stage__index">${esc(AFFILIATIONS.eyebrow)}</p>
      <div class="stage__head">
        <h2 class="stage__title">${AFFILIATIONS.title}</h2>
        <p class="stage__lede" style="margin: 0; max-width: 30ch">${esc(AFFILIATIONS.sub)}</p>
      </div>
      <div class="ticker" aria-hidden="true"><div class="ticker__run">${strip}${strip}</div></div>
      <ul class="affs">${doors}</ul>
      <p class="affs__note">${esc(AFFILIATIONS.note)}</p>
    </div>`;
}

function join() {
  return `
    <div class="join">
      <p class="join__mark">${esc(PASS.word)}</p>
      <h2 class="join__title">${JOIN.title}</h2>
      <p class="join__lede">${esc(JOIN.lede)}</p>
      <div class="join__cta">
        <a class="ui-btn ui-btn--primary" href="${LINKS.discord}" target="_blank" rel="noopener">
          <span aria-hidden="true">✦</span>${esc(JOIN.cta)}
        </a>
        <button type="button" class="ui-btn" data-act="restart">${esc(JOIN.secondary)}</button>
      </div>
      <ul class="join__credits">
        ${JOIN.credits.map((c) => `<li>${esc(c)}</li>`).join("")}
      </ul>
    </div>`;
}

export const STATIONS = [
  { id: "pass", gate: "step inside", hint: "", html: pass },
  { id: "hero", gate: "next station", hint: "move the cursor", html: hero },
  { id: "crew", gate: "the affiliations", hint: "drag the rail", html: crew },
  { id: "affiliations", gate: "run with us", hint: "nothing to scroll", html: affiliations },
  { id: "join", gate: "start over", hint: "", html: join },
];

export function mountStations(layer) {
  layer.innerHTML = "";
  return STATIONS.map((station) => {
    const el = document.createElement("section");
    el.className = `station station--${station.id}`;
    el.dataset.id = station.id;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = station.html();
    layer.append(el);
    return el;
  });
}
