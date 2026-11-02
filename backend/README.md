# Backend: Recomendador de Maquillaje por Subtono Cutáneo

Este módulo proporciona la infraestructura completa de base de datos relacional (Supabase / PostgreSQL 15+) y la especificación de integración con la API de Google AI Studio (Gemini Vision) para analizar fotografías de rostros y emitir recomendaciones de cosméticos en tres gamas presupuestarias (**Alta**, **Media** y **Baja**).

---

## 1. Arquitectura del Sistema

```
                      ┌────────────────────────────────────────┐
                      │          Cliente / Frontend            │
                      │  (Captura foto y envía a recomendador) │
                      └──────────────────┬─────────────────────┘
                                         │
                 1. Envío de imagen Base64 (inlineData)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │    Google AI Studio (Gemini API)       │
                      │  Modelo: gemini-2.5-flash              │
                      │  Output: JSON estructurado             │
                      │  { rostro_detectado, subtono, resumen }│
                      └──────────────────┬─────────────────────┘
                                         │
                 2. Invocación RPC con el subtono detectado
                                         ▼
                      ┌────────────────────────────────────────┐
                      │           Supabase PostgreSQL          │
                      │  Función RPC:                          │
                      │  recomendar_maquillaje_por_subtono()   │
                      │  - Normalización de tildes             │
                      │  - Ventana: ROW_NUMBER() PARTITION BY  │
                      │  - Fallback: Exacto > Universal > Any  │
                      └──────────────────┬─────────────────────┘
                                         │
                 3. Retorno de exactamente 3 productos
                                         ▼
                      ┌────────────────────────────────────────┐
                      │   Recomendación Lista:                 │
                      │   - 1 Producto Gama Alta               │
                      │   - 1 Producto Gama Media              │
                      │   - 1 Producto Gama Baja               │
                      └────────────────────────────────────────┘
```

---

## 2. Estructura de Archivos (`./backend`)

Todos los artefactos del backend residen estrictamente dentro del directorio `./backend`:

| Archivo | Tipo | Propósito |
|---|---|---|
| `01_schema.sql` | DDL | Crea la tabla `productos_maquillaje`, restricciones CHECK, índices B-Tree, y habilita RLS con política SELECT para rol `anon`. |
| `02_seed.sql` | DML | Inserción idempotente (`ON CONFLICT DO UPDATE`) de 12 productos cosméticos reales distribuidos en matriz 3x4 (Alta, Media, Baja × Cálido, Frío, Neutro, Universal). |
| `03_rpc.sql` | PL/pgSQL | Procedimiento almacenado `recomendar_maquillaje_por_subtono` con normalización diacrítica, priorización jerárquica y garantía de 3 recomendaciones. |
| `gemini_api_spec.json` | OpenAPI 3.0 | Contrato OpenAPI exhaustivo que documenta el endpoint, autenticación, payload con `inlineData` Base64 y `responseSchema` estructurado. |
| `gemini_request.curl` | Bash/cURL | Script ejecutable de terminal para probar la API de Gemini 2.5 Flash de forma interactiva con autenticación y payload de prueba. |
| `verify_backend.js` | Node.js | Suite de pruebas automatizadas estáticas y simulación de cruce algorítmico que valida la integridad de todos los archivos sin requerir conexión a internet. |
| `README.md` | Markdown | Esta guía integral de despliegue, referencia técnica y pruebas. |

---

## 3. Guía de Despliegue en Supabase

Para desplegar la base de datos en un proyecto nuevo o existente de Supabase:

### Paso 1: Acceder al SQL Editor
1. Inicie sesión en la consola de [Supabase](https://supabase.com/dashboard).
2. Seleccione su proyecto y navegue a la sección **SQL Editor** en la barra lateral izquierda.

### Paso 2: Ejecutar Esquema y Seguridad (`01_schema.sql`)
1. Abra una nueva consulta SQL.
2. Copie y pegue el contenido completo de `backend/01_schema.sql`.
3. Presione el botón **Run**.
4. **Verificación:** La tabla `public.productos_maquillaje` habrá sido creada con RLS activado y con política de lectura pública.

### Paso 3: Insertar Catálogo de Prueba (`02_seed.sql`)
1. Abra una nueva pestaña en el SQL Editor.
2. Copie y pegue el contenido de `backend/02_seed.sql`.
3. Presione **Run**.
4. **Verificación:** Se insertarán 12 registros cosméticos de marcas como Dior, Estée Lauder, Giorgio Armani, Fenty Beauty, MAC, Maybelline, L'Oréal, e.l.f., etc. La sentencia es idempotente y puede ejecutarse repetidamente sin duplicar filas.

### Paso 4: Crear la Función de Recomendación (`03_rpc.sql`)
1. Abra una nueva pestaña en el SQL Editor.
2. Copie y pegue el contenido de `backend/03_rpc.sql`.
3. Presione **Run**.
4. **Verificación:** La función `public.recomendar_maquillaje_por_subtono(subtono TEXT)` queda compilada y registrada en el esquema público con permisos concedidos a `anon`, `authenticated` y `service_role`.

---

## 4. Consultas SQL de Verificación (Supabase Dashboard)

Ejecute las siguientes consultas en el SQL Editor para certificar el correcto funcionamiento:

```sql
-- 1. Contar productos totales (debe devolver 12)
SELECT count(*) AS total_productos FROM public.productos_maquillaje;

-- 2. Inspeccionar la distribución por gama y subtono (4 por cada gama)
SELECT gama, subtono_recomendado, count(*) 
FROM public.productos_maquillaje 
GROUP BY gama, subtono_recomendado 
ORDER BY gama, subtono_recomendado;

-- 3. Probar recomendación para subtono Cálido
SELECT id, nombre, marca, gama, subtono_recomendado, precio 
FROM public.recomendar_maquillaje_por_subtono('Cálido');

-- 4. Probar insensibilidad a minúsculas y acentos ('frio' sin tilde)
SELECT id, nombre, marca, gama, subtono_recomendado, precio 
FROM public.recomendar_maquillaje_por_subtono('frio');

-- 5. Probar subtono 'Neutro'
SELECT id, nombre, marca, gama, subtono_recomendado, precio 
FROM public.recomendar_maquillaje_por_subtono('Neutro');

-- 6. Probar fallback ante subtono desconocido (devuelve los 3 productos universales)
SELECT id, nombre, marca, gama, subtono_recomendado, precio 
FROM public.recomendar_maquillaje_por_subtono('Desconocido');

-- 7. Verificar seguridad RLS simulando rol anónimo
SET ROLE anon;
SELECT count(*) FROM public.productos_maquillaje; -- Debe permitir lectura (12 filas)
-- El siguiente intento de inserción debe fallar con error de RLS (42501):
-- INSERT INTO public.productos_maquillaje (nombre, marca, gama, subtono_recomendado, precio, tienda_nombre, link_compra, imagen_url)
-- VALUES ('Hack', 'X', 'Baja', 'Cálido', 1, 'T', 'https://a.com', 'https://b.com');
RESET ROLE;
```

---

## 5. Integración con Google AI Studio (Gemini API)

### 5.1 Obtención de API Key
1. Diríjase a [Google AI Studio](https://aistudio.google.com/).
2. Inicie sesión con su cuenta de Google y haga clic en **Get API key**.
3. Cree una nueva clave en un proyecto nuevo o existente de Google Cloud.

### 5.2 Estructura de la Solicitud HTTP
- **URL Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Método:** `POST`
- **Cabeceras:**
  - `Content-Type: application/json`
  - `x-goog-api-key: TU_GEMINI_API_KEY`

### 5.3 Ejecución con cURL
En sistemas tipo Unix (Linux / macOS / Git Bash):
```bash
export GEMINI_API_KEY="AIzaSyTuClaveReal..."
bash backend/gemini_request.curl
```

En Windows PowerShell:
```powershell
$env:GEMINI_API_KEY="AIzaSyTuClaveReal..."
bash backend/gemini_request.curl
```

### 5.4 Procesamiento de la Respuesta en el Cliente
Gemini responderá con una envoltura JSON estándar donde la respuesta generada se encuentra en `candidates[0].content.parts[0].text`:

```javascript
// Parseo de la respuesta de Gemini en Node.js o TypeScript
const geminiResponse = await response.json();
const rawText = geminiResponse.candidates[0].content.parts[0].text;
const analysis = JSON.parse(rawText);

console.log(analysis);
// {
//   rostro_detectado: true,
//   subtono: "Cálido",
//   resumen_breve: "Se observan matices dorados en las mejillas y el contorno facial..."
// }

if (!analysis.rostro_detectado) {
  alert("No se detectó un rostro en la fotografía. Por favor suba una foto nítida.");
} else {
  // Continuar con la llamada a Supabase RPC
  obtenerRecomendaciones(analysis.subtono);
}
```

---

## 6. Consumo de la Función RPC desde el Cliente

### 6.1 Usando el SDK Oficial de Supabase (`@supabase/supabase-js`)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://TU_PROYECTO.supabase.co', 'TU_ANON_KEY');

async function obtenerRecomendaciones(subtonoDetectado: string) {
  const { data: productos, error } = await supabase.rpc('recomendar_maquillaje_por_subtono', {
    subtono: subtonoDetectado
  });

  if (error) {
    console.error('Error al consultar recomendaciones:', error.message);
    return;
  }

  // 'productos' es un array garantizado de 3 elementos:
  // [0] -> Gama Alta
  // [1] -> Gama Media
  // [2] -> Gama Baja
  console.log('Recomendación Gama Alta:', productos[0]);
  console.log('Recomendación Gama Media:', productos[1]);
  console.log('Recomendación Gama Baja:', productos[2]);
}
```

### 6.2 Usando HTTP REST Directo (PostgREST)
```http
POST https://<project-ref>.supabase.co/rest/v1/rpc/recomendar_maquillaje_por_subtono HTTP/1.1
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json

{
  "subtono": "Cálido"
}
```

---

## 7. Ejecución de la Suite de Verificación Automatizada

El backend incluye una suite de pruebas automatizadas estáticas y de simulación algorítmica (`verify_backend.js`) que verifica:
1. Existencia física y contenido de los 7 archivos requeridos.
2. Cumplimiento de DDL: restricciones CHECK, tipos de datos, UUID y RLS en `01_schema.sql`.
3. Integridad del catálogo en `02_seed.sql`: 12 productos reales sin valores nulos, precios positivos, URLs HTTPS y distribución simétrica (4 Alta, 4 Media, 4 Baja).
4. Sintaxis y funciones en `03_rpc.sql`: función window `ROW_NUMBER()`, normalización de tildes y concesión de permisos.
5. Validez del contrato OpenAPI en `gemini_api_spec.json`: parseo JSON limpio, propiedades `rostro_detectado`, `subtono`, `resumen_breve` y esquema de cabeceras.
6. Validez del script ejecutable `gemini_request.curl`.
7. **Simulación Algorítmica RPC:** Ejecución de 8 escenarios de prueba sobre el catálogo seed (coincidencias exactas, insensibilidad a tildes/mayúsculas, directos universales, parámetros desconocidos y nulos).

### Comando de Ejecución:
Desde el directorio raíz del proyecto:
```bash
node backend/verify_backend.js
```

### Salida Esperada:
```text
============================================================
SUITE DE VERIFICACION AUTOMATIZADA: BACKEND MAQUILLAJE
============================================================
[PASS] Archivo presente: 01_schema.sql
[PASS] Archivo presente: 02_seed.sql
[PASS] Archivo presente: 03_rpc.sql
[PASS] Archivo presente: gemini_api_spec.json
[PASS] Archivo presente: gemini_request.curl
[PASS] Archivo presente: README.md
[PASS] Archivo presente: verify_backend.js
...
RESULTADO GLOBAL: 100% DE PRUEBAS SUPERADAS EXITOSAMENTE
============================================================
```

---

## 8. Decisiones de Diseño y Resiliencia

1. **Uso de `gen_random_uuid()` nativo:** Se utiliza la función nativa de PostgreSQL 13+ evitando extensiones obsoletas (`uuid-ossp`).
2. **Restricción `CHECK` sobre tipo `TEXT`:** Simplifica la serialización JSON en PostgREST y evita errores de migración con enums PostgreSQL.
3. **Normalización Diacrítica en Base de Datos:** Los modelos de IA pueden omitir tildes (`calido` vs `cálido`). La función `translate(lower(trim(...)), 'áéíóú', 'aeiou')` normaliza las entradas de forma determinista y ultrarrápida.
4. **Cascada de Fallback Tripartita:** El algoritmo de ventana particionada garantiza que el usuario siempre reciba 3 recomendaciones válidas (1 de cada gama), recurriendo a productos de formulación 'Universal' o al catálogo de la gama si el subtono solicitado es atípico.
