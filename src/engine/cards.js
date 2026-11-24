import * as THREE from "three";

const BRIGHT = 0.95;
const DIM = 0.5;

function poly(arr, pts, closed = true) {
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    arr.push(a[0], a[1], b[0], b[1]);
  }
}

function rounded(w, h, r, steps = 4) {
  const hw = w / 2;
  const hh = h / 2;
  const pts = [];
  const arcs = [
    [hw - r, hh - r, 0],
    [-(hw - r), hh - r, Math.PI / 2],
    [-(hw - r), -(hh - r), Math.PI],
    [hw - r, -(hh - r), Math.PI * 1.5],
  ];
  for (const [cx, cy, a0] of arcs) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

function circle(cx, cy, r, steps = 16) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

const place = (pts, s, dx = 0, dy = 0, flip = false) =>
  pts.map(([x, y]) => [dx + (flip ? -x : x) * s, dy + (flip ? -y : y) * s]);

const DIAMOND = [
  [0, 0.5],
  [0.34, 0],
  [0, -0.5],
  [-0.34, 0],
];

const HEART = [
  [0, -0.5],
  [0.1, -0.36],
  [0.22, -0.2],
  [0.3, -0.04],
  [0.33, 0.1],
  [0.29, 0.24],
  [0.19, 0.33],
  [0.09, 0.32],
  [0.02, 0.24],
  [0, 0.17],
  [-0.02, 0.24],
  [-0.09, 0.32],
  [-0.19, 0.33],
  [-0.29, 0.24],
  [-0.33, 0.1],
  [-0.3, -0.04],
  [-0.22, -0.2],
  [-0.1, -0.36],
];

const SPADE = [
  [0, 0.52],
  [0.14, 0.34],
  [0.27, 0.15],
  [0.33, -0.02],
  [0.28, -0.16],
  [0.18, -0.2],
  [0.1, -0.18],
  [0.06, -0.12],
  [0.07, -0.24],
  [0.15, -0.4],
  [0.15, -0.46],
  [-0.15, -0.46],
  [-0.15, -0.4],
  [-0.07, -0.24],
  [-0.06, -0.12],
  [-0.1, -0.18],
  [-0.18, -0.2],
  [-0.28, -0.16],
  [-0.33, -0.02],
  [-0.27, 0.15],
  [-0.14, 0.34],
];

const CLUB = [
  ...circle(0, 0.24, 0.17, 14),
  ...circle(-0.19, -0.04, 0.17, 14),
  ...circle(0.19, -0.04, 0.17, 14),
];
const CLUB_STEM = [
  [-0.13, -0.46],
  [0.13, -0.46],
  [0.13, -0.4],
  [0.05, -0.16],
  [-0.05, -0.16],
  [-0.13, -0.4],
];

const SUITS = { s: SPADE, h: HEART, d: DIAMOND, c: CLUB };

const LAYOUT = {
  1: [[0, 0, 1.9]],
  2: [
    [0, 0.36],
    [0, -0.36],
  ],
  3: [
    [0, 0.44],
    [0, 0],
    [0, -0.44],
  ],
  4: [
    [-0.21, 0.36],
    [0.21, 0.36],
    [-0.21, -0.36],
    [0.21, -0.36],
  ],
  5: [
    [-0.21, 0.38],
    [0.21, 0.38],
    [0, 0],
    [-0.21, -0.38],
    [0.21, -0.38],
  ],
  6: [
    [-0.21, 0.42],
    [0.21, 0.42],
    [-0.21, 0],
    [0.21, 0],
    [-0.21, -0.42],
    [0.21, -0.42],
  ],
  7: [
    [-0.21, 0.42],
    [0.21, 0.42],
    [0, 0.22],
    [-0.21, 0],
    [0.21, 0],
    [-0.21, -0.42],
    [0.21, -0.42],
  ],
  8: [
    [-0.21, 0.42],
    [0.21, 0.42],
    [0, 0.22],
    [-0.21, 0],
    [0.21, 0],
    [0, -0.22],
    [-0.21, -0.42],
    [0.21, -0.42],
  ],
  9: [
    [-0.21, 0.45],
    [0.21, 0.45],
    [-0.21, 0.15],
    [0.21, 0.15],
    [0, 0],
    [-0.21, -0.15],
    [0.21, -0.15],
    [-0.21, -0.45],
    [0.21, -0.45],
  ],
  10: [
    [-0.21, 0.46],
    [0.21, 0.46],
    [-0.21, 0.23],
    [0.21, 0.23],
    [-0.21, 0],
    [0.21, 0],
    [-0.21, -0.23],
    [0.21, -0.23],
    [-0.21, -0.46],
    [0.21, -0.46],
  ],
};

function cardGeometry(rank, suit, tint = 1) {
  const bold = [];
  const fine = [];
  const glyph = SUITS[suit];

  poly(bold, rounded(1, 1.4, 0.1));
  poly(fine, rounded(0.9, 1.3, 0.07));

  poly(fine, place(glyph, 0.16, -0.34, 0.56));
  poly(fine, place(glyph, 0.16, 0.34, -0.56, true));

  if (rank === 1) {
    poly(fine, place(glyph, 0.62, 0, -0.02));
  } else if (rank > 10) {
    poly(fine, rounded(0.68, 1.02, 0.06));
    poly(fine, rounded(0.58, 0.9, 0.05));
    poly(fine, place(glyph, 0.4, 0, 0));
    poly(
      fine,
      [
        [-0.18, 0.3],
        [-0.18, 0.4],
        [-0.09, 0.34],
        [0, 0.43],
        [0.09, 0.34],
        [0.18, 0.4],
        [0.18, 0.3],
      ],
      false,
    );
  } else {
    for (const [x, y, big] of LAYOUT[rank]) {
      poly(fine, place(glyph, 0.27 * (big || 1), x, y, y < 0));
    }
  }

  const count = (bold.length + fine.length) / 2;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  let v = 0;

  for (let i = 0; i < bold.length; i += 2) {
    pos[v * 3] = bold[i];
    pos[v * 3 + 1] = bold[i + 1];
    col[v * 3] = BRIGHT * tint;
    col[v * 3 + 1] = BRIGHT * tint;
    col[v * 3 + 2] = BRIGHT * tint;
    v++;
  }
  for (let i = 0; i < fine.length; i += 2) {
    pos[v * 3] = fine[i];
    pos[v * 3 + 1] = fine[i + 1];
    col[v * 3] = DIM * tint;
    col[v * 3 + 1] = DIM * tint;
    col[v * 3 + 2] = DIM * tint;
    v++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

export function buildCardField({ count = 24, seed = 11 } = {}) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const group = new THREE.Group();
  const cards = [];
  const suits = "shdc";

  const hand = Math.min(6, Math.round(count * 0.18));

  for (let i = 0; i < count; i++) {
    const rank = i === 0 ? 13 : 1 + Math.floor(rnd() * 13);
    const suit = suits[i % 4];

    let base;
    if (i < hand) {
      const t = hand === 1 ? 0.5 : i / (hand - 1);
      const a = (t - 0.5) * 2.35;
      base = {
        x: Math.sin(a) * 2.5,
        y: Math.cos(a) * 0.55 - 0.55 + (rnd() - 0.5) * 0.06,
        z: 0.5 - i * 0.42,
        rx: (rnd() - 0.5) * 0.08,
        ry: (rnd() - 0.5) * 0.18,
        rz: -a * 0.85,
      };
    } else {
      const r = 2.3 + rnd() * 3.1;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      base = {
        x: r * Math.sin(ph) * Math.cos(th),
        y: r * Math.cos(ph) * 0.72,
        z: -0.9 - Math.abs(r * Math.sin(ph) * Math.sin(th)) * 0.85,
        rx: (rnd() - 0.5) * 0.55,
        ry: (rnd() - 0.5) * 0.9,
        rz: (rnd() - 0.5) * 0.75,
      };
    }

    const depth = Math.min(0.62, Math.max(0, -base.z) * 0.13);
    const tint = (0.62 + rnd() * 0.38) * (1.06 - depth);
    const line = new THREE.LineSegments(cardGeometry(rank, suit, tint), material);

    const scale = (i < hand ? 0.82 : 0.58) + rnd() * 0.24;
    line.position.set(base.x, base.y, base.z);
    line.rotation.set(base.rx, base.ry, base.rz);
    line.scale.setScalar(scale);

    group.add(line);
    cards.push({
      line,
      base,
      scale,
      phase: rnd() * 6.28,
      sway: 0.4 + rnd() * 0.9,
      fall: (i < hand ? 0.32 : 0.46) + rnd() * 0.5,
      drift: 0.05 + rnd() * 0.12,
      driftRate: 0.12 + rnd() * 0.24,
      spin: {
        x: (rnd() - 0.5) * 0.16,
        y: (rnd() - 0.5) * 0.2,
        z: (rnd() - 0.5) * 0.1,
      },
    });
  }

  let strength = 0.8;
  let bias = 0;

  const apply = () => {
    material.opacity = Math.min(1, 0.1 + 0.72 * strength);
    material.color.setScalar(1 + bias * 1.6);
  };
  apply();

  return {
    group,
    material,
    setStrength(v) {
      strength = v;
      apply();
      group.scale.setScalar(0.94 + v * 0.12);
    },
    setInvert(v) {
      bias = v;
      apply();
    },
    update(time) {
      group.rotation.y = Math.sin(time * 0.11) * 0.1;
      group.rotation.x = Math.sin(time * 0.09) * 0.04;

      const top = 6.6;
      const span = 12.4;

      for (const c of cards) {
        const w = c.sway;

        const fallen = ((top - c.base.y) + time * c.fall) % span;
        c.line.position.y = top - fallen;
        c.line.position.x = c.base.x + Math.sin(time * c.driftRate + c.phase) * c.drift;
        c.line.position.z = c.base.z + Math.sin(time * c.driftRate * 0.6 + c.phase) * 0.12;

        c.line.rotation.x = c.base.rx + time * c.spin.x + Math.sin(time * 0.24 * w + c.phase) * 0.07;
        c.line.rotation.y = c.base.ry + time * c.spin.y + Math.sin(time * 0.2 * w + c.phase * 1.3) * 0.08;
        c.line.rotation.z = c.base.rz + time * c.spin.z + Math.sin(time * 0.17 * w + c.phase * 0.7) * 0.05;
      }
    },
  };
}
