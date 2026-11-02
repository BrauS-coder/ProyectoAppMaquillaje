-- =============================================================================
-- PROYECTO: Backend Recomendador de Maquillaje (Supabase + Gemini API)
-- ARCHIVO: 01_schema.sql
-- DESCRIPCIÓN: Definición de tabla, restricciones, índices y políticas RLS
-- =============================================================================

-- 1. Habilitar extensión para generación de identificadores únicos (si aplica)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Creación de la tabla productos_maquillaje
CREATE TABLE IF NOT EXISTS public.productos_maquillaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    marca TEXT NOT NULL,
    gama TEXT NOT NULL,
    subtono_recomendado TEXT NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    tienda_nombre TEXT NOT NULL,
    link_compra TEXT NOT NULL,
    imagen_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Restricciones de integridad de datos
    CONSTRAINT check_nombre_no_vacio CHECK (char_length(trim(nombre)) > 0),
    CONSTRAINT check_marca_no_vacio CHECK (char_length(trim(marca)) > 0),
    CONSTRAINT check_gama_valida CHECK (gama IN ('Alta', 'Media', 'Baja')),
    CONSTRAINT check_subtono_valido CHECK (subtono_recomendado IN ('Cálido', 'Frío', 'Neutro', 'Universal')),
    CONSTRAINT check_precio_positivo CHECK (precio >= 0),
    CONSTRAINT check_link_compra_url CHECK (link_compra ~* '^https?://'),
    CONSTRAINT check_imagen_url CHECK (imagen_url ~* '^https?://')
);

-- 3. Metadatos y comentarios descriptivos (OpenAPI / Supabase Studio)
COMMENT ON TABLE public.productos_maquillaje IS 'Catálogo de productos de maquillaje categorizados por gama y subtono cutáneo';
COMMENT ON COLUMN public.productos_maquillaje.id IS 'Identificador universal único del producto (UUID v4)';
COMMENT ON COLUMN public.productos_maquillaje.nombre IS 'Nombre comercial completo del producto y variante/tono';
COMMENT ON COLUMN public.productos_maquillaje.marca IS 'Fabricante o marca oficial del cosmético';
COMMENT ON COLUMN public.productos_maquillaje.gama IS 'Gama socioeconómica del cosmético: Alta, Media o Baja';
COMMENT ON COLUMN public.productos_maquillaje.subtono_recomendado IS 'Subtono de piel objetivo: Cálido, Frío, Neutro o Universal';
COMMENT ON COLUMN public.productos_maquillaje.precio IS 'Precio oficial de venta al público en USD (>= 0)';
COMMENT ON COLUMN public.productos_maquillaje.tienda_nombre IS 'Nombre del minorista o tienda oficial autorizada';
COMMENT ON COLUMN public.productos_maquillaje.link_compra IS 'Enlace directo seguro (HTTPS) para la adquisición del producto';
COMMENT ON COLUMN public.productos_maquillaje.imagen_url IS 'URL segura (HTTPS) a la imagen oficial del producto';
COMMENT ON COLUMN public.productos_maquillaje.created_at IS 'Fecha y hora UTC de registro del producto en el catálogo';

-- 4. Índices de rendimiento optimizados para filtrado y ordenamiento en RPC
CREATE INDEX IF NOT EXISTS idx_productos_maquillaje_gama_subtono 
    ON public.productos_maquillaje (gama, subtono_recomendado);

CREATE INDEX IF NOT EXISTS idx_productos_maquillaje_subtono 
    ON public.productos_maquillaje (subtono_recomendado);

-- 5. Configuración de Row Level Security (RLS)
ALTER TABLE public.productos_maquillaje ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas para garantizar idempotencia en migraciones
DROP POLICY IF EXISTS "Permitir lectura publica de productos_maquillaje" ON public.productos_maquillaje;

-- Política permisiva para SELECT público (roles anon y authenticated)
CREATE POLICY "Permitir lectura publica de productos_maquillaje"
    ON public.productos_maquillaje
    FOR SELECT
    TO anon, authenticated
    USING (true);
