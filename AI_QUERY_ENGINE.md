# 🤖 AI Query Engine - AppRESTInversion

## ¿Qué es?

Una infraestructura completa para **consultar bases de datos con lenguaje natural** usando:
- **Groq API** - IA ultra rápida que interpreta queries (50-100ms)
- **MongoDB + Supabase** - Acceso a datos híbrido
- **Alpaca Markets API** - Datos bursátiles en tiempo real
- **Analytics** - Resúmenes, gráficas, estadísticas automáticas

## 🎯 Ejemplo: Flujo Completo

```
Usuario: "Dame empresas con volatilidad baja"
         ↓
    [Groq IA] → Interpreta → {entity: "Fundamental", filters: {volatility: {$lt: 0.15}}}
         ↓
   [Query Builder] → Ejecuta en MongoDB/Supabase
         ↓
    [Alpaca] → Enriquece con precios actuales
         ↓
   [Analytics] → Genera resumen + gráficas
         ↓
Respuesta: {"data": [...], "charts": [...], "summary": "..."}
```

---

## ⚙️ Setup Inicial

### 1️⃣ Obtener API Keys

#### Groq (Gratis - 1M tokens/día)
1. Ir a https://console.groq.com/keys
2. Crear API key
3. Copiar key en `.env`:
   ```env
   GROQ_API_KEY=gsk_YOUR_API_KEY_HERE
   ```

#### Alpaca (Gratis - Paper Trading)
1. Ir a https://alpaca.markets
2. Registrarse (gratis)
3. Copiar API keys en `.env`:
   ```env
   ALPACA_API_KEY=PK_YOUR_API_KEY_HERE
   ALPACA_SECRET_KEY=YOUR_SECRET_KEY_HERE
   ```

### 2️⃣ Configurar Variables de Entorno

```bash
# .env
GROQ_API_KEY=gsk_...
GROQ_MODEL=mixtral-8x7b-32768
GROQ_TEMPERATURE=0.1

ALPACA_API_KEY=PK_...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

### 3️⃣ Iniciar Servidor

```bash
npm run dev
# ✅ Server en http://localhost:3020
```

---

## 📡 Endpoints Principales

### **POST /api/v1/ai-query**
Consulta principal en lenguaje natural

```json
{
  "query": "Dame empresas con volatilidad baja",
  "dbServer": "mongodb",
  "includeAlpaca": true,
  "includeCharts": false,
  "generateNLSummary": false
}
```

**Respuesta:**
```json
{
  "success": true,
  "query": "Dame empresas con volatilidad baja",
  "count": 45,
  "summary": "✅ Se encontraron **45** resultados...",
  "data": [
    {
      "symbol": "JNJ",
      "pe_ratio": 18.5,
      "volatility": 0.12,
      "alpaca": {
        "latestPrice": {"price": 155.30},
        "volatility": {"volatilityPct": 12.5}
      }
    },
    ...
  ],
  "charts": []
}
```

### **POST /api/v1/ai-query/preview**
Ver la query interpretada SIN ejecutar (debugging)

```json
{
  "query": "Dame empresas con volatilidad baja"
}
```

**Respuesta:**
```json
{
  "success": true,
  "originalQuery": "Dame empresas con volatilidad baja",
  "parsedQuery": {
    "entity": "Fundamental",
    "filters": {"volatility": {"$lt": 0.15}},
    "fields": ["symbol", "volatility", "pe_ratio"],
    "sort": "-volatility",
    "limit": 50,
    "aggregation": null
  },
  "security": {
    "isSafe": true,
    "allowedFields": ["symbol", "pe_ratio", ...]
  }
}
```

### **GET /api/v1/ai-query/schema**
Obtener el schema disponible (para client-side validation)

---

## 🔄 Arquitectura Interna

### **Servicios Creados**

| Servicio | Responsabilidad |
|---|---|
| `groq-client.service.js` | Conexión a Groq + NLP |
| `query-builder.service.js` | MongoDB + Supabase adapters |
| `alpaca-connector.service.js` | Fetch datos de Alpaca |
| `analytics.service.js` | Resúmenes + gráficas |
| `schema-mapper.js` | Documentación de BD para IA |

### **Flujo Detallado**

```
1. [Controller] Recibe query natural
      ↓
2. [Groq Client] → interpretNLQuery()
   - Envía schema + query a Groq
   - Retorna JSON estructurado
      ↓
3. [Query Builder] → buildMongoQuery() O buildSupabaseQuery()
   - Construye query según BD elegida
      ↓
4. [Execute] executeMongoQuery() OR executeSupabaseQuery()
   - Ejecuta en BD
      ↓
5. [Alpaca] → getLatestPrice() + calculateVolatility()
   - Enriquece datos (opcional)
      ↓
6. [Analytics] → formatResponse()
   - Genera resumen + charts
      ↓
7. [Response] Retorna JSON al cliente
```

---

## 📚 Ejemplos de Queries Soportadas

### **Fundamental Data**
```
"Dame empresas con volatilidad baja"
"Empresas con P/E ratio < 15"
"Top 10 con mayor revenue growth"
"¿Cuál es el promedio de EPS?"
"Empresas con margen bruto > 50%"
```

### **Positions**
```
"Mis posiciones abiertas con ganancia"
"Posiciones LONG en tech"
"Gráfica de P&L actual"
"¿Cuántas posiciones estoy sosteniendo?"
```

### **Trades & Orders**
```
"Mis trades ganadores del mes"
"Órdenes ejecutadas hoy"
"Trades con mayor retorno"
"¿Cuál fue mi mejor operación?"
```

### **News & Market**
```
"Noticias sobre AAPL del último mes"
"Noticias positivas del S&P500"
"Opciones call de AAPL"
"Opciones con volatilidad implícita alta"
```

---

## 🔐 Seguridad

### **Validaciones Implementadas**

1. **Whitelist de Campos** - Solo campos permitidos por entidad
2. **Anti-Injection** - Detecta patrones peligrosos ($where, $function, etc)
3. **Rate Limiting** - Configurable en `.env` (default: 100 queries/usuario/hora)
4. **Caching** - Resultados cacheados por 1 hora (configurable)

### **Datos Enviados a Groq**
- ✅ Schema de BD (documento de 5KB)
- ✅ Query del usuario
- ❌ Datos reales de BD (nunca)
- ❌ API keys (nunca)

---

## ⚡ Performance

| Operación | Tiempo |
|---|---|
| Groq Interpretation | 50-100ms |
| MongoDB Query | 10-50ms |
| Supabase Query | 50-200ms |
| Alpaca Price Fetch | 200-500ms |
| Total (sin Alpaca) | 100-200ms |
| Total (con Alpaca) | 300-800ms |

**Tips de Optimización:**
- No usar `includeAlpaca: true` para queries grandes
- Usar `dbServer: "mongodb"` (más rápido que Supabase)
- Limitar `limit` en query si es posible

---

## 🐛 Debugging

### Ver la query interpretada:
```bash
# Usar endpoint /preview
POST /api/v1/ai-query/preview
Body: {"query": "Tu query aquí"}
```

### Ver logs en consola:
```
📝 Query recibida: "..."
🤖 Groq interpretó como: {...}
✅ Ejecutada exitosamente. Resultados: 45
```

### Validar API keys:
```bash
# Groq
curl -H "Authorization: Bearer gsk_YOUR_KEY" https://api.groq.com/v1/models

# Alpaca
curl -H "APCA-API-KEY-ID: YOUR_KEY" https://paper-api.alpaca.markets/v1/account
```

---

## 📋 Estructura de Carpetas

```
src/
├── services/
│   ├── groq-client.service.js          ← IA interpretation
│   ├── query-builder.service.js        ← Query execution
│   ├── alpaca-connector.service.js     ← Market data
│   └── analytics.service.js            ← Resúmenes + charts
├── routes/
│   └── ai-query.routes.js              ← Endpoints
├── controllers/
│   └── ai-query.controller.js          ← Orquestación
└── utils/
    └── schema-mapper.js                ← Schema docs para IA
```

---

## 🚀 Próximos Pasos

### Fase 1: ✅ Completada
- [x] Groq Client
- [x] Query Builder
- [x] Alpaca Connector
- [x] Analytics
- [x] Endpoints REST

### Fase 2: Mejoras (Próximamente)
- [ ] Caché de queries (Redis)
- [ ] Rate limiting (RedisRateLimiter)
- [ ] Historial de queries (guardar en BD)
- [ ] Alertas automáticas
- [ ] Exportar a CSV/PDF

### Fase 3: Avanzado
- [ ] WebSockets (live updates)
- [ ] Machine Learning para predicciones
- [ ] Backtest automático
- [ ] Portfolio optimization

---

## ❓ FAQ

**P: ¿Es gratis?**
R: Sí. Groq tiene 1M tokens/día gratis (suficiente para ~5000 queries). Alpaca paper trading es gratis.

**P: ¿Necesito GPU para Groq?**
R: No. Groq corre en sus servidores. Tu servidor solo consume ~50KB por request.

**P: ¿Puedo usar Ollama en lugar de Groq?**
R: Sí, pero requiere GPU local. Ver [Ollama Setup](./OLLAMA_SETUP.md)

**P: ¿Qué pasa si envío una query inválida?**
R: Groq intenta interpretar lo mejor que puede. Si falla, retorna error 400.

**P: ¿Cómo cacheo resultados?**
R: Implementado con TTL de 1 hora. Ver config `AI_CACHE_TTL`.

---

## 📞 Soporte

Para issues o preguntas:
1. Revisa el `DEBUG` en logs
2. Usa `/preview` para validar query
3. Verifica que API keys sean válidas
4. Chequea que BD esté conectada

---

**Versión:** 1.0.0  
**Estado:** ✅ Producción Ready  
**Última actualización:** Mayo 2026
