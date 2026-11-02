-- =============================================================================
-- PROYECTO: Backend Recomendador de Maquillaje (Supabase + Gemini API)
-- ARCHIVO: 03_rpc.sql
-- DESCRIPCIÓN: Función RPC para recomendación jerárquica por subtono
-- =============================================================================

-- Función de cruce: recomendar_maquillaje_por_subtono
-- Devuelve exactamente 3 productos (1 Alta, 1 Media, 1 Baja) con prioridad:
-- Prioridad 1: Coincidencia de subtono (insensible a mayúsculas y acentos)
-- Prioridad 2: Subtono 'Universal'
-- Prioridad 3: Cualquier producto de esa gama (garantía de no vacuidad)
CREATE OR REPLACE FUNCTION public.recomendar_maquillaje_por_subtono(subtono TEXT DEFAULT 'Universal')
RETURNS SETOF public.productos_maquillaje
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_subtono_clean TEXT;
BEGIN
    -- Limpieza y normalización del parámetro de entrada (sin acentos, minúsculas, sin espacios)
    v_subtono_clean := translate(lower(trim(coalesce(nullif(subtono, ''), 'Universal'))), 'áéíóú', 'aeiou');

    RETURN QUERY
    WITH ranked_products AS (
        SELECT
            p.id,
            p.nombre,
            p.marca,
            p.gama,
            p.subtono_recomendado,
            p.precio,
            p.tienda_nombre,
            p.link_compra,
            p.imagen_url,
            p.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY p.gama
                ORDER BY
                    CASE
                        -- 1. Coincidencia exacta con el subtono solicitado (normalizado sin tildes)
                        WHEN translate(lower(trim(p.subtono_recomendado)), 'áéíóú', 'aeiou') = v_subtono_clean THEN 1
                        -- 2. Fallback a subtono 'Universal'
                        WHEN translate(lower(trim(p.subtono_recomendado)), 'áéíóú', 'aeiou') = 'universal' THEN 2
                        -- 3. Fallback de contingencia a cualquier otro producto de la misma gama
                        ELSE 3
                    END ASC,
                    -- Desempate determinista por precio y luego por ID
                    p.precio ASC,
                    p.id ASC
            ) AS rn
        FROM public.productos_maquillaje p
    )
    SELECT
        rp.id,
        rp.nombre,
        rp.marca,
        rp.gama,
        rp.subtono_recomendado,
        rp.precio,
        rp.tienda_nombre,
        rp.link_compra,
        rp.imagen_url,
        rp.created_at
    FROM ranked_products rp
    WHERE rp.rn = 1
    ORDER BY
        CASE rp.gama
            WHEN 'Alta' THEN 1
            WHEN 'Media' THEN 2
            WHEN 'Baja' THEN 3
            ELSE 4
        END ASC;
END;
$$;

-- Metadatos de documentación para PostgREST / Supabase API
COMMENT ON FUNCTION public.recomendar_maquillaje_por_subtono(TEXT)
    IS 'Devuelve 3 recomendaciones de maquillaje (1 Alta, 1 Media, 1 Baja) compatibles con el subtono provisto';

-- Concesión de privilegios de ejecución para clientes anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.recomendar_maquillaje_por_subtono(TEXT) TO anon, authenticated, service_role;
