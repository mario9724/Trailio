const express = require('express');
const axios = require('axios');
const app = express();

const TMDB_API_KEY = 'TU_API_KEY_TMDB_AQUI'; // gratis en themoviedb.org

// Idioma que uses en Stremio/TMDb, por ejemplo 'es-ES' o 'en-US'
const TMDB_LANGUAGE = 'es-ES';

app.get('/manifest.json', (req, res) => {
  res.sendFile('manifest.json', { root: __dirname });
});

app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params; // type 'movie', id 'tmdb:12345'
  console.log('Petición Trailio:', type, id);

  if (type !== 'movie') {
    return res.json({ streams: [] });
  }

  const tmdbId = id.replace('tmdb:', '');

  try {
    // 1) Intentar tráiler en el idioma configurado
    let trailer = await getTrailerFromTmdb(tmdbId, TMDB_LANGUAGE);
    // 2) Si no hay, caer a inglés
    if (!trailer) {
      trailer = await getTrailerFromTmdb(tmdbId, 'en-US');
    }

    if (!trailer) {
      return res.json({ streams: [] });
    }

    const youtubeKey = trailer.key; // clave de YouTube que da TMDb
    const title = trailer.name || 'Trailer';

    return res.json({
      streams: [
        {
          title: `Tráiler: ${title}`,
          url: `https://www.youtube.com/watch?v=${youtubeKey}`,
          behaviorHints: { notWebReady: true }
        }
      ]
    });
  } catch (e) {
    console.error('Error Trailio:', e.message);
    return res.json({ streams: [] });
  }
});

async function getTrailerFromTmdb(tmdbId, language) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/videos`;
  const { data } = await axios.get(url, {
    params: { api_key: TMDB_API_KEY, language }
  });

  if (!data.results || !data.results.length) return null;

  // Filtrar solo tráilers de YouTube
  const trailers = data.results.filter(
    v => v.site === 'YouTube' && v.type === 'Trailer'
  );

  return trailers[0] || null;
}

app.listen(3000, () =>
  console.log('Trailio (TMDb) listo en http://localhost:3000')
);
