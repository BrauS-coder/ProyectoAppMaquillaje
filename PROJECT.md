# Project: Backend Recomendador de Maquillaje (Supabase + Gemini API)

## Architecture
The backend provides a complete database and AI integration architecture for a face analysis and makeup product recommendation engine:
1. **Gemini Vision Analysis**: Client or backend sends facial image to Google AI Studio Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`) with structured output enforcement (`responseSchema`), returning `{ rostro_detectado: boolean, subtono: string, resumen_breve: string }`.
2. **Supabase Database & Security**: PostgreSQL table `productos_maquillaje` stores catalog across 3 tiers ('Alta', 'Media', 'Baja') and subtones ('Cálido', 'Frío', 'Neutro', 'Universal'). Row Level Security (RLS) is enabled, granting public `SELECT` access to anonymous users (`anon`) while protecting mutation access.
3. **Recommendation Engine (RPC)**: Stored procedure `recomendar_maquillaje_por_subtono(subtono TEXT)` executes a windowed partition query (`ROW_NUMBER() OVER (PARTITION BY gama ORDER BY priority ASC, id ASC)`) with accent insensitivity and hierarchical fallback (Exact > Universal > Any), returning exactly 3 products: 1 Gama Alta, 1 Gama Media, and 1 Gama Baja.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Table Schema DDL | Table `productos_maquillaje` with UUID PK, check constraints on `gama` ('Alta', 'Media', 'Baja'), `subtono_recomendado`, `precio >= 0`, and B-Tree indexes | M1 | ORIGINAL_REQUEST § R1 |
| 2 | Row Level Security (RLS) | Explicit RLS enabled with SELECT policy for `anon` and `authenticated` roles | M1 | ORIGINAL_REQUEST § R1 |
| 3 | Seed Data Script | Idempotent INSERT script with >=9 realistic products (12 curated products: 4 Alta, 4 Media, 4 Baja across Cálido, Frío, Neutro, Universal) | M1 | ORIGINAL_REQUEST § R2 |
| 4 | Gemini API HTTP REST Spec | Specification of endpoint, headers (`x-goog-api-key`), JSON body with `inlineData` Base64, and `responseSchema` for `gemini-2.5-flash` | M1 | ORIGINAL_REQUEST § R3 |
| 5 | Gemini Request cURL Script | Standalone executable cURL template with payload and system instructions | M1 | ORIGINAL_REQUEST § R3 |
| 6 | Supabase RPC Recommendation Function | PostgreSQL stored function `recomendar_maquillaje_por_subtono` returning exactly 3 products (1 Alta, 1 Media, 1 Baja) with fallback | M1 | ORIGINAL_REQUEST § R4 |
| 7 | Backend Documentation & Scope Isolation | Comprehensive `README.md` and automated validation script strictly isolated within `./backend` | M1 | ORIGINAL_REQUEST § R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend Implementation | Implement all SQL scripts (schema, seed, rpc), Gemini API specifications, cURL template, automated validation, and documentation in `./backend` | none | DONE |

## Interface Contracts
### Gemini API ↔ Recommendation Service
- **Input**: Facial image as Base64 string in `inlineData.data` (`mimeType`: `image/jpeg` or `image/png`).
- **Output JSON**:
  ```json
  {
    "rostro_detectado": true,
    "subtono": "Cálido",
    "resumen_breve": "Subtono cálido identificado por matices dorados en la piel."
  }
  ```
- **Error Condition**: If `rostro_detectado` is false, `subtono` is `"Neutro"` and `resumen_breve` explains why no face was detected.

### Supabase Client ↔ RPC Function
- **Signature**: `public.recomendar_maquillaje_por_subtono(subtono TEXT DEFAULT 'Universal') RETURNS SETOF public.productos_maquillaje`
- **Output**: Exactly 3 rows matching `productos_maquillaje` schema, ordered:
  1. Row 1: `gama = 'Alta'`
  2. Row 2: `gama = 'Media'`
  3. Row 3: `gama = 'Baja'`

## Code Layout
All deliverable files reside exclusively in `./backend`:
- `backend/01_schema.sql`: Table creation, data types, check constraints, indexes, and RLS policies.
- `backend/02_seed.sql`: 12 verified makeup products with realistic prices, brands, store names, URLs, and image links.
- `backend/03_rpc.sql`: PostgreSQL stored function `recomendar_maquillaje_por_subtono`.
- `backend/gemini_api_spec.json`: OpenAPI / REST specification for Gemini API `generateContent`.
- `backend/gemini_request.curl`: Executable cURL script template.
- `backend/README.md`: Architecture guide, deployment instructions for Supabase, and Gemini API integration manual.
- `backend/verify_backend.js`: Static automated verification suite testing SQL constraints, seed counts, JSON schema validity, and RPC simulation.
