const express = require("express");
const axios = require("axios");
const db = require("./db"); // memoria persistente (PostgreSQL)
const app = express();
app.use(express.json());

// ── CONFIGURACIÓN ──────────────────────────────────────────
const CONFIG = {
  greenApi: {
    instanceId: process.env.GREEN_API_INSTANCE,
    token: process.env.GREEN_API_TOKEN,
    base: () => `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE}`,
  },
  mp: {
    accessToken: process.env.MP_ACCESS_TOKEN,
  },
  fudo: {
    user: process.env.FUDO_USER,
    pass: process.env.FUDO_PASS,
    base: "https://app.fudo.com.ar/api",
  },
  anthropic: {
    key: process.env.ANTHROPIC_API_KEY,
  },
  negocio: {
    nombre: "Estilita La Cantina",
    direccion: "Ortiz de Rosas 1001, esq. San Martín, Morón",
    horario: "todos los días 10:00 a 00:00",
    delivery: "gratis hasta 3,5 km",
    pagos: "Mercado Pago, MODO, Transferencia, Efectivo (10% OFF)",
    whatsapp: "5491131720719",
  },
  admins: ["5491127834662", "5491170665358"], // dueño y Patricia: pueden gestionar stock
};

// ── MENÚ COMPLETO ──────────────────────────────────────────
const MENU = {
  botanas: { titulo: "Botanas", items: [
    { n: "Tequeños x 12u", p: 18000 }, { n: "Tequeños x 6u", p: 11000 },
    { n: "Nachos Carne y Cheddar", p: 18000 }, { n: "Nachos Full Cheddar", p: 11000 },
    { n: "Nachos Cheddar y Panceta", p: 16000 }, { n: "Nachos Guacamole y Crema Agria", p: 18000 },
    { n: "Nachos Enchilados", p: 18000 }, { n: "Nachos Bandeja Full", p: 19000 },
    { n: "Papas Solas 700grs", p: 8000 }, { n: "Papas Chulas", p: 13000 },
    { n: "Papas Diablas", p: 14000 }, { n: "Papas Órale", p: 18000 },
    { n: "Papas Tex-Mex", p: 18000 }, { n: "Salchicuate Común", p: 13000 },
    { n: "Salchicuate Smoke", p: 13000 }, { n: "Salchicuate Tex-Mex", p: 19000 },
    { n: "Salchipower", p: 18000 },
  ]},
  tacos: { titulo: "Tacos (x3 unidades)", items: [
    { n: "Tacos Carne Salteada", p: 18000 }, { n: "Tacos Pollo Salteado", p: 18000 },
    { n: "Tacos Rancheros", p: 17000 }, { n: "Tacos Birria de Osobuco", p: 19500 },
    { n: "Tacos Cerdo Ahumado BBQ", p: 18000 }, { n: "Tacos Vegetales", p: 16000 },
    { n: "Tacos Mixto", p: 19500 }, { n: "Tacos Pastor", p: 19500 },
    { n: "Tacos Mariscos", p: 22000 }, { n: "Tacos Pulled Pork", p: 22000 },
  ]},
  burritos: { titulo: "Burritos XL", items: [
    { n: "Burrito Carne Desmechada", p: 21000 }, { n: "Burrito Carne Ranchero Clásico", p: 18000 },
    { n: "Burrito Pollo Salteado", p: 19000 }, { n: "Burrito Birria de Osobuco", p: 21000 },
    { n: "Burrito Cerdo Ahumado BBQ", p: 19000 }, { n: "Burrito Vegetales", p: 16000 },
    { n: "Burrito Chilli", p: 24000 }, { n: "Burrito Chilango", p: 21000 },
    { n: "Burrito Mazatlán", p: 19000 },
  ]},
  quesadillas: { titulo: "Quesadillas XL", items: [
    { n: "Quesadilla Carne Desmechada", p: 19500 }, { n: "Quesadilla Carne Ranchero", p: 18000 },
    { n: "Quesadilla Pollo Salteado", p: 18000 }, { n: "Quesadilla Birria de Osobuco", p: 19000 },
    { n: "Quesadilla Cerdo Ahumado BBQ", p: 18000 }, { n: "Quesadilla Vegetales", p: 18000 },
    { n: "Quesadilla Pulled Pork", p: 21000 }, { n: "Quesadilla Oaxaca", p: 16000 },
  ]},
  delacasa: { titulo: "De la Casa", items: [
    { n: "Enchiladas x3", p: 18000 }, { n: "Chilaquiles", p: 20000 }, { n: "Flautas x4", p: 18000 },
  ]},
  combos: { titulo: "Combos para Compartir", items: [
    { n: "Box Estilita XL", p: 64000 }, { n: "Box Estilita Mini", p: 57000 },
    { n: "Corona de Tacos", p: 79000 },
  ]},
  extras: { titulo: "Extras", items: [
    { n: "Guacamole", p: 6500 }, { n: "Salsa Especial", p: 5500 },
    { n: "Salsa Picante", p: 6500 }, { n: "Crema Agria", p: 5500 },
    { n: "Cheddar", p: 6000 }, { n: "Barbacoa", p: 5500 },
    { n: "Pico de Gallo", p: 5500 }, { n: "Queso Llanero o Dambo rallado", p: 6000 },
    { n: "Huevo", p: 1500 }, { n: "Panceta Crocante", p: 6500 },
    { n: "Pack de Nachos 500grs", p: 6000 }, { n: "Tortillas de trigo o maíz", p: 1500 },
  ]},
  arepas: { titulo: "Arepas Guayoyo", items: [
    { n: "Arepa 1 Relleno", p: 12000 }, { n: "Arepa 2 Rellenos", p: 13000 },
    { n: "Arepa 3 Rellenos", p: 14000 },
  ]},
  empanadas: { titulo: "Empanadas Venezolanas", items: [
    { n: "Empanada Carne Picada", p: 7000 }, { n: "Empanada Carne Mechada", p: 8000 },
    { n: "Empanada Guisado de Pollo", p: 7000 }, { n: "Empanada Pulled Pork", p: 8000 },
    { n: "Empanada Mechada y Queso Dambo", p: 8000 }, { n: "Empanada Pollo y Queso Dambo", p: 7000 },
    { n: "Empanada Jamón y Queso", p: 7000 }, { n: "Empanada Queso Llanero", p: 7000 },
    { n: "Empanada Chorizo a la Pomarola", p: 8000 }, { n: "Empanada Poroto Negro y Queso", p: 8000 },
    { n: "Empanada Plátano y Queso", p: 8000 }, { n: "Empanada Mechada, Queso y Plátano", p: 8000 },
    { n: "Empanada Panceta y Queso", p: 8000 }, { n: "Empanada Wok de Mariscos", p: 9000 },
  ]},
  cachapas: { titulo: "Cachapas Guayoyo", items: [
    { n: "Cachapa Queso Llanero", p: 11000 }, { n: "Cachapa Carne Mechada y Queso Llanero", p: 13000 },
    { n: "Cachapa Guisado de Pollo y Queso", p: 12000 }, { n: "Cachapa Pulled Pork y Queso Llanero", p: 14000 },
    { n: "Cachapa Cerdo Frito y Queso Llanero", p: 16000 },
  ]},
  pepitos: { titulo: "Pepitos Guayoyo", items: [
    { n: "Pepito Carne", p: 19000 }, { n: "Pepito Pollo", p: 19000 },
    { n: "Pepito Pulled Pork", p: 22000 }, { n: "Pepito Mixto", p: 19000 },
    { n: "Pepito Guayoyo", p: 21000 }, { n: "Pepito Mi Son XXL", p: 21000 },
  ]},
  boxesven: { titulo: "Boxes Venezolanos", items: [
    { n: "Box Caracas", p: 64000 }, { n: "Box Caracas Mini", p: 58000 },
    { n: "Box Guayoyo", p: 51000 },
  ]},
  postres: { titulo: "Postres", items: [
    { n: "Torta Tres Leches", p: 7500 }, { n: "Gelatina", p: 3500 },
    { n: "Marquesa de Maracuyá o Limón", p: 7500 },
  ]},
  bebidas: { titulo: "Bebidas sin Alcohol", items: [
    { n: "Limonada", p: 4000 }, { n: "Limonada Menta y Jengibre", p: 4500 },
    { n: "Limonada de Naranja", p: 4500 }, { n: "Limonada de Maracuyá", p: 4500 },
    { n: "Naranjada Sunrise", p: 4500 }, { n: "Licuado de Frutilla", p: 4000 },
    { n: "Licuado de Maracuyá", p: 4500 }, { n: "Licuado de Mango", p: 5000 },
    { n: "Licuado de Ananá", p: 4500 }, { n: "Té Helado Limón o Durazno", p: 4500 },
    { n: "Gaseosa Línea Coca 500ml", p: 4000 }, { n: "Gaseosa Línea Coca 1.5L", p: 10000 },
    { n: "Aquarius 500ml", p: 4000 }, { n: "Aquarius 2.5L", p: 9000 },
    { n: "Malta +58 473ml", p: 4000 }, { n: "Agua Tónica 1.5L", p: 8000 },
    { n: "Agua con Gas", p: 6000 },
  ]},
  cervezas: { titulo: "Cervezas", items: [
    { n: "Corona Porrón 330ml", p: 7500 }, { n: "Corona 710ml", p: 14000 },
    { n: "Corona Sin Alcohol 330ml", p: 7500 }, { n: "Balde x6 Porrones", p: 38000 },
    { n: "Stella Artois Lata 473ml", p: 7500 }, { n: "Stella Artois 975ml", p: 15000 },
    { n: "Brahma Lata 473ml", p: 6000 }, { n: "Brahma 975ml", p: 13000 },
    { n: "Heineken 476ml", p: 8000 }, { n: "Heineken 975ml", p: 16000 },
    { n: "Morón 975ml", p: 9000 },
  ]},
  tragos: { titulo: "Tragos y Cócteles", items: [
    { n: "Fernet con Coca", p: 7000 }, { n: "Whiscola", p: 7000 },
    { n: "Tequila José Cuervo", p: 8000 }, { n: "Tequila Nacional", p: 7000 },
    { n: "Cuba Libre", p: 8000 }, { n: "Negroni", p: 8000 },
    { n: "Mojito", p: 8000 }, { n: "Daiquiri", p: 8000 },
    { n: "Campari", p: 7000 }, { n: "Gancia", p: 7000 },
    { n: "Caipiroska", p: 7000 }, { n: "Caipirisima", p: 7000 },
    { n: "Margarita", p: 8000 }, { n: "Margarita Mango o Maracuyá", p: 8500 },
    { n: "Blue Margarita", p: 9000 }, { n: "Margarita Bulldog", p: 9500 },
    { n: "Gin Tonic", p: 9000 }, { n: "Pink Tonic", p: 9000 },
    { n: "Purple Tonic", p: 9000 },
  ]},
};

const menuTexto = Object.values(MENU).map(cat => {
  const items = cat.items.map(i => `  - ${i.n}: $${i.p.toLocaleString("es-AR")}`).join("\n");
  return `*${cat.titulo}*\n${items}`;
}).join("\n\n");

// ── STOCK (disponibilidad de productos) ───────────────────
const fs = require("fs");
const STOCK_FILE = "/tmp/stock.json";

function cargarStock() {
  try {
    return JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
  } catch {
    return {}; // vacío = todo disponible
  }
}

function guardarStock(stock) {
  fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2));
  // También persistir en la base, para que no se pierda al reiniciar.
  // No usamos await acá para no frenar la respuesta al admin; corre en segundo plano.
  if (db.estaDisponibleDB()) {
    for (const producto of Object.keys(stock)) {
      db.guardarStockItem(producto, stock[producto]).catch(() => {});
    }
  }
}

let STOCK = cargarStock(); // { "Tacos Mariscos": false } = sin stock

// Carga inicial de stock según planilla Fudo del 18/06/2026 (solo la primera vez que arranca el servidor)
if (Object.keys(STOCK).length === 0) {
  const sinStockHoy = [
    "Agua Tónica 1.5L",
    "Burrito Vegetales",
    "Brahma 975ml",
    "Corona Sin Alcohol 330ml",
    "Heineken 476ml",
    "Stella Artois Lata 473ml",
    "Empanada Jamón y Queso",
    "Panceta Crocante",
    "Pepito Guayoyo",
    "Pepito Mixto",
    "Torta Tres Leches",
    "Tacos Vegetales",
  ];
  sinStockHoy.forEach(p => { STOCK[p] = false; });
  guardarStock(STOCK);
  console.log(`[STOCK] Carga inicial aplicada: ${sinStockHoy.length} productos sin stock`);
}

function estaDisponible(nombreProducto) {
  return STOCK[nombreProducto] !== false;
}

function listaTodosLosProductos() {
  const lista = [];
  Object.values(MENU).forEach(cat => cat.items.forEach(i => lista.push(i.n)));
  return lista;
}

function buscarProductoPorNombreAproximado(texto) {
  const textoLower = texto.toLowerCase();
  const todos = listaTodosLosProductos();
  // match exacto primero
  let match = todos.find(n => textoLower.includes(n.toLowerCase()));
  if (match) return match;
  // match parcial por palabras clave
  const palabras = textoLower.split(/\s+/).filter(p => p.length > 3);
  match = todos.find(n => {
    const nLower = n.toLowerCase();
    return palabras.some(p => nLower.includes(p));
  });
  return match || null;
}

function menuTextoConStock() {
  return Object.values(MENU).map(cat => {
    const items = cat.items
      .filter(i => estaDisponible(i.n))
      .map(i => `  - ${i.n}: $${i.p.toLocaleString("es-AR")}`)
      .join("\n");
    if (!items) return null;
    return `*${cat.titulo}*\n${items}`;
  }).filter(Boolean).join("\n\n");
}

// ── ESTADO DE CONVERSACIONES ──────────────────────────────
const sesiones = {}; // { [phone]: { historial, carrito, estado, nombre, direccion, modo } }

function getSesion(phone) {
  if (!sesiones[phone]) {
    sesiones[phone] = { historial: [], carrito: [], estado: "inicio", nombre: null, direccion: null, modo: null };
  }
  return sesiones[phone];
}

// ── COMANDOS DE ADMINISTRADOR (stock) ─────────────────────
function esAdmin(phone) {
  return CONFIG.admins.includes(phone);
}

async function manejarComandoAdmin(phone, texto) {
  const textoLower = texto.toLowerCase();

  const esQuitar = /sac|quit|no hay|se acab|agot|elimin|baj/i.test(textoLower);
  const esPoner = /volv|pon|hay de nuevo|repon|activ|disponible de nuevo|agreg/i.test(textoLower);

  if (!esQuitar && !esPoner) return null; // no es un comando de stock, seguir flujo normal

  const producto = buscarProductoPorNombreAproximado(texto);
  if (!producto) {
    return `No identifiqué el producto. Decime el nombre tal cual está en el menú, ej: "sacá Tacos Mariscos".`;
  }

  if (esQuitar) {
    STOCK[producto] = false;
    guardarStock(STOCK);
    return `Listo, saqué *${producto}* del menú. No se va a ofrecer hasta que avises que volvió.`;
  } else {
    STOCK[producto] = true;
    guardarStock(STOCK);
    return `Listo, *${producto}* está disponible de nuevo.`;
  }
}

// ── CLAUDE ─────────────────────────────────────────────────
async function consultarClaude(phone, mensajeUsuario) {
  const sesion = getSesion(phone);

  const systemPrompt = `Sos LEO, el asistente virtual de ${CONFIG.negocio.nombre}.
Sos simpático, eficiente y hablás en argentino (usá "vos", "che", etc.).
Atendés pedidos de comida mexicana y venezolana para delivery o retiro en local.

DATOS DEL LOCAL:
- Dirección: ${CONFIG.negocio.direccion}
- Horario: ${CONFIG.negocio.horario}
- Delivery: ${CONFIG.negocio.delivery}
- Medios de pago: ${CONFIG.negocio.pagos}

MENÚ COMPLETO CON PRECIOS:
${menuTextoConStock()}

ESTADO ACTUAL DEL CLIENTE:
- Carrito: ${sesion.carrito.length === 0 ? "vacío" : sesion.carrito.map(i => `${i.cantidad}x ${i.nombre} ($${(i.precio * i.cantidad).toLocaleString("es-AR")})`).join(", ")}
- Total: $${sesion.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0).toLocaleString("es-AR")}
- Modo: ${sesion.modo || "no definido aún"}
- Nombre: ${sesion.nombre || "no dado aún"}
- Dirección: ${sesion.direccion || "no dada aún"}

FLUJO QUE DEBÉS SEGUIR:
1. Saludar y preguntar si quiere delivery o retiro en local
2. Tomar el pedido (podés agregar varios ítems)
3. Confirmar el pedido con total
4. Si es delivery: pedir nombre y dirección
5. Si es retiro: pedir nombre
6. Preguntar el medio de pago (MP, MODO, Transferencia, Efectivo)
7. Si elige MP/MODO/Transferencia: decirle que le mandás el link de pago
8. Si elige Efectivo: recordarle el 10% de descuento
9. Confirmar y cerrar el pedido

REGLAS:
- Solo vendés lo que está en el menú, con los precios exactos
- Si te piden algo que no está, decí que no tenés
- Si el cliente quiere agregar más ítems, actualizá el carrito
- Cuando el pedido esté confirmado, terminá tu respuesta con: [PEDIDO_LISTO]
- Cuando necesites generar el link de pago, terminá con: [GENERAR_PAGO]
- Cuando el pedido esté pagado y listo para cocina, terminá con: [ENVIAR_FUDO]
- No uses markdown, emojis con moderación, respuestas cortas y directas
- IMPORTANTE: Si este es el PRIMER mensaje del cliente (saludo tipo "hola", "buenas", etc.) y todavía no hay nada en el carrito, respondé presentándote brevemente como LEO de Estilita y preguntá directamente: "¿Querés delivery o retirás en el local?" — y ofrecé mostrar el menú si quiere verlo primero. Sé proactivo, no esperes a que el cliente pregunte qué hay.
- Nunca respondas solo con un saludo genérico sin avanzar la conversación hacia tomar el pedido.
- MUY IMPORTANTE - mensajes que NO son pedidos: Sos un asistente SOLO para pedidos de comida. Si el mensaje claramente NO tiene que ver con pedir comida del local (por ejemplo: un proveedor ofreciendo productos o insumos, alguien hablando de facturas/pagos a proveedores, ventas o publicidad de terceros, temas administrativos, mensajes personales de conocidos, o cualquier cosa ajena a hacer un pedido), NO respondas como si fueras a tomar un pedido. En ese caso respondé ÚNICAMENTE con la etiqueta [NO_ES_PEDIDO] y nada más (sin texto, sin saludo, sin el bloque ESTADO). El sistema se encarga de avisarle al dueño. Ante la duda, si parece que la persona podría querer comer algo, atendé normal: esta regla es solo para casos claros de que NO es un cliente.

CÓMO MOSTRAR EL MENÚ (muy importante):
- NUNCA tires las 130+ opciones juntas de una si el cliente no lo pidió explícitamente. Eso abruma y el cliente no lee nada.
- Si el cliente pide "ver el menú" sin especificar, mostrá primero solo las CATEGORÍAS disponibles (los títulos: Botanas, Tacos, Burritos XL, Quesadillas XL, De la Casa, Combos, Extras, Arepas Guayoyo, Empanadas Venezolanas, Cachapas Guayoyo, Pepitos Guayoyo, Boxes Venezolanos, Postres, Bebidas sin Alcohol, Cervezas, Tragos y Cócteles) y preguntá cuál le interesa ver.
- Si el cliente menciona algo específico ("tacos", "algo venezolano", "para tomar"), mostrá SOLO esa categoría completa con precios.
- Si el cliente pide una recomendación o dice "no sé qué pedir", sugerí 2-3 opciones populares de distintas categorías (ej: un taco, un combo, una bebida) en vez de listar todo.
- Si el cliente pide explícitamente "el menú completo" o "todo el menú": ahí SÍ generá la lista completa de TODAS las categorías con TODOS los productos y precios, sin resumir ni cortar nada — el sistema se encarga de dividirlo en varios mensajes de WhatsApp automáticamente, así que no tengas miedo de que sea largo.
- Mantené las listas de productos en formato simple con guiones, una línea por ítem, sin texto extra entre medio.

ESTADO OCULTO DEL PEDIDO (el cliente NUNCA ve esto, se borra automáticamente — pero es OBLIGATORIO ponerlo en TODAS tus respuestas, sin excepción):
Al final de cada respuesta agregá, en su propia línea, este bloque:
[ESTADO]{"items":[{"n":"NOMBRE EXACTO DEL PRODUCTO COMO FIGURA EN EL MENU","c":CANTIDAD}],"modo":"delivery" o "retiro" o null,"nombre":"nombre del cliente" o null,"direccion":"dirección completa que dio el cliente" o null,"pago":"mercadopago" o "modo" o "transferencia" o "efectivo" o null}[/ESTADO]
Reglas:
- "items" es SIEMPRE el carrito completo y actualizado a este punto de la charla (no solo lo nuevo de este mensaje). Si el cliente sacó algo, no va más en la lista. Si el carrito está vacío, "items": [].
- El nombre en "n" tiene que coincidir EXACTO con el del menú de arriba.
- Si todavía no tenés un dato (nombre, dirección, modo, pago), poné null. Nunca inventes un dato que el cliente no dio.
- Este bloque va siempre, incluso en un simple saludo.

⚠️ REGLA CRÍTICA FINAL — LEÉ ESTO ANTES DE ENVIAR: Tu respuesta NO está completa sin el bloque [ESTADO]...[/ESTADO] al final. Si no lo incluís, el pedido se pierde y el cliente queda sin atención. SIEMPRE, en CADA mensaje que le mandes al cliente (saludo, pregunta, confirmación, lo que sea), terminá con el bloque [ESTADO] en su propia línea. Esto no es opcional. Revisá mentalmente antes de responder: "¿incluí el bloque [ESTADO]?". Si la respuesta es no, agregalo.`;

  sesion.historial.push({ role: "user", content: mensajeUsuario });

  console.log(`[consultarClaude] Llamando a Anthropic API, key presente: ${!!CONFIG.anthropic.key}`);

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: sesion.historial,
    },
    { headers: { "x-api-key": CONFIG.anthropic.key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, timeout: 30000 }
  ).catch(e => {
    console.error(`[consultarClaude] FALLO:`, e.response?.data ? JSON.stringify(e.response.data) : e.message);
    throw e;
  });

  console.log(`[consultarClaude] Respuesta recibida OK`);

  let respuestaCruda = response.data.content[0].text;
  let { texto: respuesta, estado } = extraerEstado(respuestaCruda);

  // SEGURO: si LEO se olvidó del bloque [ESTADO], se lo pedimos de nuevo una vez.
  // Esto evita perder el hilo del pedido cuando la IA omite el bloque obligatorio.
  if (estado === null && !respuestaCruda.includes("[NO_ES_PEDIDO]")) {
    console.warn("[consultarClaude] Falta [ESTADO], reintentando una vez...");
    try {
      const reintento = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            ...sesion.historial,
            { role: "assistant", content: respuestaCruda },
            { role: "user", content: "Reenviá EXACTAMENTE la misma respuesta anterior pero agregando al final el bloque [ESTADO]{...}[/ESTADO] obligatorio con el carrito y datos actuales. No cambies el texto para el cliente." },
          ],
        },
        { headers: { "x-api-key": CONFIG.anthropic.key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, timeout: 30000 }
      );
      const crudaReintento = reintento.data.content[0].text;
      const r2 = extraerEstado(crudaReintento);
      if (r2.estado !== null) {
        respuesta = r2.texto;
        estado = r2.estado;
        console.log("[consultarClaude] Reintento OK: [ESTADO] recuperado");
      }
    } catch (e) {
      console.error("[consultarClaude] Reintento falló:", e.message);
    }
  }

  sesion.historial.push({ role: "assistant", content: respuesta });

  // Actualizar carrito, nombre, dirección y pago con el estado real que reportó Claude
  aplicarEstado(phone, estado);

  return respuesta;
}

// ── PRODUCTOS PLANOS (para validar nombres del ESTADO) ─────
const PRODUCTOS_PLANOS = Object.values(MENU).flatMap(cat => cat.items);

function extraerEstado(respuestaCruda) {
  const match = respuestaCruda.match(/\[ESTADO\]([\s\S]*?)\[\/ESTADO\]/);
  if (!match) {
    console.error("[extraerEstado] Claude no incluyó el bloque [ESTADO] en su respuesta");
    return { texto: respuestaCruda.trim(), estado: null };
  }
  const texto = respuestaCruda.replace(match[0], "").trim();
  try {
    const estado = JSON.parse(match[1].trim());
    return { texto, estado };
  } catch (e) {
    console.error("[extraerEstado] Bloque ESTADO mal formado, se ignora:", e.message, match[1]);
    return { texto, estado: null };
  }
}

function aplicarEstado(phone, estado) {
  if (!estado) return; // si no vino o vino mal formado, no tocamos lo que ya teníamos guardado
  const sesion = getSesion(phone);

  if (Array.isArray(estado.items)) {
    sesion.carrito = estado.items
      .filter(i => i && i.n && Number(i.c) > 0)
      .map(i => {
        const producto = PRODUCTOS_PLANOS.find(p => p.n.toLowerCase() === String(i.n).toLowerCase());
        if (!producto) {
          console.error(`[aplicarEstado] Producto no reconocido del menú: "${i.n}"`);
          return null;
        }
        if (!estaDisponible(producto.n)) return null; // por las dudas, no vender algo sin stock
        return { nombre: producto.n, precio: producto.p, cantidad: Number(i.c) };
      })
      .filter(Boolean);
  }
  if (estado.modo) sesion.modo = estado.modo;
  if (estado.nombre) sesion.nombre = estado.nombre;
  if (estado.direccion) sesion.direccion = estado.direccion;
  if (estado.pago) sesion.metodoPago = estado.pago;
}

// ── MERCADO PAGO ───────────────────────────────────────────
async function crearPagoMP(sesion, phone) {
  const total = sesion.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const items = sesion.carrito.map(i => ({
    title: i.nombre,
    quantity: i.cantidad,
    unit_price: i.precio,
    currency_id: "ARS",
  }));

  const response = await axios.post(
    "https://api.mercadopago.com/checkout/preferences",
    {
      items,
      payer: { name: sesion.nombre || "Cliente" },
      back_urls: {
        success: "https://estilitaenlinea.com?pago=ok",
        failure: "https://estilitaenlinea.com?pago=error",
      },
      auto_return: "approved",
      statement_descriptor: "ESTILITA LA CANTINA",
      external_reference: phone,
    },
    { headers: { Authorization: `Bearer ${CONFIG.mp.accessToken}`, "Content-Type": "application/json" } }
  );

  return response.data.init_point;
}

// ── FUDO ───────────────────────────────────────────────────
let fudoToken = null;

async function loginFudo() {
  const res = await axios.post(`${CONFIG.fudo.base}/login`, {
    email: CONFIG.fudo.user,
    password: CONFIG.fudo.pass,
  });
  fudoToken = res.data.token || res.data.access_token;
  return fudoToken;
}

async function enviarPedidoFudo(sesion, phone) {
  if (!fudoToken) await loginFudo();
  const items = sesion.carrito.map(i => ({ name: i.nombre, quantity: i.cantidad, price: i.precio }));
  const total = sesion.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

  await axios.post(
    `${CONFIG.fudo.base}/orders`,
    {
      customer_name: sesion.nombre || "Cliente WhatsApp",
      customer_phone: phone,
      delivery_address: sesion.direccion || "Retiro en local",
      order_type: sesion.modo === "delivery" ? "delivery" : "pickup",
      items,
      total,
      payment_method: sesion.metodoPago || "efectivo",
      notes: `Pedido via WhatsApp LEO`,
    },
    { headers: { Authorization: `Bearer ${fudoToken}`, "Content-Type": "application/json" } }
  );
}

// ── GREEN API ──────────────────────────────────────────────
const LIMITE_WHATSAPP = 3500; // dejamos margen por debajo del límite real de WhatsApp (~4096)

function dividirMensajeLargo(texto) {
  if (texto.length <= LIMITE_WHATSAPP) return [texto];
  const bloques = [];
  const lineas = texto.split("\n");
  let actual = "";
  for (const linea of lineas) {
    if ((actual + "\n" + linea).length > LIMITE_WHATSAPP) {
      if (actual) bloques.push(actual);
      actual = linea;
    } else {
      actual = actual ? actual + "\n" + linea : linea;
    }
  }
  if (actual) bloques.push(actual);
  return bloques;
}

async function enviarMensaje(phone, texto) {
  const partes = dividirMensajeLargo(texto);
  for (const parte of partes) {
    try {
      const url = `${CONFIG.greenApi.base()}/sendMessage/${CONFIG.greenApi.token}`;
      console.log(`[enviarMensaje] POST ${url} (${parte.length} chars)`);
      const res = await axios.post(url, { chatId: `${phone}@c.us`, message: parte }, { timeout: 15000 });
      console.log(`[enviarMensaje] OK:`, JSON.stringify(res.data));
    } catch (e) {
      console.error(`[enviarMensaje] FALLO:`, e.response?.data ? JSON.stringify(e.response.data) : e.message);
      throw e;
    }
  }
}

// ── ALERTAS A DUEÑO/PATRICIA ──────────────────────────────
let ultimaAlerta = {}; // evita spamear la misma alerta repetidas veces

async function alertarAdmins(motivo, detalle) {
  const ahora = Date.now();
  const clave = motivo;
  // no repetir la misma alerta antes de 5 minutos
  if (ultimaAlerta[clave] && ahora - ultimaAlerta[clave] < 5 * 60 * 1000) return;
  ultimaAlerta[clave] = ahora;

  const texto = `⚠️ LEO tuvo un problema:\n${motivo}\n${detalle ? "Detalle: " + detalle.slice(0, 200) : ""}`;
  for (const admin of CONFIG.admins) {
    try {
      await axios.post(
        `${CONFIG.greenApi.base()}/sendMessage/${CONFIG.greenApi.token}`,
        { chatId: `${admin}@c.us`, message: texto }
      );
    } catch (e) {
      console.error(`[alertarAdmins] No se pudo avisar a ${admin}:`, e.message);
    }
  }
}

// ── WEBHOOK ───────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (!body || body.typeWebhook !== "incomingMessageReceived") return;
    if (!body.messageData || body.messageData.typeMessage !== "textMessage") return;

    // IGNORAR GRUPOS: solo atender chats privados de personas.
    // Los grupos de WhatsApp tienen un chatId que termina en "@g.us".
    // Las personas terminan en "@c.us". LEO nunca debe responder en grupos.
    const chatId = body.senderData?.chatId || "";
    if (chatId.endsWith("@g.us")) {
      console.log(`[GRUPO IGNORADO] ${chatId} → no se responde en grupos`);
      return;
    }

    const phone = body.senderData?.sender?.replace("@c.us", "");
    const texto = body.messageData.textMessageData?.textMessage;
    if (!phone || !texto) return;
    if (phone === CONFIG.negocio.whatsapp) return; // ignorar mensajes propios

    console.log(`[${phone}] → ${texto}`);

    // Si es admin (dueño o Patricia), chequear si es un comando de stock primero
    if (esAdmin(phone)) {
      const respuestaAdmin = await manejarComandoAdmin(phone, texto);
      if (respuestaAdmin) {
        await enviarMensaje(phone, respuestaAdmin);
        return;
      }
    }

    const sesion = getSesion(phone);
    const respuesta = await consultarClaude(phone, texto);

    // NO ES UN PEDIDO: si LEO detectó que el mensaje no es de un cliente
    // (proveedor, administrativo, conocido, etc.), NO le respondemos con el bot.
    // En cambio, le avisamos al dueño para que decida si contesta a mano.
    if (respuesta.includes("[NO_ES_PEDIDO]")) {
      console.log(`[NO_ES_PEDIDO] ${phone} → no se responde, se avisa al dueño`);
      // borrar la sesión que se acaba de crear, para que no quede basura en memoria
      delete sesiones[phone];
      await alertarAdmins(
        `Te escribió ${phone} y no parece un pedido. Fijate si querés responder a mano.`,
        `Mensaje: "${texto}"`
      );
      return;
    }

    let textoFinal = respuesta;

    // Generar link de pago
    if (respuesta.includes("[GENERAR_PAGO]")) {
      textoFinal = respuesta.replace("[GENERAR_PAGO]", "").trim();
      try {
        const link = await crearPagoMP(sesion, phone);
        await enviarMensaje(phone, textoFinal);
        await enviarMensaje(phone, `Acá tenés el link para pagar con Mercado Pago:\n${link}`);
        return;
      } catch (e) {
        console.error("Error MP:", e.message);
        await alertarAdmins(`No se pudo generar el link de pago para el cliente ${phone}`, e.message);
        await enviarMensaje(phone, textoFinal);
        return;
      }
    }

    // Enviar a Fudo
    if (respuesta.includes("[ENVIAR_FUDO]")) {
      textoFinal = respuesta.replace("[ENVIAR_FUDO]", "").trim();
      try {
        await enviarPedidoFudo(sesion, phone);
        console.log(`[FUDO] Pedido enviado para ${phone}`);
      } catch (e) {
        console.error("Error Fudo:", e.message);
        await alertarAdmins(`No se pudo mandar el pedido a Fudo (cliente ${phone}). Revisar manualmente.`, e.message);
      }
      // Guardar en la memoria persistente (no rompe el flujo si falla)
      await guardarPedidoEnMemoria(phone, sesion);
    }

    // Pedido listo (efectivo)
    if (respuesta.includes("[PEDIDO_LISTO]")) {
      textoFinal = respuesta.replace("[PEDIDO_LISTO]", "").trim();
      try {
        await enviarPedidoFudo(sesion, phone);
        console.log(`[FUDO] Pedido efectivo enviado para ${phone}`);
      } catch (e) {
        console.error("Error Fudo:", e.message);
        await alertarAdmins(`No se pudo mandar el pedido a Fudo (cliente ${phone}, pago efectivo). Revisar manualmente.`, e.message);
      }
      // Guardar en la memoria persistente (no rompe el flujo si falla)
      await guardarPedidoEnMemoria(phone, sesion);
    }

    await enviarMensaje(phone, textoFinal);
  } catch (err) {
    const detalle = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error("Error webhook:", detalle, err.stack);
    await alertarAdmins(`LEO no pudo responderle a un cliente (${req.body?.senderData?.sender || "número desconocido"})`, detalle);
  }
});

// ── MEMORIA PERSISTENTE: guardar pedido + cliente ─────────
// Toma la sesión actual del cliente y la registra en la base.
// Está envuelto en try/catch: si la base falla, LEO sigue normal.
async function guardarPedidoEnMemoria(phone, sesion) {
  try {
    if (!db.estaDisponibleDB()) return;
    const items = sesion.carrito || sesion.items || [];
    const total = (Array.isArray(items))
      ? items.reduce((acc, it) => acc + (Number(it.precio || 0) * Number(it.cantidad || 1)), 0)
      : null;
    await db.registrarPedido({
      telefono: phone,
      nombre: sesion.nombre || null,
      items: items,
      total: total || null,
      modo: sesion.modo || null,
      direccion: sesion.direccion || null,
      pago: sesion.pago || sesion.metodoPago || null,
    });
    await db.guardarCliente(phone, sesion.nombre || null, sesion.direccion || null);
    console.log(`[DB] Pedido y cliente guardados para ${phone}`);
  } catch (e) {
    console.error("[DB] guardarPedidoEnMemoria:", e.message);
  }
}

// ── HEALTH CHECK ───────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "LEO online", negocio: CONFIG.negocio.nombre }));

// ── PROTECCIÓN CONTRA CAÍDAS INESPERADAS ──────────────────
// Si algo falla fuera de los try/catch normales, lo logueamos y avisamos,
// pero NO dejamos que el proceso entero se caiga (eso cortaría a todos los clientes).
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Excepción no capturada:", err.message, err.stack);
  alertarAdmins("Error crítico inesperado en LEO (uncaughtException)", err.message).catch(() => {});
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Promesa rechazada sin capturar:", reason);
  alertarAdmins("Error crítico inesperado en LEO (unhandledRejection)", String(reason)).catch(() => {});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`LEO corriendo en puerto ${PORT}`);
  // Conectar la memoria persistente: crea las tablas y migra el stock actual.
  // Si la base no responde, LEO sigue funcionando con su memoria de siempre.
  try {
    const ok = await db.inicializar();
    if (ok) {
      await db.migrarStock(STOCK);
      // Si la base ya tiene stock guardado, lo usamos como fuente de verdad.
      const stockDB = await db.cargarStockDB();
      if (stockDB && Object.keys(stockDB).length > 0) {
        STOCK = stockDB;
        console.log(`[DB] Stock cargado desde la base: ${Object.keys(stockDB).length} productos.`);
      }
    }
  } catch (e) {
    console.error("[DB] Error al inicializar la memoria persistente:", e.message);
  }
});
