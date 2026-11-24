export function defaultAvatar(id) {
  let n = 0;
  try {
    n = Number((BigInt(id) >> 22n) % 6n);
  } catch {
    n = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${n}.png`;
}

const store = new Map();

export function getPresence(id) {
  return store.get(id) || null;
}

const BLOCKED = /nigg|fagg|retard|\bkys\b|hitler/i;

function cleanName(raw) {
  const name = String(raw || "").trim();
  if (!name || name.length > 22) return null;
  if (/^deleted_user_/i.test(name)) return null;
  if (!/[a-z0-9]/i.test(name)) return null;
  if (BLOCKED.test(name)) return null;
  return name;
}

function activityArt(activity) {
  const asset = activity?.assets?.large_image || activity?.assets?.small_image;
  const app = activity?.application_id;

  if (asset) {
    if (/^mp:external\//.test(asset)) {
      return `https://media.discordapp.net/${asset.replace("mp:", "")}`;
    }
    if (asset.startsWith("spotify:")) {
      return `https://i.scdn.co/image/${asset.slice(8)}`;
    }
    if (app) return `https://cdn.discordapp.com/app-assets/${app}/${asset}.png`;
  }

  if (app) return `https://dcdn.dstn.to/app-icons/${app}`;

  return null;
}

function shapeActivities(data) {
  const list = Array.isArray(data.activities) ? data.activities : [];
  const acts = [];

  if (data.listening_to_spotify && data.spotify) {
    const s = data.spotify;
    acts.push({
      kind: "spotify",
      title: s.song || "listening",
      sub: s.artist || "",
      art: s.album_art_url || null,
      start: s.timestamps?.start || null,
      end: s.timestamps?.end || null,
    });
  }

  for (const a of list) {
    if (a.type === 4) continue;
    if (acts.length && /^spotify$/i.test(a.name || "")) continue;
    acts.push({
      kind: a.type === 1 || a.type === 3 ? "watching" : a.type === 2 ? "listening" : "playing",
      title: a.name || "something",
      sub: [a.details, a.state].filter(Boolean).join(" · "),
      art: activityArt(a),
      start: a.timestamps?.start || null,
    });
  }

  return acts;
}

function record(id, { img, name, user, status, data, live }) {
  const custom = (data?.activities || []).find((a) => a.type === 4 && (a.state || a.emoji?.name)) || null;
  return {
    id,
    img: img || defaultAvatar(id),
    name: name || null,
    user: user || null,
    status: status || "offline",
    live: Boolean(live),
    custom: custom
      ? {
          text: custom.state || "",
          emoji: custom.emoji
            ? {
                name: custom.emoji.name || "",
                url: custom.emoji.id
                  ? `https://cdn.discordapp.com/emojis/${custom.emoji.id}.${
                      custom.emoji.animated ? "gif" : "png"
                    }?size=32`
                  : null,
              }
            : null,
        }
      : null,
    activities: data ? shapeActivities(data) : [],
  };
}

async function identity(id) {
  try {
    const res = await fetch(`https://japi.rest/discord/v1/user/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.data || {};
    return {
      name: cleanName(d.global_name || d.username),
      user: d.username || null,
      img: d.avatar
        ? `https://cdn.discordapp.com/avatars/${id}/${d.avatar}.png?size=256`
        : defaultAvatar(id),
    };
  } catch {
    return null;
  }
}

export function watchPresence(members, onUpdate) {
  let stopped = false;

  const publish = (id, rec) => {
    store.set(id, rec);
    onUpdate(id, rec);
  };

  async function one(member) {
    if (!member.id) return;
    try {
      const res = await fetch(`https://api.lanyard.rest/v1/users/${member.id}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!json.success) {
        const alt = await identity(member.id);
        publish(
          member.id,
          record(member.id, { ...(alt || {}), data: null, status: "offline", live: false }),
        );
        return;
      }

      const data = json.data;
      const user = data.discord_user || {};
      publish(
        member.id,
        record(member.id, {
          img: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
            : defaultAvatar(member.id),
          name: cleanName(user.global_name || user.username),
          user: user.username || null,
          status: data.discord_status || "offline",
          data,
          live: true,
        }),
      );
    } catch {
      const alt = await identity(member.id);
      publish(
        member.id,
        record(member.id, { ...(alt || {}), data: null, status: "offline", live: false }),
      );
    }
  }

  function sweep() {
    if (stopped) return;
    Promise.all(members.map(one));
  }

  sweep();
  const timer = setInterval(sweep, 30000);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
