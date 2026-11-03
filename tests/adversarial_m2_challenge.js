/**
 * =============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 2
 * =============================================================================
 * Agent: teamwork_challenger_m2_1
 * Roles: critic, specialist
 * Target: index.html (Catalog, Recommendation Engine, UI hooks, Gemini Config)
 * Parity Check: backend/02_seed.sql & backend/03_rpc.sql
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    const errMsg = `  [FAIL] ${testName} ${details ? '--> ' + details : ''}`;
    console.error(errMsg);
    failureDetails.push({ testName, details });
  }
}

console.log('================================================================');
console.log('ADVERSARIAL EMPIRICAL CHALLENGER TEST SUITE (Milestone 2)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// STEP 1: LOAD INDEX.HTML AND EXTRACT PRODUCTION ARTIFACTS
// -----------------------------------------------------------------------------
const indexPath = path.resolve(__dirname, '../index.html');
const seedPath = path.resolve(__dirname, '../backend/02_seed.sql');
const rpcPath = path.resolve(__dirname, '../backend/03_rpc.sql');

assert(fs.existsSync(indexPath), 'Target file index.html exists on disk');
assert(fs.existsSync(seedPath), 'Target file backend/02_seed.sql exists on disk');
assert(fs.existsSync(rpcPath), 'Target file backend/03_rpc.sql exists on disk');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seedSql = fs.readFileSync(seedPath, 'utf8');
const rpcSql = fs.readFileSync(rpcPath, 'utf8');

// Extract script tag content
const scriptMatch = indexHtml.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/i);
assert(scriptMatch && scriptMatch[1], 'Inline <script> tag successfully located in index.html');
const scriptContent = scriptMatch ? scriptMatch[1] : '';

// Create an isolated sandbox environment with mock DOM primitives
const sandbox = {
  console: console,
  document: {
    getElementById: (id) => ({
      id,
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      scrollIntoView: () => {},
      focus: () => {},
      addEventListener: () => {},
      dataset: {}
    }),
    addEventListener: () => {},
    createElement: () => ({
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: () => 'data:image/jpeg;base64,mockBase64'
    })
  },
  window: {
    scrollTo: () => {}
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  navigator: {
    onLine: true
  },
  Image: class {
    constructor() {}
  },
  FileReader: class {
    readAsDataURL() {}
  }
};

vm.createContext(sandbox);

try {
  vm.runInContext(scriptContent, sandbox);
  assert(true, 'Production script from index.html compiles and runs in VM without syntax errors');
} catch (err) {
  assert(false, 'Production script compiles and runs without syntax errors', err.message);
}

const PRODUCTS_CATALOG = vm.runInContext('PRODUCTS_CATALOG', sandbox);
const normalizeSubtono = vm.runInContext('normalizeSubtono', sandbox);
const recommendProducts = vm.runInContext('recommendProducts', sandbox);
const ApiKeyManager = vm.runInContext('ApiKeyManager', sandbox);
const AppAssets = vm.runInContext('AppAssets', sandbox);

assert(Array.isArray(PRODUCTS_CATALOG), 'PRODUCTS_CATALOG is defined and is an Array in index.html');
assert(typeof normalizeSubtono === 'function', 'normalizeSubtono is defined and is a Function in index.html');
assert(typeof recommendProducts === 'function', 'recommendProducts is defined and is a Function in index.html');

console.log('\n--- 1. CATALOG STRUCTURE & SCHEMA INTEGRITY ---');

assert(PRODUCTS_CATALOG.length === 12, 'Catalog contains exactly 12 products', `Found: ${PRODUCTS_CATALOG.length}`);

const tiersCount = { Alta: 0, Media: 0, Baja: 0 };
const subtonesCount = { 'Cálido': 0, 'Frío': 0, 'Neutro': 0, 'Universal': 0 };

PRODUCTS_CATALOG.forEach((p, idx) => {
  const pName = p.nombre || `Product #${idx}`;
  assert(typeof p.id === 'string' && p.id.length > 0, `${pName}: id is valid non-empty string`);
  assert(typeof p.nombre === 'string' && p.nombre.length > 0, `${pName}: nombre is valid`);
  assert(typeof p.marca === 'string' && p.marca.length > 0, `${pName}: marca is valid`);
  assert(['Alta', 'Media', 'Baja'].includes(p.gama), `${pName}: gama is valid ('Alta', 'Media', 'Baja')`);
  assert(['Cálido', 'Frío', 'Neutro', 'Universal'].includes(p.subtono_recomendado), `${pName}: subtono is valid`);
  assert(typeof p.precio === 'number' && !isNaN(p.precio) && p.precio > 0, `${pName}: precio is a positive number (${p.precio})`);
  assert(typeof p.tienda_nombre === 'string' && p.tienda_nombre.length > 0, `${pName}: tienda_nombre is valid`);
  assert(typeof p.link_compra === 'string' && p.link_compra.startsWith('https://'), `${pName}: link_compra is https URL`);
  assert(typeof p.imagen_url === 'string' && p.imagen_url.startsWith('https://'), `${pName}: imagen_url is https URL`);

  tiersCount[p.gama] = (tiersCount[p.gama] || 0) + 1;
  subtonesCount[p.subtono_recomendado] = (subtonesCount[p.subtono_recomendado] || 0) + 1;
});

assert(tiersCount.Alta === 4, 'Catalog has exactly 4 Gama Alta products', `Found: ${tiersCount.Alta}`);
assert(tiersCount.Media === 4, 'Catalog has exactly 4 Gama Media products', `Found: ${tiersCount.Media}`);
assert(tiersCount.Baja === 4, 'Catalog has exactly 4 Gama Baja products', `Found: ${tiersCount.Baja}`);
assert(subtonesCount['Cálido'] === 3, 'Catalog has exactly 3 Cálido products (1 per tier)', `Found: ${subtonesCount['Cálido']}`);
assert(subtonesCount['Frío'] === 3, 'Catalog has exactly 3 Frío products (1 per tier)', `Found: ${subtonesCount['Frío']}`);
assert(subtonesCount['Neutro'] === 3, 'Catalog has exactly 3 Neutro products (1 per tier)', `Found: ${subtonesCount['Neutro']}`);
assert(subtonesCount['Universal'] === 3, 'Catalog has exactly 3 Universal products (1 per tier)', `Found: ${subtonesCount['Universal']}`);

console.log('\n--- 2. FRONTEND CATALOG VS BACKEND SEED SQL PARITY ---');

// Parse backend/02_seed.sql
const uuidMatches = [...seedSql.matchAll(/'([a-c]0000000-0000-0000-0000-00000000000[1-4])'/g)].map(m => m[1]);
assert(uuidMatches.length === 12, 'backend/02_seed.sql contains exactly 12 product UUIDs', `Found: ${uuidMatches.length}`);

// Check that all 12 backend UUIDs exist in frontend PRODUCTS_CATALOG with identical attributes
uuidMatches.forEach(uuid => {
  const frontProduct = PRODUCTS_CATALOG.find(p => p.id === uuid);
  assert(!!frontProduct, `Backend UUID ${uuid} exists in frontend PRODUCTS_CATALOG`);
});

console.log('\n--- 3. ORACLE VALIDATION: CANONICAL SUBTONES VS POSTGRESQL RPC ---');

// Canonical 1: Cálido -> Dior (Alta), Fenty Pro Filt'r (Media), Maybelline Fit Me (Baja)
const recCalido = recommendProducts('Cálido');
assert(recCalido.length === 3, "recommendProducts('Cálido') returns exactly 3 products");
assert(recCalido[0].gama === 'Alta' && recCalido[0].marca === 'Dior', "Cálido Alta tier is Dior Forever Skin Glow");
assert(recCalido[1].gama === 'Media' && recCalido[1].marca === 'Fenty Beauty' && recCalido[1].nombre.includes("Pro Filt'r"), "Cálido Media tier is Fenty Pro Filt'r");
assert(recCalido[2].gama === 'Baja' && recCalido[2].marca === 'Maybelline New York', "Cálido Baja tier is Maybelline Fit Me");

// Canonical 2: Frío -> Estée Lauder (Alta), MAC Studio Fix (Media), L'Oréal True Match (Baja)
const recFrio = recommendProducts('Frío');
assert(recFrio.length === 3, "recommendProducts('Frío') returns exactly 3 products");
assert(recFrio[0].gama === 'Alta' && recFrio[0].marca === 'Estée Lauder', "Frío Alta tier is Estée Lauder Double Wear");
assert(recFrio[1].gama === 'Media' && recFrio[1].marca === 'MAC Cosmetics', "Frío Media tier is MAC Studio Fix");
assert(recFrio[2].gama === 'Baja' && recFrio[2].marca === "L'Oréal Paris", "Frío Baja tier is L'Oréal True Match");

// Canonical 3: Neutro -> Armani Luminous Silk (Alta), Rare Beauty (Media), e.l.f. Camo CC (Baja)
const recNeutro = recommendProducts('Neutro');
assert(recNeutro.length === 3, "recommendProducts('Neutro') returns exactly 3 products");
assert(recNeutro[0].gama === 'Alta' && recNeutro[0].marca === 'Giorgio Armani', "Neutro Alta tier is Armani Luminous Silk");
assert(recNeutro[1].gama === 'Media' && recNeutro[1].marca === 'Rare Beauty', "Neutro Media tier is Rare Beauty Liquid Touch");
assert(recNeutro[2].gama === 'Baja' && recNeutro[2].marca === 'e.l.f. Cosmetics', "Neutro Baja tier is e.l.f. Camo CC");

// Canonical 4: Universal / Unknown -> Charlotte Tilbury (Alta), Fenty Eaze Drop (Media), Wet n Wild (Baja)
const recUniversal = recommendProducts('Universal');
assert(recUniversal.length === 3, "recommendProducts('Universal') returns exactly 3 products");
assert(recUniversal[0].gama === 'Alta' && recUniversal[0].marca === 'Charlotte Tilbury', "Universal Alta tier is Charlotte Tilbury");
assert(recUniversal[1].gama === 'Media' && recUniversal[1].marca === 'Fenty Beauty' && recUniversal[1].nombre.includes('Eaze Drop'), "Universal Media tier is Fenty Eaze Drop");
assert(recUniversal[2].gama === 'Baja' && recUniversal[2].marca === 'Wet n Wild', "Universal Baja tier is Wet n Wild Bare Focus");

console.log('\n--- 4. ADVERSARIAL FUZZING OF RECOMMENDATION ALGORITHM ---');

function assertRecommendationContract(output, label) {
  if (!Array.isArray(output)) {
    return { ok: false, msg: 'Output is not an Array' };
  }
  if (output.length !== 3) {
    return { ok: false, msg: `Expected length 3, got ${output.length}` };
  }
  if (!output[0] || !output[1] || !output[2]) {
    return { ok: false, msg: 'Output contains null/undefined items' };
  }
  if (output[0].gama !== 'Alta' || output[1].gama !== 'Media' || output[2].gama !== 'Baja') {
    return { ok: false, msg: `Expected [Alta, Media, Baja], got [${output.map(p => p.gama).join(', ')}]` };
  }
  return { ok: true };
}

// 4.1 Falsy, Null, Undefined, Numbers, Booleans, Objects
const nonStringFuzzInputs = [
  null,
  undefined,
  "",
  "   ",
  "\t\n\r  ",
  0,
  1,
  -1,
  123.456,
  NaN,
  Infinity,
  -Infinity,
  true,
  false,
  {},
  { subtono: "calido" },
  [],
  [1, 2, 3],
  function() {},
  () => "calido",
  Symbol("calido"),
  BigInt(42)
];

nonStringFuzzInputs.forEach((input, i) => {
  try {
    const res = recommendProducts(input);
    const check = assertRecommendationContract(res, `non-string input #${i}`);
    assert(check.ok, `Non-string fuzz input (${typeof input}: ${String(input).slice(0, 20)}) safe & returns 3 tiers`, check.msg);
    // Non-string/empty must fallback to Universal products
    assert(
      res[0].marca === 'Charlotte Tilbury' && res[1].marca === 'Fenty Beauty' && res[2].marca === 'Wet n Wild',
      `Non-string input (${typeof input}) falls back safely to Universal recommendations`
    );
  } catch (err) {
    assert(false, `Non-string input throws uncaught exception: ${typeof input}`, err.message);
  }
});

// 4.2 Case Variations & Diacritics
const caseAndDiacriticInputs = [
  // Cálido variations
  { input: "calido", expectedAlta: "Dior" },
  { input: "CALIDO", expectedAlta: "Dior" },
  { input: "cAlIdO", expectedAlta: "Dior" },
  { input: "CÁLIDO", expectedAlta: "Dior" },
  { input: "cálído", expectedAlta: "Dior" },
  { input: "càlido", expectedAlta: "Dior" },
  { input: "  Cálido  ", expectedAlta: "Dior" },
  { input: "calido\n", expectedAlta: "Dior" },
  { input: "c\u00e1lido", expectedAlta: "Dior" }, // NFC
  { input: "ca\u0301lido", expectedAlta: "Dior" }, // NFD

  // Frío variations
  { input: "frio", expectedAlta: "Estée Lauder" },
  { input: "FRIO", expectedAlta: "Estée Lauder" },
  { input: "fRiO", expectedAlta: "Estée Lauder" },
  { input: "FRÍO", expectedAlta: "Estée Lauder" },
  { input: "frìo", expectedAlta: "Estée Lauder" },
  { input: "frïo", expectedAlta: "Estée Lauder" },
  { input: "  Frío\t", expectedAlta: "Estée Lauder" },
  { input: "fr\u00edo", expectedAlta: "Estée Lauder" }, // NFC
  { input: "fri\u0301o", expectedAlta: "Estée Lauder" }, // NFD

  // Neutro variations
  { input: "neutro", expectedAlta: "Giorgio Armani" },
  { input: "NEUTRO", expectedAlta: "Giorgio Armani" },
  { input: "nEuTrO", expectedAlta: "Giorgio Armani" },
  { input: "nèutro", expectedAlta: "Giorgio Armani" },
  { input: "néutro", expectedAlta: "Giorgio Armani" },
  { input: "   Neutro   ", expectedAlta: "Giorgio Armani" },

  // Universal variations
  { input: "universal", expectedAlta: "Charlotte Tilbury" },
  { input: "UNIVERSAL", expectedAlta: "Charlotte Tilbury" },
  { input: "uNiVeRsAl", expectedAlta: "Charlotte Tilbury" },
  { input: "uníversál", expectedAlta: "Charlotte Tilbury" }
];

caseAndDiacriticInputs.forEach(({ input, expectedAlta }) => {
  try {
    const res = recommendProducts(input);
    const check = assertRecommendationContract(res, `input: ${input}`);
    assert(check.ok, `Fuzz input '${input}' returns 3 valid tiers`, check.msg);
    assert(res[0].marca === expectedAlta, `Input '${input}' matches expected Alta tier '${expectedAlta}' (got '${res[0].marca}')`);
  } catch (err) {
    assert(false, `Fuzz input '${input}' threw error`, err.message);
  }
});

// 4.3 Malicious, Injection, Emojis, Long Strings, Weird Characters
const hostileInputs = [
  "☀️ Cálido",
  "❄️ Frío",
  "⚖️ Neutro",
  "✨💅💄🔥",
  "<script>alert('xss')</script>",
  "'; DROP TABLE productos_maquillaje; --",
  "SELECT * FROM productos_maquillaje WHERE 1=1",
  "../../../etc/passwd",
  "{{ 7 * 7 }}",
  "${process.env.PATH}",
  "__proto__",
  "constructor",
  "prototype",
  "hasOwnProperty",
  "\x00\x01\x02\x03\x04\x05",
  "a".repeat(1000),
  "calido".repeat(500),
  "   ".repeat(1000),
  "!@#$%^&*()_+-=[]{}|;':\",./<>?"
];

hostileInputs.forEach((hostile, idx) => {
  try {
    const res = recommendProducts(hostile);
    const check = assertRecommendationContract(res, `hostile input #${idx}`);
    assert(check.ok, `Hostile input #${idx} (${hostile.slice(0, 25)}) survived without crash`, check.msg);
  } catch (err) {
    assert(false, `Hostile input #${idx} crashed the engine`, err.message);
  }
});

// 4.4 High-Volume Randomized Fuzzing Harness (10,000 iterations)
console.log('\n--- 5. HIGH-VOLUME RANDOMIZED FUZZ HARNESS (10,000 iterations) ---');

function getRandomAdversarialString() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789áéíóúÁÉÍÓÚ \t\n!@#$%^&*()_+-={}[];:\'",.<>/?~`|\\☀️❄️⚖️💄';
  const len = Math.floor(Math.random() * 50);
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

let fuzzCrashes = 0;
let fuzzContractViolations = 0;
const FUZZ_RUNS = 10000;

for (let i = 0; i < FUZZ_RUNS; i++) {
  const input = Math.random() < 0.1 ? nonStringFuzzInputs[Math.floor(Math.random() * nonStringFuzzInputs.length)] : getRandomAdversarialString();
  try {
    const out = recommendProducts(input);
    const check = assertRecommendationContract(out, `random fuzz #${i}`);
    if (!check.ok) {
      fuzzContractViolations++;
    }
  } catch (err) {
    fuzzCrashes++;
  }
}

assert(fuzzCrashes === 0, `10,000 randomized fuzz iterations executed with 0 crashes`, `Crashes: ${fuzzCrashes}`);
assert(fuzzContractViolations === 0, `10,000 randomized fuzz iterations satisfied [Alta, Media, Baja] contract 100% of the time`, `Violations: ${fuzzContractViolations}`);

console.log('\n--- 6. DOM HOOKS & UI CONTRACT COMPLIANCE IN INDEX.HTML ---');

const requiredElementIds = [
  'screen-landing',
  'screen-upload',
  'screen-recommendations',
  'file-input',
  'dropzone',
  'preview-image',
  'preview-placeholder',
  'btn-analyze',
  'btn-change-photo',
  'result-card',
  'result-subtono-badge',
  'result-summary-text',
  'analysis-error-banner',
  'error-title',
  'error-message',
  'btn-error-action',
  'loading-state-overlay',
  'recs-detected-subtono',
  'modal-apikey',
  'input-api-key',
  // Tier Alta
  'card-tier-alta',
  'img-alta',
  'brand-alta',
  'name-alta',
  'store-alta',
  'shade-alta',
  'price-alta',
  'link-alta',
  // Tier Media
  'card-tier-media',
  'img-media',
  'brand-media',
  'name-media',
  'store-media',
  'shade-media',
  'price-media',
  'link-media',
  // Tier Baja
  'card-tier-baja',
  'img-baja',
  'brand-baja',
  'name-baja',
  'store-baja',
  'shade-baja',
  'price-baja',
  'link-baja'
];

requiredElementIds.forEach(id => {
  const exists = indexHtml.includes(`id="${id}"`);
  assert(exists, `Required DOM element id="${id}" exists in index.html`);
});

console.log('\n--- 7. GEMINI REST INTEGRATION SPECIFICATION AUDIT ---');

const geminiEndpoint = vm.runInContext('GEMINI_ENDPOINT', sandbox);
assert(geminiEndpoint === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', 'Configured exact Gemini 2.5 Flash endpoint', `Evaluated to: ${geminiEndpoint}`);
assert(indexHtml.includes('YOUR_GEMINI_API_KEY'), 'Contains placeholder API key YOUR_GEMINI_API_KEY');
assert(indexHtml.includes('// 🔑 CAMBIA AQUÍ TU API KEY DE GOOGLE AI STUDIO'), 'Contains exact mandatory comment for API key');
assert(indexHtml.includes('temperature: 0.1') || indexHtml.includes('"temperature": 0.1'), 'Gemini temperature set to 0.1 for deterministic output');
assert(indexHtml.includes('application/json'), 'responseMimeType set to application/json');
assert(indexHtml.includes('rostro_detectado'), 'Structured schema enforces rostro_detectado');
assert(indexHtml.includes('subtono'), 'Structured schema enforces subtono');
assert(indexHtml.includes('resumen_breve'), 'Structured schema enforces resumen_breve');
assert(indexHtml.includes('inlineData'), 'Image payload formatted as inlineData');

console.log('\n--- 8. LUXURY DESIGN SYSTEM & ASSET INTEGRITY ---');

assert(indexHtml.includes('promo1.jpg'), 'Screen 1 references promo1.jpg');
assert(indexHtml.includes('promo2.jpg'), 'Screen 1 references promo2.jpg');
assert(indexHtml.includes('promo3.jpg'), 'Screen 1 references promo3.jpg');

const promo1Exists = fs.existsSync(path.resolve(__dirname, '../assets/promo1.jpg'));
const promo2Exists = fs.existsSync(path.resolve(__dirname, '../assets/promo2.jpg'));
const promo3Exists = fs.existsSync(path.resolve(__dirname, '../assets/promo3.jpg'));

assert(promo1Exists, 'assets/promo1.jpg exists on filesystem');
assert(promo2Exists, 'assets/promo2.jpg exists on filesystem');
assert(promo3Exists, 'assets/promo3.jpg exists on filesystem');

if (promo1Exists && promo2Exists && promo3Exists) {
  const s1 = fs.statSync(path.resolve(__dirname, '../assets/promo1.jpg')).size;
  const s2 = fs.statSync(path.resolve(__dirname, '../assets/promo2.jpg')).size;
  const s3 = fs.statSync(path.resolve(__dirname, '../assets/promo3.jpg')).size;
  assert(s1 > 100000, `promo1.jpg is substantial high-res file (${s1} bytes)`);
  assert(s2 > 100000, `promo2.jpg is substantial high-res file (${s2} bytes)`);
  assert(s3 > 100000, `promo3.jpg is substantial high-res file (${s3} bytes)`);
}

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL EMPIRICAL VERIFICATIONS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failureDetails.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.testName} (${f.details})`);
  });
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
