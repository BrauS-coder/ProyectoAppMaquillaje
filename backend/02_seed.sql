-- =============================================================================
-- PROYECTO: Backend Recomendador de Maquillaje (Supabase + Gemini API)
-- ARCHIVO: 02_seed.sql
-- DESCRIPCIÓN: Catálogo inicial de 12 productos reales (4 Alta, 4 Media, 4 Baja)
-- =============================================================================

INSERT INTO public.productos_maquillaje (
    id,
    nombre,
    marca,
    gama,
    subtono_recomendado,
    precio,
    tienda_nombre,
    link_compra,
    imagen_url
) VALUES
    -- =========================================================================
    -- GAMA ALTA (Luxury / Prestige)
    -- =========================================================================
    (
        'a0000000-0000-0000-0000-000000000001',
        'Dior Forever Skin Glow Foundation - 2W Warm',
        'Dior',
        'Alta',
        'Cálido',
        55.00,
        'Sephora',
        'https://www.sephora.com/product/dior-forever-skin-glow-foundation-P479707',
        'https://www.sephora.com/productimages/sku/s2507812-main-zoom.jpg'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Double Wear Stay-in-Place Foundation - 2C3 Fresco',
        'Estée Lauder',
        'Alta',
        'Frío',
        49.00,
        'Ulta Beauty',
        'https://www.ulta.com/p/double-wear-stay-in-place-foundation-xlsImpprod14641507',
        'https://media.ulta.com/i/ulta/2290610'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Luminous Silk Perfect Glow Foundation - 5.5 Neutral',
        'Giorgio Armani',
        'Alta',
        'Neutro',
        69.00,
        'Sephora',
        'https://www.sephora.com/product/luminous-silk-foundation-P39340',
        'https://www.sephora.com/productimages/sku/s2065308-main-zoom.jpg'
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'Hollywood Flawless Filter Complexion Booster',
        'Charlotte Tilbury',
        'Alta',
        'Universal',
        49.00,
        'Sephora',
        'https://www.sephora.com/product/hollywood-flawless-filter-P434104',
        'https://www.sephora.com/productimages/sku/s2430155-main-zoom.jpg'
    ),

    -- =========================================================================
    -- GAMA MEDIA (Mid-Range / Premium Consumer)
    -- =========================================================================
    (
        'b0000000-0000-0000-0000-000000000001',
        'Pro Filt''r Soft Matte Longwear Foundation - 210 Warm',
        'Fenty Beauty',
        'Media',
        'Cálido',
        40.00,
        'Sephora',
        'https://www.sephora.com/product/pro-filtr-soft-matte-longwear-foundation-P879854',
        'https://www.sephora.com/productimages/sku/s2110823-main-zoom.jpg'
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'Studio Fix Fluid SPF 15 24HR Matte Foundation - NW20',
        'MAC Cosmetics',
        'Media',
        'Frío',
        44.00,
        'Ulta Beauty',
        'https://www.ulta.com/p/studio-fix-fluid-spf-15-24hr-matte-foundation-pimprod2043657',
        'https://media.ulta.com/i/ulta/2619426'
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'Liquid Touch Weightless Foundation - 210N Neutral',
        'Rare Beauty',
        'Media',
        'Neutro',
        30.00,
        'Sephora',
        'https://www.sephora.com/product/rare-beauty-liquid-touch-weightless-foundation-P462719',
        'https://www.sephora.com/productimages/sku/s2361533-main-zoom.jpg'
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'Eaze Drop Blurring Skin Tint - Adaptable Sheer',
        'Fenty Beauty',
        'Media',
        'Universal',
        36.00,
        'Sephora',
        'https://www.sephora.com/product/eaze-drop-blurring-skin-tint-P469854',
        'https://www.sephora.com/productimages/sku/s2431872-main-zoom.jpg'
    ),

    -- =========================================================================
    -- GAMA BAJA (Drugstore / Affordable)
    -- =========================================================================
    (
        'c0000000-0000-0000-0000-000000000001',
        'Fit Me Matte + Poreless Foundation - 220 Natural Beige',
        'Maybelline New York',
        'Baja',
        'Cálido',
        10.99,
        'Target',
        'https://www.target.com/p/maybelline-fit-me-matte-poreless-liquid-foundation/-/A-16601140',
        'https://target.scene7.com/is/image/Target/GUEST_6a4e3fa3-2059-4ee2-841f-d31e5bb09f19'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'True Match Super-Blendable Foundation - C3 Creamy Natural',
        'L''Oréal Paris',
        'Baja',
        'Frío',
        13.99,
        'Amazon',
        'https://www.amazon.com/dp/B0BNLXZQ5D',
        'https://m.media-amazon.com/images/I/71Y0+3QyXwL._SL1500_.jpg'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'Camo CC Cream - Medium 330N Neutral',
        'e.l.f. Cosmetics',
        'Baja',
        'Neutro',
        15.00,
        'Ulta Beauty',
        'https://www.ulta.com/p/camo-cc-cream-pimprod2021020',
        'https://media.ulta.com/i/ulta/2573212'
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'Bare Focus Tinted Hydrator Skin Tint',
        'Wet n Wild',
        'Baja',
        'Universal',
        6.49,
        'Amazon',
        'https://www.amazon.com/dp/B08NXY5WXZ',
        'https://m.media-amazon.com/images/I/61kM5qQx-jL._SL1500_.jpg'
    )
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    marca = EXCLUDED.marca,
    gama = EXCLUDED.gama,
    subtono_recomendado = EXCLUDED.subtono_recomendado,
    precio = EXCLUDED.precio,
    tienda_nombre = EXCLUDED.tienda_nombre,
    link_compra = EXCLUDED.link_compra,
    imagen_url = EXCLUDED.imagen_url;
