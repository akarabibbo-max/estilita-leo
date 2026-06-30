// ════════════════════════════════════════════════════════════════
//  db.js  ─  Memoria persistente de LEO (PostgreSQL en Railway)
// ────────────────────────────────────────────────────────────────
//  Este módulo maneja TODA la conversación con la base de datos.
//  Diseño defensivo: si la base no está disponible, las funciones
//  no rompen LEO — devuelven null/false y LEO sigue funcionando con
//  su memoria de siempre. La base es una mejora, no un punto de falla.
// ════════════════════════════════════════════════════════════════

const { Pool } = require("pg");

// Railway provee DATABASE_URL automáticamente cuando la base está conectada.
const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
let dbLista = false;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    // Railway usa SSL pero con certificados internos; esto evita errores de conexión.
    ssl: DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("[DB] Error inesperado en el pool:", err.message);
  });
} else {
  console.warn("[DB] DATABASE_URL no está definida. LEO funcionará SIN memoria persistente.");
}

// ── Crear las 3 tablas si no existen ──────────────────────────────
async function inicializar() {
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        telefono     TEXT PRIMARY KEY,
        nombre       TEXT,
        direccion    TEXT,
        primer_pedido TIMESTAMPTZ DEFAULT now(),
        ultimo_pedido TIMESTAMPTZ,
        total_pedidos INTEGER DEFAULT 0,
        notas        TEXT
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id           SERIAL PRIMARY KEY,
        telefono     TEXT,
        nombre       TEXT,
        items        JSONB,
        total        NUMERIC,
        modo         TEXT,
        direccion    TEXT,
        pago         TEXT,
        estado       TEXT DEFAULT 'registrado',
        creado       TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock (
        producto     TEXT PRIMARY KEY,
        disponible   BOOLEAN DEFAULT true,
        actualizado  TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS precios (
        producto     TEXT PRIMARY KEY,
        precio       NUMERIC NOT NULL,
        actualizado  TIMESTAMPTZ DEFAULT now()
      );
    `);
    dbLista = true;
    console.log("[DB] Tablas listas (clientes, pedidos, stock).");
    return true;
  } catch (e) {
    console.error("[DB] No se pudieron crear las tablas:", e.message);
    dbLista = false;
    return false;
  }
}

// ── CLIENTES ──────────────────────────────────────────────────────
async function buscarCliente(telefono) {
  if (!dbLista) return null;
  try {
    const r = await pool.query("SELECT * FROM clientes WHERE telefono = $1", [telefono]);
    return r.rows[0] || null;
  } catch (e) {
    console.error("[DB] buscarCliente:", e.message);
    return null;
  }
}

async function guardarCliente(telefono, nombre, direccion) {
  if (!dbLista) return false;
  try {
    await pool.query(
      `INSERT INTO clientes (telefono, nombre, direccion, ultimo_pedido, total_pedidos)
       VALUES ($1, $2, $3, now(), 1)
       ON CONFLICT (telefono) DO UPDATE SET
         nombre = COALESCE(EXCLUDED.nombre, clientes.nombre),
         direccion = COALESCE(EXCLUDED.direccion, clientes.direccion),
         ultimo_pedido = now(),
         total_pedidos = clientes.total_pedidos + 1`,
      [telefono, nombre || null, direccion || null]
    );
    return true;
  } catch (e) {
    console.error("[DB] guardarCliente:", e.message);
    return false;
  }
}

// ── PEDIDOS ───────────────────────────────────────────────────────
async function registrarPedido(p) {
  if (!dbLista) return false;
  try {
    await pool.query(
      `INSERT INTO pedidos (telefono, nombre, items, total, modo, direccion, pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        p.telefono,
        p.nombre || null,
        JSON.stringify(p.items || []),
        p.total || null,
        p.modo || null,
        p.direccion || null,
        p.pago || null,
      ]
    );
    return true;
  } catch (e) {
    console.error("[DB] registrarPedido:", e.message);
    return false;
  }
}

async function pedidosDeCliente(telefono, limite = 5) {
  if (!dbLista) return [];
  try {
    const r = await pool.query(
      "SELECT * FROM pedidos WHERE telefono = $1 ORDER BY creado DESC LIMIT $2",
      [telefono, limite]
    );
    return r.rows;
  } catch (e) {
    console.error("[DB] pedidosDeCliente:", e.message);
    return [];
  }
}

// ── STOCK ─────────────────────────────────────────────────────────
async function cargarStockDB() {
  if (!dbLista) return null;
  try {
    const r = await pool.query("SELECT producto, disponible FROM stock");
    const out = {};
    for (const row of r.rows) out[row.producto] = row.disponible;
    return out;
  } catch (e) {
    console.error("[DB] cargarStockDB:", e.message);
    return null;
  }
}

async function guardarStockItem(producto, disponible) {
  if (!dbLista) return false;
  try {
    await pool.query(
      `INSERT INTO stock (producto, disponible, actualizado)
       VALUES ($1, $2, now())
       ON CONFLICT (producto) DO UPDATE SET disponible = $2, actualizado = now()`,
      [producto, disponible]
    );
    return true;
  } catch (e) {
    console.error("[DB] guardarStockItem:", e.message);
    return false;
  }
}

// Migra un objeto de stock entero {producto: disponible} a la base (una sola vez).
async function migrarStock(stockObj) {
  if (!dbLista || !stockObj) return false;
  try {
    const productos = Object.keys(stockObj);
    if (productos.length === 0) return true;
    // ¿Ya hay stock en la base? Si sí, no piso nada.
    const ya = await pool.query("SELECT COUNT(*) FROM stock");
    if (parseInt(ya.rows[0].count, 10) > 0) {
      console.log("[DB] El stock ya estaba en la base, no se migra de nuevo.");
      return true;
    }
    for (const prod of productos) {
      await guardarStockItem(prod, stockObj[prod]);
    }
    console.log(`[DB] Stock migrado a la base: ${productos.length} productos.`);
    return true;
  } catch (e) {
    console.error("[DB] migrarStock:", e.message);
    return false;
  }
}

function estaDisponibleDB() {
  return dbLista;
}

// ── PRECIOS MODIFICADOS ───────────────────────────────────
// Guarda un precio cambiado por el dueño. Queda permanente (no se borra al reiniciar).
async function guardarPrecio(producto, precio) {
  if (!dbLista) return false;
  try {
    await pool.query(
      `INSERT INTO precios (producto, precio, actualizado)
       VALUES ($1, $2, now())
       ON CONFLICT (producto) DO UPDATE SET precio = $2, actualizado = now()`,
      [producto, precio]
    );
    return true;
  } catch (e) {
    console.error("[DB] guardarPrecio:", e.message);
    return false;
  }
}

// Trae todos los precios modificados como {producto: precio}.
async function cargarPreciosDB() {
  if (!dbLista) return null;
  try {
    const r = await pool.query("SELECT producto, precio FROM precios");
    const out = {};
    for (const row of r.rows) out[row.producto] = Number(row.precio);
    return out;
  } catch (e) {
    console.error("[DB] cargarPreciosDB:", e.message);
    return null;
  }
}

module.exports = {
  inicializar,
  buscarCliente,
  guardarCliente,
  registrarPedido,
  pedidosDeCliente,
  cargarStockDB,
  guardarStockItem,
  migrarStock,
  estaDisponibleDB,
  guardarPrecio,
  cargarPreciosDB,
};
