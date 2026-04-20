#!/usr/bin/env node
/**
 * Refresh live.json with data pulled from upstream APIs:
 *   - GitHub REST v3 for curated repo metadata
 *   - OpenAlex for top-cited publications by ORCID
 *   - Substack for top (most-loved) blog posts
 *
 * Driven by data.json. Writes a single live.json at the repo root.
 * Intended cadence: daily via GitHub Actions (see
 * .github/workflows/refresh-live-data.yml). Can also be run manually:
 *   node scripts/refresh-live-data.js
 *
 * Requires Node 18+ (global fetch).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const OUT = path.join(ROOT, 'live.json');

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

// ---- repos --------------------------------------------------------------

function shapeRepo(r) {
  return {
    desc:  r.description || '',
    lang:  r.language || '',
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
  };
}

async function fetchRepos() {
  const curated = (DATA.projects && DATA.projects.curated) || [];
  const byOwner = new Map();
  for (const c of curated) {
    if (!byOwner.has(c.owner)) byOwner.set(c.owner, new Set());
    byOwner.get(c.owner).add(c.name);
  }
  const out = {};
  await Promise.all([...byOwner.entries()].map(async ([owner, names]) => {
    const nameList = [...names];
    try {
      if (nameList.length >= 2) {
        const arr = await fetchJSON(`https://api.github.com/users/${owner}/repos?per_page=100`);
        for (const r of arr) if (names.has(r.name)) out[`${owner}/${r.name}`] = shapeRepo(r);
      } else {
        const r = await fetchJSON(`https://api.github.com/repos/${owner}/${nameList[0]}`);
        out[`${owner}/${r.name}`] = shapeRepo(r);
      }
    } catch (e) {
      console.warn(`repos/${owner} failed: ${e.message}`);
    }
  }));
  return out;
}

// ---- publications (OpenAlex) -------------------------------------------

function shapeWork(w) {
  const authors = (w.authorships || [])
    .map(a => a.author && a.author.display_name)
    .filter(Boolean);
  const venue = (w.primary_location && w.primary_location.source)
    ? w.primary_location.source.display_name : '';
  const url = w.doi
    ? ('https://doi.org/' + String(w.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, ''))
    : (w.id || '');
  return {
    title: w.title || w.display_name || '(untitled)',
    year: w.publication_year || null,
    citations: w.cited_by_count || 0,
    authors,
    venue,
    type: (w.type || '').replace(/-/g, ' '),
    url,
  };
}

async function fetchPublications() {
  const p = DATA.publications || {};
  if (!p.orcid) return [];
  const limit = p.limit || 20;
  const mailto = p.contactEmail ? `&mailto=${encodeURIComponent(p.contactEmail)}` : '';
  try {
    const j = await fetchJSON(
      `https://api.openalex.org/works?filter=author.orcid:${p.orcid}&sort=cited_by_count:desc&per-page=${limit}${mailto}`
    );
    return (j.results || []).map(shapeWork);
  } catch (e) {
    console.warn(`publications failed: ${e.message}`);
    return [];
  }
}

// ---- writing (Substack) ------------------------------------------------

function shapePost(p) {
  return {
    title: p.title || '(untitled)',
    subtitle: p.subtitle || '',
    url: p.canonical_url || '',
    date: p.post_date || '',
    reactions: p.reaction_count || 0,
    wordcount: p.wordcount || 0,
  };
}

async function fetchWriting() {
  const w = DATA.writing || {};
  const base = w.blogUrl || 'https://blog.apiad.net';
  const limit = w.limit || 10;
  const sort = w.sort || 'top';
  try {
    const arr = await fetchJSON(`${base}/api/v1/archive?sort=${sort}&limit=${limit}`);
    return (Array.isArray(arr) ? arr : []).map(shapePost);
  } catch (e) {
    console.warn(`writing failed: ${e.message}`);
    return [];
  }
}

// ---- main --------------------------------------------------------------

async function main() {
  const started = Date.now();
  console.log('refreshing live.json ...');
  const [repos, publications, writing] = await Promise.all([
    fetchRepos(), fetchPublications(), fetchWriting(),
  ]);
  const out = {
    generated_at: new Date().toISOString(),
    repos,
    publications,
    writing,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  const ms = Date.now() - started;
  console.log(`wrote live.json in ${ms}ms: ${Object.keys(repos).length} repos, ${publications.length} publications, ${writing.length} posts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
