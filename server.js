const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Manifest base
const manifest = {
  id: "trailio-addon",
  version: "1.1.0",
  name: "Trailer",
  description: "Addon de Stremio para buscar trailers en TMDb con clave por usuario",
  types: ["movie", "series"],
  catalogs: [],
  resources: ["stream"],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: true,
    configurationRequired: true
  }
};

// Página de configuración
app.get('/configure', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Configurar Trailer</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        :root {
          color-scheme: dark;
          --bg: #050816;
          --panel: #111827;
          --accent: #22c55e;
          --border: #1f2937;
          --text: #e5e7eb;
          --muted: #9ca3af;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at top, #1f2937 0, #020617 55%);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
                       "Segoe UI", sans-serif;
          color: var(--text);
        }
        .card {
          width: 100%;
          max-width: 520px;
          background: linear-gradient(135deg, #0b1120, #020617);
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.25);
          box-shadow:
            0 18px 60px rgba(15,23,42,0.9),
            0 0 0 1px rgba(15,23,42,0.9);
          padding: 22px 22px 18px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: "";
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(circle at 0 0, rgba(45,212,191,0.14), transparent 55%),
            radial-gradient(circle at 100% 0, rgba(52,211,153,0.16), transparent 55%);
          opacity: .8;
          pointer-events: none;
        }
        .card-inner { position: relative; z-index: 1; }
        .logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .logo-dot {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 20%, #bbf7d0 0, #22c55e 45%, #14532d 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #022c22;
          font-weight: 700;
          font-size: 17px;
          box-shadow: 0 8px 20px rgba(34,197,94,0.55);
        }
        .logo-text { display: flex; flex-direction: column; }
        .logo-text span:first-child {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .18em;
          color: var(--muted);
        }
        .logo-text span:last-child {
          font-size: 21px;
          font-weight: 650;
        }
        h1 { margin: 6px 0 6px; font-size: 19px; }
        .subtitle {
          margin: 0 0 18px;
          font-size: 14px;
          color: var(--muted);
        }
        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
        }
        .badge {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .18em;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.5);
          color: var(--muted);
          background: rgba(15,23,42,0.9);
        }
        form { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        label {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        input, select {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(15,23,42,0.9);
          color: var(--text);
          padding: 9px 11px;
          font-size: 14px;
          outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }
        input::placeholder { color: #6b7280; }
        input:focus, select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px rgba(34,197,94,0.5);
          background: rgba(15,23,42,1);
        }
        .hint {
          font-size: 11px;
          color: var(--muted);
        }
        .hint a {
          color: #4ade80;
          text-decoration: none;
        }
        .hint a:hover {
          text-decoration: underline;
        }
        .button-row {
          margin-top: 4px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        button {
          border: none;
          border-radius: 999px;
          padding: 9px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: linear-gradient(135deg, #22c55e, #4ade80);
          color: #022c22;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 12px 30px rgba(22,163,74,0.55);
          transition: transform .12s ease-out, box-shadow .12s ease-out, filter .12s;
        }
        button:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 16px 40px rgba(22,163,74,0.7);
        }
        button:active {
          transform: translateY(0);
          box-shadow: 0 8px 22px rgba(22,163,74,0.6);
        }
        .button-icon { font-size: 16px; }
        .button-note {
          font-size: 11px;
          color: var(--muted);
        }
        .output {
          margin-top: 16px;
          padding: 10px 11px;
          border-radius: 12px;
          border: 1px dashed rgba(148,163,184,0.5);
          background: rgba(15,23,42,0.85);
          font-size: 12px;
          line-height: 1.45;
          color: var(--muted);
          word-break: break-all;
          display: none;
        }
        .output strong { color: var(--text); }
        .output-url {
          margin-top: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
                       "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          padding: 7px 8px;
          border-radius: 8px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(55,65,81,0.8);
          color: #e5e7eb;
        }
        @media (max-width: 480px) {
          .card { padding: 18px 16px 16px; }
          h1 { font-size: 17px; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-inner">
          <div class="logo-row">
            <div class="logo-dot">T</div>
            <div class="logo-text">
              <span>Stremio addon</span>
              <span>Trailer</span>
            </div>
          </div>

          <h1>Configura tu clave de TMDb</h1>
          <p class="subtitle">
            Cada usuario usa su propia API key. Solo se guarda en la URL que instalas en Stremio.
          </p>

          <div class="badge-row">
            <div class="badge">Paso 1 · Clave TMDb</div>
            <div class="badge">Paso 2 · Idioma</div>
            <div class="badge">Paso 3 · Instalar en Stremio</div>
          </div>

          <form onsubmit="return false;">
            <div class="field">
              <label for="tmdbKey">Clave TMDb (api_key)</label>
              <input
                id="tmdbKey"
                type="text"
                autocomplete="off"
                placeholder="Ejemplo: 1234567890abcdef1234567890abcdef"
              />
              <div class="hint">
                ¿Aún no tienes clave?
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">
                  Abre la página de API de TMDb
                </a>
                e inicia sesión para crear tu API key.
              </div>
            </div>

            <div class="field">
              <label for="lang">Idioma preferido</label>
              <select id="lang">
                <option value="">Por defecto (en-US)</option>
                <option value="es-ES">Español (es-ES)</option>
                <option value="en-US">English (en-US)</option>
                <option value="pt-BR">Português (pt-BR)</option>
                <option value="fr-FR">Français (fr-FR)</option>
                <option value="de-DE">Deutsch (de-DE)</option>
                <option value="it-IT">Italiano (it-IT)</option>
                <option value="ru-RU">Русский (ru-RU)</option>
                <option value="tr-TR">Türkçe (tr-TR)</option>
                <option value="pl-PL">Polski (pl-PL)</option>
                <option value="zh-CN">中文 (zh-CN)</option>
                <option value="ja-JP">日本語 (ja-JP)</option>
              </select>
              <div class="hint">
                Se usa para elegir el idioma del tráiler cuando sea posible.
              </div>
            </div>

            <div class="button-row">
              <button id="generate">
                <span class="button-icon">⚡️</span>
                <span>Generar URL para Stremio</span>
              </button>
              <span class="button-note">
                Luego pega la URL en Stremio → Add-ons → Add-on URL.
              </span>
            </div>
          </form>

          <div id="output" class="output">
            <strong>URL de instalación generada:</strong>
            <div id="outputUrl" class="output-url"></div>
          </div>
        </div>
      </div>

      <script>
        document.getElementById('generate').addEventListener('click', function () {
          const tmdbKey = document.getElementById('tmdbKey').value.trim();
          const lang = document.getElementById('lang').value;
          if (!tmdbKey) {
            alert('Por favor, introduce tu clave TMDb.');
            return;
          }
          const base = window.location.origin;
          const params = new URLSearchParams();
          params.set('tmdbKey', tmdbKey);
          if (lang) params.set('lang', lang);
          const url = base + '/manifest.json?' + params.toString();

          const out = document.getElementById('output');
          const outUrl = document.getElementById('outputUrl');
          out.style.display = 'block';
          outUrl.textContent = url;
        });
      </script>
    </body>
    </html>
  `);
});

// Manifest dinámico según si hay tmdbKey
app.get('/manifest.json', (req, res) => {
  const { tmdbKey } = req.query;
  const configured = !!tmdbKey;

  res.json({
    ...manifest,
    behaviorHints: {
      ...manifest.behaviorHints,
      configurationRequired: !configured
    }
  });
});

// Función auxiliar: obtener datos y tráiler de TMDb para un IMDb id
async function getTrailerFromTmdb({ imdbId, type, tmdbKey, lang }) {
  const language = lang || 'en-US';

  // limpiar id: tt1234567 o tt1234567:1:1 -> tt1234567
  const cleanId = imdbId.split(':')[0];

  const findUrl =
    `https://api.themoviedb.org/3/find/${encodeURIComponent(cleanId)}` +
    `?api_key=${encodeURIComponent(tmdbKey)}` +
    `&language=${encodeURIComponent(language)}` +
    `&external_source=imdb_id`;

  const findRes = await fetch(findUrl);
  if (!findRes.ok) throw new Error('TMDb find error');
  const findJson = await findRes.json();

  let tmdbId = null;
  let name = null;
  let year = null;

  if (type === 'movie' && findJson.movie_results && findJson.movie_results.length) {
    const m = findJson.movie_results[0];
    tmdbId = m.id;
    name = m.title || m.original_title;
    year = (m.release_date || '').slice(0, 4);
  } else if (type === 'series' && findJson.tv_results && findJson.tv_results.length) {
    const s = findJson.tv_results[0];
    tmdbId = s.id;
    name = s.name || s.original_name;
    year = (s.first_air_date || '').slice(0, 4);
  }

  if (!tmdbId) return null;

  const kind = type === 'series' ? 'tv' : 'movie';
  const videosUrl =
    `https://api.themoviedb.org/3/${kind}/${tmdbId}/videos` +
    `?api_key=${encodeURIComponent(tmdbKey)}` +
    `&language=${encodeURIComponent(language)}`;

  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) throw new Error('TMDb videos error');
  const videosJson = await videosRes.json();

  if (!videosJson.results || !videosJson.results.length) return null;

  const trailer =
    videosJson.results.find(
      v =>
        v.site === 'YouTube' &&
        (v.type === 'Trailer' || v.type === 'Teaser')
    ) || videosJson.results.find(v => v.site === 'YouTube') || videosJson.results[0];

  if (!trailer || trailer.site !== 'YouTube' || !trailer.key) return null;

  return {
    ytId: trailer.key,
    name,
    year
  };
}

// /stream usando la clave TMDb y devolviendo ytId con título traducido
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const { tmdbKey, lang } = req.query;

  if (!tmdbKey) {
    return res.json({ streams: [] });
  }

  try {
    const data = await getTrailerFromTmdb({
      imdbId: id,
      type,
      tmdbKey,
      lang
    });

    if (!data) {
      return res.json({ streams: [] });
    }

    const { ytId, name, year } = data;

    const l = (lang || 'en-US').toLowerCase();

    let prefix;
    if (l.startsWith('es')) {
      prefix = 'Ver tráiler de';
    } else if (l.startsWith('pt')) {
      prefix = 'Ver trailer de';
    } else if (l.startsWith('fr')) {
      prefix = 'Voir la bande-annonce de';
    } else if (l.startsWith('de')) {
      prefix = 'Trailer ansehen von';
    } else if (l.startsWith('it')) {
      prefix = 'Guarda il trailer di';
    } else if (l.startsWith('ru')) {
      prefix = 'Смотреть трейлер';
    } else if (l.startsWith('tr')) {
      prefix = 'Fragmanı izle';
    } else if (l.startsWith('pl')) {
      prefix = 'Zobacz zwiastun';
    } else if (l.startsWith('zh')) {
      prefix = '观看预告片';
    } else if (l.startsWith('ja')) {
      prefix = '予告編を見る';
    } else {
      prefix = 'Play trailer for';
    }

    const mainTitle = name ? `${name}${year ? ' (' + year + ')' : ''}` : '';
    const streamTitle = mainTitle ? `${prefix} ${mainTitle}` : prefix;

    res.json({
      streams: [
        {
          title: streamTitle,
          ytId: ytId
        }
      ]
    });
  } catch (e) {
    console.error('Error TMDb', e);
    res.json({ streams: [] });
  }
});

// Raíz
app.get('/', (req, res) => {
  res.send('Addon Trailer funcionando. Usa /manifest.json o /configure.');
});

app.listen(PORT, () => {
  console.log('Trailer addon running on port ' + PORT);
});
