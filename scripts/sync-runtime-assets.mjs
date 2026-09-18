#!/usr/bin/env node
// Copia por allowlist explícita el subconjunto de `assets/` que necesita el
// primer hito visual (T-001-02) hacia `app/public/assets/`, carpeta generada
// que Vite sirve bajo `/assets/...` en dev y en el build (ver .gitignore).
//
// No copia nada fuera de esta lista a propósito: Luna, Clara, Beto y los
// lotes históricos (`mascot/v001..v004`, `npc/v001` salvo el poster de Tomi)
// quedan fuera (PLAN-001 "Assets runtime del primer hito", AGENTS.md).
//
// Uso: node scripts/sync-runtime-assets.mjs   (desde la raíz del repo)
//
// Reglas que hace cumplir:
// - Falla con código 1 y mensaje legible si falta un archivo de la allowlist.
// - Falla si el sha256 de los GLB de Capi o Tomi no coincide con el que
//   registra `assets/production/animated/v001/manifest.json`: esa es la
//   señal de que el arte cambió sin publicar una nueva versión.
// - Es idempotente: si el destino ya coincide en tamaño y hash, no recopia.
// - Borra del destino cualquier archivo que ya no esté en la allowlist para
//   que el build nunca sirva un sobrante de una corrida anterior.

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST_ROOT = join(ROOT, "app", "public", "assets");

// Presupuesto de bytes del subconjunto que se sirve al aula (Constitución VI:
// «un solo dispositivo proyectado, sin instalar nada, con poco ancho de banda y
// con el hardware que la escuela ya tiene»). Hoy la allowlist ocupa 23,91 MiB, y
// el GLB de Capi es el 65 % de eso. El presupuesto deja poco margen a propósito:
// pasarse debe ser una decisión consciente, no un descuido que se descubre en el
// aula. Medido, no estimado: lo calcula este mismo script en cada corrida.
const PRESUPUESTO_BYTES = 25 * 1024 * 1024;

const ANIMATED_MANIFEST_REL = "assets/production/animated/v001/manifest.json";
const ANIMATED_MANIFEST_PATH = join(ROOT, ANIMATED_MANIFEST_REL);

// Mundo mínimo del primer hito (PLAN-001): isla, sendero, agua, puente recto,
// banco, árbol, palmera, nube y faro.
const WORLD_IDS = [
  "island_large",
  "path_straight",
  "water_tile",
  "bridge_straight",
  "bench",
  "tree_round",
  "palm",
  "cloud",
  "lighthouse",
];

// Props mínimos del primer hito (PLAN-001): brújula, burbuja, tarjetas,
// pausa y sonido.
const PROP_IDS = [
  "compass",
  "speech_bubble",
  "card_sun",
  "card_leaf",
  "card_cloud",
  "pause_button",
  "sound_button",
];

/**
 * @typedef {Object} AssetEntry
 * @property {string} id identificador legible para mensajes de error.
 * @property {string} src ruta relativa a la raíz del repo.
 * @property {string} dest ruta relativa a `app/public/assets`.
 * @property {string} [manifestCharacterId] si está definido, se verifica el
 *   sha256 del archivo contra `assets/production/animated/v001/manifest.json`.
 */

/** @returns {AssetEntry[]} */
function buildAllowlist() {
  const entries = [
    // Personajes precargados en este hito: solo Capi y Tomi. Luna, Clara y
    // Beto quedan fuera a propósito (no se copian, no están en esta lista).
    {
      id: "capi-modelo",
      src: "assets/production/animated/v001/mascot/mascot.glb",
      dest: "characters/capi/mascot.glb",
      manifestCharacterId: "mascot",
    },
    {
      id: "capi-poster",
      src: "assets/production/mascot/v005/three-quarter.png",
      dest: "characters/capi/poster.png",
    },
    {
      id: "tomi-modelo",
      src: "assets/production/animated/v001/child_explorer/child_explorer.glb",
      dest: "characters/tomi/child_explorer.glb",
      manifestCharacterId: "child_explorer",
    },
    {
      id: "tomi-poster",
      src: "assets/production/npc/v001/child_explorer/three-quarter.png",
      dest: "characters/tomi/poster.png",
    },
  ];

  for (const id of WORLD_IDS) {
    entries.push({
      id: `mundo-${id}`,
      src: `assets/production/world/v001/${id}/${id}.glb`,
      dest: `world/${id}/${id}.glb`,
    });
  }

  for (const id of PROP_IDS) {
    entries.push({
      id: `prop-${id}`,
      src: `assets/production/props/v001/${id}/${id}.glb`,
      dest: `props/${id}/${id}.glb`,
    });
  }

  return entries;
}

function fail(message) {
  console.error(`sync-runtime-assets — ${message}`);
  process.exit(1);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readManifest() {
  if (!existsSync(ANIMATED_MANIFEST_PATH)) {
    fail(`falta el manifiesto de personajes animados: ${ANIMATED_MANIFEST_REL}`);
    return { characters: [] };
  }
  try {
    return JSON.parse(readFileSync(ANIMATED_MANIFEST_PATH, "utf8"));
  } catch (err) {
    fail(`el manifiesto ${ANIMATED_MANIFEST_REL} no es JSON válido: ${err.message}`);
    return { characters: [] };
  }
}

function expectedHashFor(manifest, characterId) {
  const entry = (manifest.characters ?? []).find((c) => c.id === characterId);
  if (!entry || typeof entry.sha256 !== "string") {
    fail(
      `el manifiesto ${ANIMATED_MANIFEST_REL} no registra un sha256 para "${characterId}".`,
    );
    return "";
  }
  return entry.sha256;
}

function pruneStale(destRoot, keepRelPaths) {
  if (!existsSync(destRoot)) return 0;
  let removedFiles = 0;

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        if (readdirSync(full).length === 0) {
          rmSync(full, { recursive: true });
        }
        continue;
      }
      const rel = relative(destRoot, full).split(sep).join("/");
      if (!keepRelPaths.has(rel)) {
        rmSync(full);
        removedFiles += 1;
      }
    }
  }

  walk(destRoot);
  return removedFiles;
}

function main() {
  const manifest = readManifest();
  const allowlist = buildAllowlist();

  let copied = 0;
  let skipped = 0;
  let totalBytes = 0;
  const keepRelPaths = new Set();

  for (const entry of allowlist) {
    const srcAbs = join(ROOT, entry.src);
    const destAbs = join(DEST_ROOT, entry.dest);

    if (!existsSync(srcAbs)) {
      fail(
        `falta un archivo de la allowlist para "${entry.id}": ${entry.src}. ` +
          "Revisa que assets/ tenga el lote esperado antes de sincronizar.",
      );
      continue;
    }

    if (entry.manifestCharacterId) {
      const expected = expectedHashFor(manifest, entry.manifestCharacterId);
      const actual = sha256(srcAbs);
      if (actual !== expected) {
        fail(
          `el sha256 de ${entry.src} no coincide con el manifiesto ` +
            `(esperado ${expected}, obtenido ${actual}). ` +
            "El arte cambió sin publicar una nueva versión: no se sincroniza.",
        );
        continue;
      }
    }

    const srcStat = statSync(srcAbs);
    totalBytes += srcStat.size;
    keepRelPaths.add(entry.dest);

    mkdirSync(dirname(destAbs), { recursive: true });

    if (existsSync(destAbs)) {
      const destStat = statSync(destAbs);
      const matches = destStat.size === srcStat.size && sha256(destAbs) === sha256(srcAbs);
      if (matches) {
        skipped += 1;
        continue;
      }
    }

    copyFileSync(srcAbs, destAbs);
    copied += 1;
  }

  const removed = pruneStale(DEST_ROOT, keepRelPaths);

  const mib = (bytes) => (bytes / 1024 / 1024).toFixed(2);

  console.log("sync-runtime-assets — resumen:");
  console.log(`  copiados: ${copied}`);
  console.log(`  omitidos (ya sincronizados): ${skipped}`);
  console.log(`  eliminados (fuera de la allowlist): ${removed}`);
  console.log(
    `  bytes totales de la allowlist: ${totalBytes} (${mib(totalBytes)} MiB de ${mib(PRESUPUESTO_BYTES)} MiB de presupuesto)`,
  );

  if (totalBytes > PRESUPUESTO_BYTES) {
    console.error("");
    console.error(
      `sync-runtime-assets — el subconjunto del runtime pesa ${mib(totalBytes)} MiB y el presupuesto declarado es ${mib(PRESUPUESTO_BYTES)} MiB.`,
    );
    console.error(
      "Constitución VI: esto corre en un aula con poco ancho de banda y el hardware que la escuela ya tiene.",
    );
    console.error(
      "Subir el presupuesto es una decisión deliberada: edita PRESUPUESTO_BYTES en este archivo y explica por qué en el commit,",
    );
    console.error(
      "o baja el peso (optimizar un GLB crea una versión nueva, nunca sobrescribe el fuente).",
    );
    process.exit(1);
  }
}

main();
