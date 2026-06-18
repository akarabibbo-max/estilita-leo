const express = require("express");
const axios = require("axios");
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

// ── ESTADO DE CONVERSACIONES ──────────────────────────────
const sesiones = {}; // { [phone]: { historial, carrito, estado, nombre, direccion, modo } }

function getSesion(phone) {
  if (!sesiones[phone]) {
    sesiones[phone] = { historial: [], carrito: [], estado: "inicio", nombre: null, direccion: null, modo: null };
  }
  return sesiones[phone];
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
${menuTexto}

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
- No uses markdown, emojis con moderación, respuestas cortas y directas`;

  sesion.historial.push({ role: "user", content: mensajeUsuario });

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: sesion.historial,
    },
    { headers: { "x-api-key": CONFIG.anthropic.key, "anthropic-version": "2023-06-01", "content-type": "application/json" } }
  );

  const respuesta = response.data.content[0].text;
  sesion.historial.push({ role: "assistant", content: respuesta });

  // Actualizar carrito desde la respuesta (simple parsing)
  actualizarCarrito(phone, mensajeUsuario, respuesta);

  return respuesta;
}

function actualizarCarrito(phone, msgUsuario, respClaude) {
  const sesion = getSesion(phone);
  // Buscar ítems del menú mencionados por el usuario
  const textoLower = msgUsuario.toLowerCase();
  Object.values(MENU).forEach(cat => {
    cat.items.forEach(item => {
      if (textoLower.includes(item.n.toLowerCase())) {
        const existe = sesion.carrito.find(i => i.nombre === item.n);
        if (existe) { existe.cantidad++; }
        else { sesion.carrito.push({ nombre: item.n, precio: item.p, cantidad: 1 }); }
      }
    });
  });
  // Detectar modo
  if (textoLower.includes("delivery") || textoLower.includes("envío") || textoLower.includes("domicilio")) sesion.modo = "delivery";
  if (textoLower.includes("retiro") || textoLower.includes("paso a buscar") || textoLower.includes("local")) sesion.modo = "retiro";
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
async function enviarMensaje(phone, texto) {
  await axios.post(
    `${CONFIG.greenApi.base()}/sendMessage/${CONFIG.greenApi.token}`,
    { chatId: `${phone}@c.us`, message: texto }
  );
}

// ── WEBHOOK ───────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (!body || body.typeWebhook !== "incomingMessageReceived") return;
    if (!body.messageData || body.messageData.typeMessage !== "textMessage") return;

    const phone = body.senderData?.sender?.replace("@c.us", "");
    const texto = body.messageData.textMessageData?.textMessage;
    if (!phone || !texto) return;
    if (phone === CONFIG.negocio.whatsapp) return; // ignorar mensajes propios

    console.log(`[${phone}] → ${texto}`);

    const sesion = getSesion(phone);
    const respuesta = await consultarClaude(phone, texto);

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
      }
    }

    // Pedido listo (efectivo)
    if (respuesta.includes("[PEDIDO_LISTO]")) {
      textoFinal = respuesta.replace("[PEDIDO_LISTO]", "").trim();
      try {
        await enviarPedidoFudo(sesion, phone);
        console.log(`[FUDO] Pedido efectivo enviado para ${phone}`);
      } catch (e) {
        console.error("Error Fudo:", e.message);
      }
    }

    await enviarMensaje(phone, textoFinal);
  } catch (err) {
    console.error("Error webhook:", err.message);
  }
});

// ── HEALTH CHECK ───────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "LEO online", negocio: CONFIG.negocio.nombre }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LEO corriendo en puerto ${PORT}`));
