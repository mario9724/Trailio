const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Manifest base
const manifest = {
  id: "trailio-addon",
  version: "1.0.0",
  name: "Trailio",
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
      <title>Configurar Trailio</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 40px auto; }
        label { display: block; margin-top: 12px; }
        input, select { width: 100%; padding: 8px; margin-top: 4px; }
        button { margin-top: 16px; padding: 10px 16px; cursor: pointer; }
        .result { margin-top: 20px; padding: 10px; border: 1px solid #ccc; word-break: break-all; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>Configurar Trailio</h1>
      <p>Introduce tu clave de TMDb y genera la URL para instalar el add-on en Stremio.</p>

      <label>
        Clave TMDb (api_key):
        <input type="text" id="tmdbKey" placeholder="p.ej. 1234567890abcdef1234567890abcdef" />
      </label>

      <label>
        Idioma (opcional):
        <select id="lang">
          <option value="">Por defecto (en-US)</option>
          <option value="es-ES">es-ES</option>
          <option value="en-US">en-US</option>
          <option value="pt-BR">pt-BR</option>
        </select>
      </label>

      <button id="generate">Generar URL para Stremio</button>

      <div id="output" class="result" style="display:none;"></div>

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
          out.style.display = 'block';
          out.textContent =
            url +
            '\\n\\nCopia esta URL y pégala en Stremio → Add-ons → Add-on URL.';
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

// Función auxiliar: obtener tráiler de TMDb para un IMDb id
async function getTrailerFromTmdb({ imdbId, type, tmdbKey, lang }) {
  const language = lang || 'en-US';

  // 1) Buscar el título en TMDb a partir del IMDb ID
  const findUrl = `https://api.themoviedb.org/3/find/${encodeURIComponent(
    imdbId
  )}?api_key=${encodeURIComponent(tmdbKey)}&language=${encodeURIComponent(
    language
  )}&external_source=imdb_id`;

  const findRes = await fetch(findUrl);
  if (!findRes.ok) throw new Error('TMDb find error');
  const findJson = await findRes.json();

  let tmdbId = null;
  if (type === 'movie' && findJson.movie_results && findJson.movie_results.length) {
    tmdbId = findJson.movie_results[0].id;
  } else if (type === 'series' && findJson.tv_results && findJson.tv_results.length) {
    tmdbId = findJson.tv_results[0].id;
  }

  if (!tmdbId) return null;

  // 2) Obtener vídeos (trailers) del título encontrado
  const kind = type === 'series' ? 'tv' : 'movie';
  const videosUrl = `https://api.themoviedb.org/3/${kind}/${tmdbId}/videos?api_key=${encodeURIComponent(
    tmdbKey
  )}&language=${encodeURIComponent(language)}`;

  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) throw new Error('TMDb videos error');
  const videosJson = await videosRes.json();

  if (!videosJson.results || !videosJson.results.length) return null;

  // Priorizar trailers de YouTube
  const trailer =
    videosJson.results.find(
      v =>
        v.site === 'YouTube' &&
        (v.type === 'Trailer' || v.type === 'Teaser')
    ) || videosJson.results[0];

  if (!trailer || trailer.site !== 'YouTube' || !trailer.key) return null;

  const youtubeUrl = `https://www.youtube.com/watch?v=${trailer.key}`;

  return {
    title: trailer.name || 'Trailer',
    externalUrl: youtubeUrl
  };
}

// /stream usando la clave TMDb y devolviendo el tráiler
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params; // type: movie|series, id: tt1234567
  const { tmdbKey, lang } = req.query;

  if (!tmdbKey) {
    return res.json({ streams: [] });
  }

  try {
    const trailer = await getTrailerFromTmdb({
      imdbId: id,
      type,
      tmdbKey,
      lang
    });

    if (!trailer) {
      return res.json({ streams: [] });
    }

    res.json({
      streams: [
        {
          title: trailer.title,
          externalUrl: trailer.externalUrl
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
  res.send('Trailio addon funcionando. Usa /manifest.json o /configure.');
});

app.listen(PORT, () => {
  console.log('Trailio addon running on port ' + PORT);
});
