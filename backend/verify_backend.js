/**
 * =============================================================================
 * PROYECTO: Backend Recomendador de Maquillaje (Supabase + Gemini API)
 * ARCHIVO: verify_backend.js
 * DESCRIPCIÓN: Suite de pruebas automatizadas estáticas y simulación de cruce
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = __dirname;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, failureDetail = '') {
  if (condition) {
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${testName}`);
    testsPassed++;
  } else {
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${testName}${failureDetail ? ' -> ' + failureDetail : ''}`);
    testsFailed++;
  }
}

console.log('\n============================================================');
console.log('SUITE DE VERIFICACIÓN AUTOMATIZADA: BACKEND MAQUILLAJE');
console.log('============================================================\n');

// -----------------------------------------------------------------------------
// 1. Verificación de Existencia de Archivos Requeridos
// -----------------------------------------------------------------------------
console.log('--- 1. Existencia Física de Artefactos Requeridos ---');
const requiredFiles = [
  '01_schema.sql',
  '02_seed.sql',
  '03_rpc.sql',
  'gemini_api_spec.json',
  'gemini_request.curl',
  'README.md',
  'verify_backend.js'
];

const fileContents = {};
for (const file of requiredFiles) {
  const filePath = path.join(BACKEND_DIR, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Archivo requerido existe: ${file}`);
  if (exists) {
    fileContents[file] = fs.readFileSync(filePath, 'utf8');
  }
}

// -----------------------------------------------------------------------------
// 2. Validación Estática de Esquema SQL (01_schema.sql)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Validación de 01_schema.sql (DDL, Tipos, Constraints y RLS) ---');
const schemaSql = fileContents['01_schema.sql'] || '';

assert(schemaSql.includes('CREATE TABLE IF NOT EXISTS public.productos_maquillaje'), 'Sentencia CREATE TABLE de productos_maquillaje presente');
assert(schemaSql.includes('id UUID PRIMARY KEY') && schemaSql.includes('gen_random_uuid()'), 'Columna id definida como UUID PRIMARY KEY DEFAULT gen_random_uuid()');

const requiredColumns = [
  'id UUID',
  'nombre TEXT NOT NULL',
  'marca TEXT NOT NULL',
  'gama TEXT NOT NULL',
  'subtono_recomendado TEXT NOT NULL',
  'precio NUMERIC',
  'tienda_nombre TEXT NOT NULL',
  'link_compra TEXT NOT NULL',
  'imagen_url TEXT NOT NULL',
  'created_at TIMESTAMPTZ'
];

for (const col of requiredColumns) {
  assert(schemaSql.includes(col), `Columna y tipo requerido presente: ${col}`);
}

assert(schemaSql.includes("gama IN ('Alta', 'Media', 'Baja')"), "Restricción CHECK de gama ('Alta', 'Media', 'Baja') presente");
assert(schemaSql.includes("subtono_recomendado IN ('Cálido', 'Frío', 'Neutro', 'Universal')"), "Restricción CHECK de subtono_recomendado presente");
assert(schemaSql.includes('precio >= 0'), 'Restricción CHECK de precio positivo presente');
assert(schemaSql.includes('CREATE INDEX') && schemaSql.includes('idx_productos_maquillaje_gama_subtono'), 'Índice compuesto (gama, subtono_recomendado) definido');
assert(schemaSql.includes('ENABLE ROW LEVEL SECURITY'), 'Row Level Security explícitamente habilitado');
assert(schemaSql.includes('CREATE POLICY "Permitir lectura publica de productos_maquillaje"') && schemaSql.includes('TO anon, authenticated'), 'Política RLS de lectura pública SELECT concedida a anon y authenticated');

// -----------------------------------------------------------------------------
// 3. Validación Estática del Catálogo de Seed Data (02_seed.sql)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Validación de 02_seed.sql (Catálogo de 12 Productos) ---');
const seedSql = fileContents['02_seed.sql'] || '';

assert(seedSql.includes('INSERT INTO public.productos_maquillaje'), 'Sentencia INSERT INTO productos_maquillaje presente');
assert(seedSql.includes('ON CONFLICT (id) DO UPDATE'), 'Cláusula de idempotencia ON CONFLICT (id) DO UPDATE presente');

// Extraer bloques de inserción de productos (soportando comillas simples escapadas '')
const strField = "'((?:[^']|'')*)'";
const seedRowRegex = new RegExp(
  `\\(\\s*${strField},\\s*${strField},\\s*${strField},\\s*${strField},\\s*${strField},\\s*([0-9.]+),\\s*${strField},\\s*${strField},\\s*${strField}\\s*\\)`,
  'g'
);
const parsedProducts = [];
let match;
while ((match = seedRowRegex.exec(seedSql)) !== null) {
  parsedProducts.push({
    id: match[1].replace(/''/g, "'"),
    nombre: match[2].replace(/''/g, "'"),
    marca: match[3].replace(/''/g, "'"),
    gama: match[4].replace(/''/g, "'"),
    subtono_recomendado: match[5].replace(/''/g, "'"),
    precio: parseFloat(match[6]),
    tienda_nombre: match[7].replace(/''/g, "'"),
    link_compra: match[8].replace(/''/g, "'"),
    imagen_url: match[9].replace(/''/g, "'")
  });
}

assert(parsedProducts.length === 12, `Se extrajeron exactamente 12 productos del archivo seed (encontrados: ${parsedProducts.length})`);

const altaCount = parsedProducts.filter(p => p.gama === 'Alta').length;
const mediaCount = parsedProducts.filter(p => p.gama === 'Media').length;
const bajaCount = parsedProducts.filter(p => p.gama === 'Baja').length;

assert(altaCount === 4, `Catálogo contiene exactamente 4 productos de Gama Alta (encontrados: ${altaCount})`);
assert(mediaCount === 4, `Catálogo contiene exactamente 4 productos de Gama Media (encontrados: ${mediaCount})`);
assert(bajaCount === 4, `Catálogo contiene exactamente 4 productos de Gama Baja (encontrados: ${bajaCount})`);

const subtonosFound = new Set(parsedProducts.map(p => p.subtono_recomendado));
assert(subtonosFound.has('Cálido') && subtonosFound.has('Frío') && subtonosFound.has('Neutro') && subtonosFound.has('Universal'),
  'Catálogo cubre todos los subtonos: Cálido, Frío, Neutro y Universal');

let allFieldsValid = true;
let invalidFieldReason = '';
for (const p of parsedProducts) {
  if (!p.id || !p.nombre || !p.marca || !p.tienda_nombre) {
    allFieldsValid = false;
    invalidFieldReason = `Campos de texto vacíos en producto ${p.id}`;
    break;
  }
  if (isNaN(p.precio) || p.precio < 0) {
    allFieldsValid = false;
    invalidFieldReason = `Precio inválido en producto ${p.id}: ${p.precio}`;
    break;
  }
  if (!p.link_compra.startsWith('https://') || !p.imagen_url.startsWith('https://')) {
    allFieldsValid = false;
    invalidFieldReason = `URLs no seguras (HTTPS) en producto ${p.id}`;
    break;
  }
}
assert(allFieldsValid, 'Todos los 12 productos tienen atributos completos, precios positivos y URLs HTTPS válidas', invalidFieldReason);

// Verificar marcas con apóstrofes escapados correctamente en SQL
assert(seedSql.includes("Pro Filt''r") && seedSql.includes("L''Oréal Paris"), "Caracteres especiales (apóstrofes) correctamente escapados en SQL (Pro Filt''r, L''Oréal)");

// -----------------------------------------------------------------------------
// 4. Validación de Función RPC (03_rpc.sql)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Validación de 03_rpc.sql (Algoritmo de Cruce y Permisos) ---');
const rpcSql = fileContents['03_rpc.sql'] || '';

assert(rpcSql.includes('CREATE OR REPLACE FUNCTION public.recomendar_maquillaje_por_subtono'), 'Declaración de función recomendar_maquillaje_por_subtono presente');
assert(rpcSql.includes("subtono TEXT DEFAULT 'Universal'"), "Parámetro subtono TEXT con valor por defecto 'Universal'");
assert(rpcSql.includes('RETURNS SETOF public.productos_maquillaje'), 'Retorna SETOF public.productos_maquillaje');
assert(rpcSql.includes("translate(lower(trim("), "Normalización diacrítica con translate(lower(trim(...)), 'áéíóú', 'aeiou') presente");
assert(rpcSql.includes('ROW_NUMBER() OVER') && rpcSql.includes('PARTITION BY p.gama'), 'Función de ventana ROW_NUMBER() con PARTITION BY p.gama presente');
assert(rpcSql.includes("WHEN 'Alta' THEN 1") && rpcSql.includes("WHEN 'Media' THEN 2") && rpcSql.includes("WHEN 'Baja' THEN 3"), 'Ordenamiento final jerárquico garantizado: 1. Alta, 2. Media, 3. Baja');
assert(rpcSql.includes('GRANT EXECUTE ON FUNCTION public.recomendar_maquillaje_por_subtono(TEXT) TO anon, authenticated, service_role'), 'Permiso de ejecución explícito concedido a anon, authenticated y service_role');

// -----------------------------------------------------------------------------
// 5. Validación de Especificación OpenAPI / REST (gemini_api_spec.json)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Validación de gemini_api_spec.json (Contrato REST OpenAPI 3.0) ---');
let parsedSpec = null;
try {
  parsedSpec = JSON.parse(fileContents['gemini_api_spec.json'] || '{}');
  assert(true, 'gemini_api_spec.json es un archivo JSON sintácticamente válido');
} catch (e) {
  assert(false, 'gemini_api_spec.json es un archivo JSON sintácticamente válido', e.message);
}

if (parsedSpec) {
  assert(parsedSpec.openapi && parsedSpec.openapi.startsWith('3.0'), `Versión de OpenAPI válida: ${parsedSpec.openapi}`);
  assert(parsedSpec.paths && parsedSpec.paths['/models/gemini-2.5-flash:generateContent'], 'Ruta REST del modelo gemini-2.5-flash:generateContent presente');
  
  const postOp = parsedSpec.paths['/models/gemini-2.5-flash:generateContent']?.post;
  assert(postOp && postOp.summary, 'Operación POST configurada con metadatos descriptivos');
  
  const secSchemes = parsedSpec.components?.securitySchemes;
  assert(secSchemes && secSchemes.ApiKeyAuth && secSchemes.ApiKeyAuth.name === 'x-goog-api-key', 'Esquema de seguridad con cabecera x-goog-api-key definido');

  const schemas = parsedSpec.components?.schemas;
  assert(schemas && schemas.FacialAnalysisOutputSchema, 'Esquema FacialAnalysisOutputSchema definido');
  
  const props = schemas?.FacialAnalysisOutputSchema?.properties?.properties?.properties;
  assert(props && props.rostro_detectado && props.subtono && props.resumen_breve, 'Campos requeridos en responseSchema: rostro_detectado, subtono, resumen_breve');
  
  const subtonoEnum =
    schemas?.StructuredOutputPayload?.properties?.subtono?.enum ||
    schemas?.FacialAnalysisOutputSchema?.properties?.properties?.properties?.subtono?.properties?.enum?.example ||
    postOp?.requestBody?.content?.['application/json']?.examples?.analisis_rostro_base64?.value?.generationConfig?.responseSchema?.properties?.subtono?.enum;
  assert(Array.isArray(subtonoEnum) && subtonoEnum.includes('Cálido') && subtonoEnum.includes('Frío') && subtonoEnum.includes('Neutro'), 'Enum de subtonos en responseSchema: Cálido, Frío, Neutro');
  
  const examples = postOp?.responses?.['200']?.content?.['application/json']?.examples;
  assert(examples && examples.subtono_calido && examples.subtono_frio && examples.subtono_neutro && examples.rostro_no_detectado, 'Ejemplos exhaustivos para Cálido, Frío, Neutro y Rostro No Detectado documentados');
}

// -----------------------------------------------------------------------------
// 6. Validación de Script cURL (gemini_request.curl)
// -----------------------------------------------------------------------------
console.log('\n--- 6. Validación de gemini_request.curl (Plantilla Ejecutable) ---');
const curlScript = fileContents['gemini_request.curl'] || '';

assert(curlScript.startsWith('#!/usr/bin/env bash'), 'Shebang bash presente al inicio del script');
assert(curlScript.includes('GEMINI_API_KEY'), 'Validación de variable de entorno GEMINI_API_KEY presente');
assert(curlScript.includes('gemini-2.5-flash'), 'Configuración de modelo por defecto gemini-2.5-flash presente');
assert(curlScript.includes('x-goog-api-key'), 'Cabecera x-goog-api-key incluida en comando curl');
assert(curlScript.includes('inlineData') && curlScript.includes('mimeType'), 'Estructura multimodal inlineData con mimeType presente');
assert(curlScript.includes('responseSchema') && curlScript.includes('rostro_detectado'), 'Configuración de responseSchema con rostro_detectado incluida');

// -----------------------------------------------------------------------------
// 7. Simulación Algorítmica del RPC con los 12 Productos del Catálogo
// -----------------------------------------------------------------------------
console.log('\n--- 7. Simulación Algorítmica del Procedimiento Almacenado RPC ---');

function normalizeSubtono(s) {
  if (!s || !s.trim()) return 'universal';
  const clean = s.trim().toLowerCase();
  const accents = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
  return clean.replace(/[áéíóú]/g, m => accents[m]);
}

function simulateRPC(products, requestedSubtono) {
  const cleanRequested = normalizeSubtono(requestedSubtono);
  const gamas = ['Alta', 'Media', 'Baja'];
  const recommendations = [];

  for (const g of gamas) {
    const candidates = products.filter(p => p.gama === g);
    candidates.sort((a, b) => {
      const normA = normalizeSubtono(a.subtono_recomendado);
      const normB = normalizeSubtono(b.subtono_recomendado);
      const prioA = (normA === cleanRequested) ? 1 : (normA === 'universal' ? 2 : 3);
      const prioB = (normB === cleanRequested) ? 1 : (normB === 'universal' ? 2 : 3);
      
      if (prioA !== prioB) return prioA - prioB;
      if (a.precio !== b.precio) return a.precio - b.precio;
      return a.id.localeCompare(b.id);
    });

    if (candidates.length > 0) {
      recommendations.push(candidates[0]);
    }
  }

  return recommendations;
}

const testCases = [
  {
    name: "Coincidencia exacta con subtono 'Cálido'",
    input: 'Cálido',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Cálido', 'Cálido', 'Cálido']
  },
  {
    name: "Tolerancia a minúsculas y sin acento: 'calido'",
    input: 'calido',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Cálido', 'Cálido', 'Cálido']
  },
  {
    name: "Coincidencia exacta con subtono 'Frío'",
    input: 'Frío',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Frío', 'Frío', 'Frío']
  },
  {
    name: "Tolerancia a minúsculas y sin acento: 'frio'",
    input: 'frio',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Frío', 'Frío', 'Frío']
  },
  {
    name: "Coincidencia exacta con subtono 'Neutro'",
    input: 'Neutro',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Neutro', 'Neutro', 'Neutro']
  },
  {
    name: "Solicitud directa de subtono 'Universal'",
    input: 'Universal',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Universal', 'Universal', 'Universal']
  },
  {
    name: "Subtono no registrado 'Desconocido' (Fallback a Universal)",
    input: 'Desconocido',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Universal', 'Universal', 'Universal']
  },
  {
    name: "Parámetro vacío '' (Fallback seguro a Universal)",
    input: '',
    expectedGamas: ['Alta', 'Media', 'Baja'],
    expectedSubtonos: ['Universal', 'Universal', 'Universal']
  }
];

for (const tc of testCases) {
  const result = simulateRPC(parsedProducts, tc.input);
  const correctCount = result.length === 3;
  const correctGamas = result.map(r => r.gama).join(',') === tc.expectedGamas.join(',');
  const correctSubtonos = result.map(r => r.subtono_recomendado).join(',') === tc.expectedSubtonos.join(',');
  
  assert(
    correctCount && correctGamas && correctSubtonos,
    `RPC Test: ${tc.name} -> Retorna exactamente 3 productos [${result.map(r => `${r.gama}: ${r.nombre}`).join(' | ')}]`
  );
}

// -----------------------------------------------------------------------------
// Resumen y Salida
// -----------------------------------------------------------------------------
console.log('\n============================================================');
console.log(`TOTAL DE PRUEBAS EJECUTADAS: ${testsPassed + testsFailed}`);
console.log(`  PASADAS: \x1b[32m${testsPassed}\x1b[0m`);
console.log(`  FALLIDAS: \x1b[31m${testsFailed}\x1b[0m`);

if (testsFailed === 0) {
  console.log('\x1b[32m✔ RESULTADO GLOBAL: 100% DE PRUEBAS SUPERADAS EXITOSAMENTE\x1b[0m');
  console.log('============================================================\n');
  process.exit(0);
} else {
  console.error('\x1b[31m✖ RESULTADO GLOBAL: SE ENCONTRARON FALLOS EN LA VERIFICACIÓN\x1b[0m');
  console.log('============================================================\n');
  process.exit(1);
}
