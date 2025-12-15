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
    const
