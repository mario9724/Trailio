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

// Convertir IMDb ID -> TMDb ID
async function imdbToTmdbId(imdbId) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}`;
    const { data } = await axios.get(url, {
      params: {
        api_key: TMDB_API_KEY,
        external_source: 'imdb_id',
        language: TMDB_LANGUAGE
      }
    });

    if (data.movie_results && data.movie_results.length > 0) {
      return data.movie_results[0].id;
    }
    if (data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id;
    }

    console.warn('TMDb no encontró nada para IMDb ID:', imdbId);
    return null;
  } catch (err) {
    console.error('Error imdbToTmdbId:', err.message);
    return null;
  }
}

// Obtener tráiler de TMDb (YouTube)
async function getTrailerFromTmdb(tmdbId, language) {
  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}/videos`;
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

// Manifest del addon
const manifest = {
  id: 'org.trailio.trailers',
  version: '1.0.0',
  name: 'Trailio Trailers',
  description: 'Trailers de YouTube usando TMDb',
  types: ['movie'],
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

  if (type !== 'movie') {
    return res.json({ streams: [] });
  }

  let tmdbId = null;

  if (id.startsWith('tmdb:')) {
    tmdbId = id.replace('tmdb:', '');
  } else if (id.startsWith('tt')) {
    tmdbId = await imdbToTmdbId(id);
  } else {
    return res.json({ streams: [] });
  }

  if (!tmdbId) {
    return res.json({ streams: [] });
  }

  try {
    let trailer = await getTrailerFromTmdb(tmdbId, TMDB_LANGUAGE);
    if (!trailer) {
      trailer = await getTrailerFromTmdb(tmdbId, 'en-US');
    }

    if (!trailer) {
      console.log('Sin tráiler para TMDb ID:', tmdbId);
      return res.json({ streams: [] });
    }

    const youtubeKey = trailer.key;
    const title = trailer.name || 'Trailer';

    console.log('Stream Trailio:', youtubeKey, title);

    return res.json({
      streams: [
        {
          title: `Tráiler: ${title}`,
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
