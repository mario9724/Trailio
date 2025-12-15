const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Valores por defecto (opcionales)
const DEFAULT_TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const DEFAULT_TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'es-ES';

app.use(cors());
app.use(express.json());

// Convertir IMDb ID -> TMDb ID (movie o tv)
async function imdbToTmdbId(imdbId, type, apiKey, language) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}`;
    const { data } = await axios.get(url, {
      params: {
        api_key: apiKey,
        external_source: 'imdb_id',
        language
      }
    });

    if (type === 'movie') {
      if (data.movie_results && data.movie_results.length > 0) {
        return data.movie_results[0].id;
      }
    } else if (type === 'series') {
      if (data.tv_results && data.tv_results.length > 0) {
        return data.tv_results[0].id;
      }
    }

    console.warn('TMDb no encontró nada para IMDb ID:', imdbId, 'type:', type);
    return null;
  } catch (err) {
    console.error('Error imdbToTmdbId:', err.message);
    return null;
  }
}

// Obtener tráiler (movie o tv) desde TMDb
async function getTrailerFromTmdb(tmdbId, type, apiKey, language) {
  try {
    const basePath = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${basePath}/${tmdbId}/videos`;
    const { data } = await axios.get(url, {
      params: {
        api_key: apiKey,
        language
      }
    });

    if (!data.results || !data.results.length) return null;

    const officialTrailer = data.results.find(
      v =>
        v.site === 'YouTube' &&
        v.type === 'Trailer' &&
        (v.official || v.name.toLowerCase().includes('trailer'))
    );

    return officialTrailer || data.results.find(v => v.site === 'YouTube') || null;
  } catch (err) {
    console.error('Error getTrailerFromTmdb:', err.message);
    return null;
  }
}

// Obtener detalles (nombre + año) desde TMDb
async function getTitleAndYearFromTmdb(tmdbId, type, apiKey, language) {
  try {
    const basePath = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${basePath}/${tmdbId}`;
    const { data } = await axios.get(url, {
      params: {
        api_key: apiKey,
        language
      }
    });

    const name =
      type === 'series'
        ? data.name || data.original_name
        : data.title || data.original_title;

    const date =
      (type === 'series' ? data.first_air_date : data.release_date) || '';
    const year = date ? date.slice(0, 4) : '';

    const displayName = year ? `${name} (${year})` : name;
    return displayName || null;
  } catch (err) {
    console.error('Error getTitleAndYearFromTmdb:', err.message);
    return null;
  }
}

// Manifest del addon (con config de usuario)
const manifest = {
  id: 'org.trailio.trailers',
  version: '1.5.0',
  name: 'Trailio Trailers',
  description: 'Tráilers de YouTube usando TMDb (películas y series)',
  types: ['movie', 'series'],
  catalogs: [],
  resources: ['stream'],
  idPrefixes: ['tt', 'tmdb:'],
  behaviorHints: {
    configurable: true,
    configurationRequired: true
  },
  config: [
    {
      key: 'tmdbApiKey',
      title: 'TMDb API Key',
      type: 'text',
      required: true
    },
    {
      key: 'language',
      title: 'Idioma TMDb (ej. es-ES, en-US)',
      type: 'text',
      required: false
    }
  ]
};

// Manifest
app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

// Streams
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  console.log('Petición Trailio:', type, id);

  if (type !== 'movie' && type !== 'series') {
    return res.json({ streams: [] });
  }

  // Leer config del usuario (si Stremio la envía como query)
  const userTmdbKey = (req.query.tmdbApiKey || '').trim();
  const userLang = (req.query.language || '').trim();

  const tmdbKeyToUse = userTmdbKey || DEFAULT_TMDB_API_KEY;
  const langToUse = userLang || DEFAULT_TMDB_LANGUAGE;

  if (!tmdbKeyToUse) {
    console.log('Sin TMDb API key configurada (usuario ni servidor)');
    return res.json({ streams: [] });
  }

  // Siempre limpiar: tt22202452:1:1 -> tt22202452
  let cleanId = id;
  if (cleanId.startsWith('tt')) {
    cleanId = cleanId.split(':')[0];
  }

  let tmdbId = null;

  if (cleanId.startsWith('tmdb:')) {
    tmdbId = cleanId.replace('tmdb:', '');
  } else if (cleanId.startsWith('tt')) {
    tmdbId = await imdbToTmdbId(cleanId, type, tmdbKeyToUse, langToUse);
  } else {
    return res.json({ streams: [] });
  }

  if (!tmdbId) {
    return res.json({ streams: [] });
  }

  try {
    // Detalles para “Nombre (año)”
    const displayName = await getTitleAndYearFromTmdb(
      tmdbId,
      type,
      tmdbKeyToUse,
      langToUse
    );

    // Tráiler (idioma preferido + fallback EN)
    let trailer = await getTrailerFromTmdb(tmdbId, type, tmdbKeyToUse, langToUse);
    if (!trailer) {
      trailer = await getTrailerFromTmdb(tmdbId, type, tmdbKeyToUse, 'en-US');
    }

    if (!trailer) {
      console.log('Sin tráiler para TMDb ID:', tmdbId, 'type:', type);
      return res.json({ streams: [] });
    }

    // Texto del botón según idioma configurado
    let playLabel = 'Play trailer';
    if (langToUse.startsWith('es')) playLabel = 'Ver tráiler';
    else if (langToUse.startsWith('pt')) playLabel = 'Ver trailer';
    else if (langToUse.startsWith('fr')) playLabel = 'Voir la bande-annonce';

    const youtubeKey = trailer.key;
    let title = trailer.name || 'Trailer';
    title = title.replace(/\[.*?\]/g, '').trim();

    console.log('Stream Trailio:', youtubeKey, title, '=>', displayName);

    return res.json({
      streams: [
        {
          name: playLabel,
          description: displayName || title,
          ytId: youtubeKey
        }
      ]
    });
  } catch (err) {
    console.error('Error Trailio /stream:', err.message);
    return res.json({ streams: [] });
  }
});
app.get('/configure', (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Configurar Trailio</title>
      </head>
      <body>
        <h1>Configurar Trailio</h1>
        <p>1. Crea una cuenta en TMDb y consigue tu API key (v3 auth).</p>
        <p>2. En Stremio, cuando instales el addon, introduce esta clave en el campo <strong>TMDb API Key</strong>.</p>
        <p>Si ves esta página dentro de Stremio, simplemente vuelve atrás: la configuración real se hace en la pantalla de Stremio, no aquí.</p>
      </body>
    </html>
  `);
});

// Web sencilla de instalación / info (opcional)
app.get('/', (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Trailio Trailers</title>
      </head>
      <body>
        <h1>Trailio Trailers</h1>
        <p>Addon de Stremio para ver tráilers de películas y series usando TMDb.</p>
        <p>URL de instalación (manifiesto):</p>
        <pre>https://trailio.onrender.com/manifest.json</pre>
        <button onclick="copy()">Copiar URL</button>
        <script>
          function copy() {
            navigator.clipboard.writeText('https://trailio.onrender.com/manifest.json');
            alert('Copiado. Pega la URL en Stremio → Add-ons → Add-on URL.');
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Trailio escuchando en puerto ${PORT}`);
});
