# Plan: Chatbot RELUVSA - Cotización y Pagos via WhatsApp

## Resumen Ejecutivo

Crear un chatbot de WhatsApp con IA para RELUVSA (refaccionaria de llantas) que permita a los clientes cotizar llantas y pagar directamente desde la conversación.

---

## Información del Negocio

| Campo | Valor |
|-------|-------|
| **Empresa** | RELUVSA |
| **Giro** | Refaccionaria de llantas |
| **Marcas** | NEREUS (94 productos) y TORNEL (198 productos) |
| **Dirección** | Calle F. Berriozábal 1982, Comercial Dos Mil, 87058 Ciudad Victoria, Tamps. |
| **Google Maps** | https://share.google/MWTkvQe16I0veKV1p |
| **Teléfono** | +52 834 270 9767 |
| **Email Admin** | jorgepensado1996@gmail.com |

---

## Servicios y Precios

### Llantas
- **Precios**: Todos son **POR PIEZA/POR LLANTA** (unitario)
- **Marcas**: NEREUS y TORNEL
- **Descuentos por volumen**: Contactar al +52 834 270 9767

### Servicios en Sucursal
| Servicio | Precio |
|----------|--------|
| **Alineación** | $250 MXN |
| **Diagnóstico vehicular** | Disponible en sucursal |
| **MSI (Meses sin intereses)** | Solo en sucursal |

### Costos de Envío

| Condición | Costo de Envío |
|-----------|----------------|
| **Compra mayor a $2,499** | **GRATIS** |
| **1 llanta** | $149.50 MXN (medio par) |
| **2 llantas** | $299 MXN (1 par) |
| **3 llantas** | $448.50 MXN (1.5 pares) |
| **4 llantas** | $598 MXN (2 pares) |

**Fórmula**: `costo_envio = ceil(cantidad / 2) * 299` si total < $2,499, sino $0

---

## Arquitectura del Sistema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Cliente      │     │      n8n        │     │    Supabase     │
│   (WhatsApp)    │────▶│   (Twilio)      │────▶│ Edge Function   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        │                               │                               │
                        ▼                               ▼                               ▼
                ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
                │   Supabase DB   │             │   OpenAI API    │             │     Stripe      │
                │  (inventario,   │             │   (interpretar  │             │  (payment link) │
                │   leads, etc.)  │             │    mensajes)    │             │                 │
                └─────────────────┘             └─────────────────┘             └─────────────────┘
```

### Componentes:

| Componente | Función |
|------------|---------|
| **n8n** | Recibe webhooks de Twilio, envía mensajes de WhatsApp, envía emails |
| **Supabase Edge Function** | Lógica principal del bot, procesa mensajes con IA, consulta inventario, genera links de Stripe |
| **Supabase DB** | Almacena inventario, leads, conversaciones, pedidos |
| **OpenAI API** | Interpreta mensajes del cliente, normaliza medidas, genera respuestas naturales |
| **Stripe** | Genera Payment Links, procesa pagos, envía webhooks de confirmación |

---

## Flujo de Conversación

### Flujo Principal (Happy Path):

```
1. Cliente: "Hola, busco llantas 195 55 16"

2. Bot: [Interpreta con IA, normaliza a 195/55R16]
        [Consulta inventario en Supabase]

3. Bot: "¡Hola! Encontré estas opciones en 195/55R16:

        🛞 NEREUS NS601 - $1,700.56 c/u
           ✅ 34 disponibles

        🛞 TORNEL REAL - $1,850.00 c/u
           ✅ 12 disponibles

        (Precios por llanta)

        ¿Cuál prefieres y cuántas necesitas?"

4. Cliente: "4 de las nereus"

5. Bot: [Calcula: 4 x $1,700.56 = $6,802.24]
        [Como es mayor a $2,499, envío es GRATIS]

        "Perfecto. Tu cotización:

        4 x NEREUS NS601 195/55R16
        Subtotal: $6,802.24 MXN
        Envío: GRATIS (compras mayores a $2,499)
        ─────────────────
        Total: $6,802.24 MXN

        Para generar tu link de pago, necesito algunos datos.
        ¿Cuál es tu nombre completo?"

6. Cliente: "Juan Pérez"

7. Bot: "Gracias Juan. ¿Cuál es tu correo electrónico?"

8. Cliente: "juan@gmail.com"

9. Bot: "¿Y tu dirección completa para el envío?"

10. Cliente: "Av. Revolución 123, Col. Centro, Monterrey, NL"

11. Bot: [Genera link de pago en Stripe]
         "¡Listo Juan! Aquí está tu link de pago:

         🔗 https://buy.stripe.com/xxxxx

         ✅ 4 llantas NEREUS NS601 195/55R16
         💰 Total: $6,802.24 MXN
         🚚 Envío GRATIS
         📍 Envío a: Av. Revolución 123, Col. Centro, Monterrey, NL

         El link es válido por 24 horas."

12. [Cliente paga]

13. [Stripe webhook notifica]

14. Bot: "¡Pago recibido! 🎉
         Gracias por tu compra, Juan.
         Te contactaremos pronto para coordinar la entrega.

         📧 Confirmación enviada a: juan@gmail.com"

15. [Email a jorgepensado1996@gmail.com con detalles del pedido]
```

### Ejemplo con envío con costo:

```
Cliente: "Quiero 2 llantas nereus 185/65R15"

Bot: [Calcula: 2 x $1,424.48 = $2,848.96]
     [Como es mayor a $2,499, envío es GRATIS]

     "Encontré la NEREUS NS601 185/65R14 a $1,424.48 c/u

     Tu cotización:
     2 x NEREUS NS601 185/65R14
     Subtotal: $2,848.96 MXN
     Envío: GRATIS
     ─────────────────
     Total: $2,848.96 MXN

     ¿Continuamos con el pedido?"
```

```
Cliente: "Quiero 1 llanta nereus 185/60R14"

Bot: [Calcula: 1 x $1,424.48 = $1,424.48]
     [Como es menor a $2,499, envío = $149.50]

     "Encontré la NEREUS NS601 185/60R14 a $1,424.48

     Tu cotización:
     1 x NEREUS NS601 185/60R14
     Subtotal: $1,424.48 MXN
     Envío: $149.50 MXN
     ─────────────────
     Total: $1,573.98 MXN

     💡 Tip: Con $1,075 más en tu compra, el envío es GRATIS

     ¿Continuamos con el pedido?"
```

---

## Manejo de Casos Especiales

### 1. Normalización de Medidas

El bot debe interpretar múltiples formatos:

| Input del cliente | Normalizado |
|-------------------|-------------|
| `185 65 R14` | 185/65R14 |
| `185 65 14` | 185/65R14 |
| `185/65/14` | 185/65R14 |
| `18565r14` | 185/65R14 |
| `185,65,14` | 185/65R14 |
| `P185/65R14` | 185/65R14 |
| `185/65R14 91T` | 185/65R14 |

### 2. Cliente da vehículo pero NO medida

```
Cliente: "Llantas para Jetta 2013"

Bot: "¡Con gusto te ayudo! Para darte el precio exacto, necesito la medida de llanta.

     📍 La encuentras en el costado de tu llanta actual, se ve así: 205/55R16

     ¿Podrías revisar y compartirme la medida?"
```

**IMPORTANTE**: NUNCA sugerir medida por vehículo.

### 3. Preguntas sobre ubicación

```
Cliente: "¿Dónde están ubicados?"

Bot: "¡Claro! Estamos en:

     📍 RELUVSA Berriozábal
        Calle F. Berriozábal 1982, Comercial Dos Mil
        Ciudad Victoria, Tamps. CP 87058

     📞 +52 834 270 9767

     🗺️ Google Maps: https://share.google/MWTkvQe16I0veKV1p

     También hacemos envíos a todo México.

     ¿Te gustaría cotizar unas llantas?"
```

### 4. Preguntas sobre marcas que NO manejan

```
Cliente: "¿Tienen Michelin?"

Bot: "Por el momento manejamos llantas NEREUS y TORNEL,
     que son excelente calidad a muy buen precio.

     ¿Te gustaría que te cotice en alguna medida?"
```

### 5. Preguntas sobre MSI

```
Cliente: "¿Tienen meses sin intereses?"

Bot: "¡Claro! Para pagos a meses sin intereses, con gusto te atendemos
     directamente en nuestra sucursal:

     📍 RELUVSA Berriozábal
        Calle F. Berriozábal 1982, Comercial Dos Mil
        Ciudad Victoria, Tamps.

     📞 +52 834 270 9767

     🗺️ https://share.google/MWTkvQe16I0veKV1p

     ¿Hay algo más en lo que pueda ayudarte?"
```

### 6. Preguntas sobre Alineación

```
Cliente: "¿Hacen alineación?" / "¿Cuánto cuesta la alineación?"

Bot: "¡Sí! El servicio de alineación tiene un costo de $250 MXN
     y se realiza en nuestra sucursal:

     📍 RELUVSA Berriozábal
        Calle F. Berriozábal 1982, Comercial Dos Mil
        Ciudad Victoria, Tamps.

     📞 +52 834 270 9767

     🗺️ https://share.google/MWTkvQe16I0veKV1p

     ¿Te gustaría también cotizar llantas?"
```

### 7. Preguntas sobre Diagnóstico Vehicular

```
Cliente: "¿Hacen diagnóstico?" / "Necesito un diagnóstico de mi carro"

Bot: "¡Sí ofrecemos diagnóstico de tu vehículo!

     Este servicio se realiza en nuestra sucursal:

     📍 RELUVSA Berriozábal
        Calle F. Berriozábal 1982, Comercial Dos Mil
        Ciudad Victoria, Tamps.

     📞 +52 834 270 9767

     🗺️ https://share.google/MWTkvQe16I0veKV1p

     ¿Hay algo más en lo que pueda ayudarte?"
```

### 8. Preguntas sobre precio por pieza

```
Cliente: "¿Es precio por llanta?" / "¿Es unitario?" / "¿Cuánto cuesta cada una?"

Bot: "Sí, es el precio por llanta/por pieza.
     Si necesitas varias llantas, el precio se multiplica por la cantidad.

     Por ejemplo, si necesitas 4 llantas de $1,500 c/u,
     el total sería $6,000 MXN.

     ¿Cuántas llantas necesitas?"
```

### 9. Preguntas sobre descuentos por volumen

```
Cliente: "¿Tienen descuento por mayoreo?" / "¿Hay descuento si compro muchas?"

Bot: "Para consultar descuentos por volumen, por favor comunícate
     directamente con nosotros:

     📞 +52 834 270 9767

     Con gusto te atendemos.

     ¿Te gustaría que mientras te cotice alguna medida?"
```

### 10. Medida no disponible

```
Bot: "No encontré llantas en medida 275/40R20 en este momento.

     ¿Tienes otra medida que pueda buscar?
     O si gustas, déjame tus datos y te aviso cuando lleguen."
```

### 11. Cliente se desvía del tema (otros servicios)

```
Cliente: "¿Cambian balatas?"

Bot: "Por el momento solo vendemos llantas a través de este canal.

     Para otros servicios, puedes visitarnos en sucursal:

     📍 RELUVSA Berriozábal
        Calle F. Berriozábal 1982, Comercial Dos Mil
        Ciudad Victoria, Tamps.

     📞 +52 834 270 9767

     ¿Te gustaría cotizar unas llantas?"
```

---

## Lógica de Cálculo de Envío

```javascript
function calcularEnvio(cantidad, subtotal) {
  // Si el subtotal es mayor a $2,499, envío gratis
  if (subtotal >= 2499) {
    return { costo: 0, mensaje: "GRATIS (compras mayores a $2,499)" };
  }

  // Costo base: $299 por par de llantas
  const COSTO_POR_PAR = 299;

  // Calcular pares (redondeando hacia arriba para impares)
  // 1 llanta = 0.5 pares = $149.50
  // 2 llantas = 1 par = $299
  // 3 llantas = 1.5 pares = $448.50
  // 4 llantas = 2 pares = $598

  const pares = cantidad / 2;
  const costoEnvio = pares * COSTO_POR_PAR;

  // Calcular cuánto falta para envío gratis
  const faltaParaGratis = 2499 - subtotal;

  return {
    costo: costoEnvio,
    mensaje: `$${costoEnvio.toFixed(2)} MXN`,
    faltaParaGratis: faltaParaGratis > 0 ? faltaParaGratis : 0
  };
}
```

---

## Estructura de Datos

### Nueva tabla: `pedidos`

```sql
CREATE TABLE pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    telefono VARCHAR NOT NULL,
    nombre_cliente VARCHAR NOT NULL,
    email_cliente VARCHAR NOT NULL,
    direccion_envio TEXT NOT NULL,

    -- Productos
    items JSONB NOT NULL, -- [{medida, marca, descripcion, cantidad, precio_unitario}]
    subtotal NUMERIC NOT NULL,
    costo_envio NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,

    -- Stripe
    stripe_payment_link_id VARCHAR,
    stripe_payment_link_url VARCHAR,
    stripe_payment_intent_id VARCHAR,
    stripe_session_id VARCHAR,

    -- Estado
    estado VARCHAR DEFAULT 'pendiente_pago', -- pendiente_pago, pagado, enviado, entregado, cancelado
    fecha_pago TIMESTAMPTZ,
    fecha_envio TIMESTAMPTZ,
    fecha_entrega TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Nueva tabla: `sesiones_chat`

Para mantener el estado de la conversación:

```sql
CREATE TABLE sesiones_chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telefono VARCHAR UNIQUE NOT NULL,
    lead_id UUID REFERENCES leads(id),

    -- Estado de la conversación
    estado VARCHAR DEFAULT 'inicio',
    -- Estados: inicio, buscando_medida, seleccionando_producto,
    --          pidiendo_cantidad, pidiendo_nombre, pidiendo_email,
    --          pidiendo_direccion, esperando_pago

    -- Datos en progreso
    medida_seleccionada VARCHAR,
    producto_seleccionado JSONB,
    cantidad INTEGER,
    nombre_cliente VARCHAR,
    email_cliente VARCHAR,
    direccion_envio TEXT,

    -- Carrito temporal
    carrito JSONB DEFAULT '[]',

    -- Control
    ultimo_mensaje_at TIMESTAMPTZ DEFAULT NOW(),
    expira_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementación por Fases

### Fase 1: Infraestructura Base
- [ ] Crear tabla `pedidos` en Supabase
- [ ] Crear tabla `sesiones_chat` en Supabase
- [ ] Crear Edge Function `chatbot-handler`
- [ ] Configurar webhook de Stripe para pagos

### Fase 2: Lógica del Bot
- [ ] Implementar normalización de medidas
- [ ] Implementar búsqueda en inventario
- [ ] Implementar máquina de estados de conversación
- [ ] Implementar cálculo de envío
- [ ] Integrar OpenAI para interpretación de mensajes

### Fase 3: Integración Stripe
- [ ] Implementar creación de Payment Links
- [ ] Implementar webhook para confirmación de pagos
- [ ] Implementar notificación al cliente post-pago

### Fase 4: Integración n8n
- [ ] Crear workflow para recibir mensajes de Twilio
- [ ] Crear workflow para enviar mensajes via Twilio
- [ ] Crear workflow para enviar email de notificación al admin
- [ ] Conectar n8n con Edge Function

### Fase 5: Testing y Refinamiento
- [ ] Probar flujo completo con Stripe en modo test
- [ ] Ajustar prompts de IA según resultados
- [ ] Probar casos edge (medidas raras, errores, etc.)

---

## Configuración Requerida

### Variables de entorno (Supabase Edge Function):

```
OPENAI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=sk_test_xxx (luego sk_live_xxx)
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

### n8n:
- Webhook de Twilio configurado
- Credenciales de Twilio
- Credenciales de email (para notificaciones)

---

## Prompt del Sistema (OpenAI)

```
Eres el asistente virtual de RELUVSA, una refaccionaria de llantas en Ciudad Victoria, Tamaulipas.

TU OBJETIVO PRINCIPAL: Ayudar al cliente a cotizar y comprar llantas mediante un link de pago.

MARCAS QUE MANEJAS: NEREUS y TORNEL

PRECIOS: Todos los precios son POR LLANTA (precio unitario). Si el cliente pregunta, confírmalo.

SERVICIOS EN SUCURSAL:
- Alineación: $250 MXN
- Diagnóstico vehicular: Disponible
- MSI (meses sin intereses): Solo en sucursal

ENVÍOS:
- A todo México
- Gratis en compras mayores a $2,499
- $299 por par de llantas si es menor a $2,499

REGLAS IMPORTANTES:
1. NUNCA recomiendes una medida de llanta basándote en el vehículo. SIEMPRE pide la medida al cliente.
2. Cuando el cliente dé una medida en cualquier formato, normalízala (ej: "185 65 15" → "185/65R15")
3. Sé amable pero conciso. No uses respuestas largas.
4. Siempre intenta redirigir la conversación hacia la venta de llantas.
5. Si preguntan por marcas que no manejas, ofrece NEREUS o TORNEL.
6. Si preguntan por MSI, indica MUY AMABLEMENTE que pueden acudir a sucursal.
7. Para descuentos por volumen, indicar que contacten al +52 834 270 9767

INFORMACIÓN DE LA TIENDA:
- Nombre: RELUVSA Berriozábal
- Dirección: Calle F. Berriozábal 1982, Comercial Dos Mil, 87058 Ciudad Victoria, Tamps.
- Teléfono: +52 834 270 9767
- Google Maps: https://share.google/MWTkvQe16I0veKV1p
- Pagos online: Solo tarjeta de crédito/débito
- Pagos en sucursal: Efectivo, tarjeta, MSI

FLUJO DE VENTA:
1. Obtener medida de llanta
2. Mostrar opciones disponibles con precios (por llanta)
3. Obtener cantidad
4. Calcular subtotal y envío
5. Obtener nombre completo
6. Obtener email
7. Obtener dirección de envío
8. Generar link de pago
```

---

## Entregables

1. **Edge Function**: `chatbot-handler` en Supabase
2. **Tablas**: `pedidos`, `sesiones_chat`
3. **Workflows n8n**: Recibir mensaje, enviar mensaje, enviar email
4. **Documentación**: Guía de configuración y mantenimiento

---

## Siguiente Paso

¿Apruebas este plan para comenzar la implementación?
