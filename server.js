const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración TMDb
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'es-ES';

app.use(cors());
app.use(express.json());

// Convertir IMDb ID -> TMDb ID (movie o tv)
async function imdbToTmdbId(imdbId, type) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}`;
    const { data } = await axios.get(url, {
      params: {
        api_key: TMDB_API_KEY,
        external_source: 'imdb_id',
        language: TMDB_LANGUAGE
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
async function getTrailerFromTmdb(tmdbId, type, language) {
  try {
    const basePath = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${basePath}/${tmdbId}/videos`;
    const { data } = await axios.get(url, {
      params: {
        api_key: TMDB_API_KEY,
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
async function getTitleAndYearFromTmdb(tmdbId, type) {
  try {
    const basePath = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${basePath}/${tmdbId}`;
    const { data } = await axios.get(url, {
      params: {
        api_key: TMDB_API_KEY,
        language: TMDB_LANGUAGE
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

// Manifest del addon
const manifest = {
  id: 'org.trailio.trailers',
  version: '1.1.1',
  name: 'Trailio Trailers',
  description: 'Tráilers de YouTube usando TMDb (películas y series)',
  types: ['movie', 'series'],
  catalogs: [],
  resources: ['stream'],
  idPrefixes: ['tt', 'tmdb:']
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

  // Limpiar IDs tipo tt22202452:1:1 -> tt22202452
  let cleanId = id;
  if (cleanId.startsWith('tt')) {
    cleanId = cleanId.split(':')[0];
  }

  let tmdbId = null;

  if (cleanId.startsWith('tmdb:')) {
    tmdbId = cleanId.replace('tmdb:', '');
  } else if (cleanId.startsWith('tt')) {
    tmdbId = await imdbToTmdbId(cleanId, type);
  } else {
    return res.json({ streams: [] });
  }

  if (!tmdbId) {
    return res.json({ streams: [] });
  }

  try {
    // Detalles para “Nombre (año)”
    const displayName = await getTitleAndYearFromTmdb(tmdbId, type);

    // Tráiler (idioma preferido + fallback EN)
    let trailer = await getTrailerFromTmdb(tmdbId, type, TMDB_LANGUAGE);
    if (!trailer) {
      trailer = await getTrailerFromTmdb(tmdbId, type, 'en-US');
    }

    if (!trailer) {
      console.log('Sin tráiler para TMDb ID:', tmdbId, 'type:', type);
      return res.json({ streams: [] });
    }

    const youtubeKey = trailer.key;
    let title = trailer.name || 'Trailer';
    title = title.replace(/\[.*?\]/g, '').trim(); // limpia [Subtitled], [HD], etc.

    console.log('Stream Trailio:', youtubeKey, title, '=>', displayName);

    return res.json({
      streams: [
        {
          name: 'Ver tráiler',
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

// Salud
app.get('/', (req, res) => {
  res.send('Trailio addon activo');
});

app.listen(PORT, () => {
  console.log(`Trailio escuchando en puerto ${PORT}`);
});
