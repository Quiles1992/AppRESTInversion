/**
 * Schema Mapper
 * Documenta el schema de BD disponibles para que Groq entienda los datos
 */

export const schemaContext = `
# Available Database Schema

## Entity: Fundamental
Description: Datos fundamentales de empresas (EPS, P/E, volatilidad, etc)
Fields:
  - symbol (String): Ticker del activo (ej: "AAPL")
  - revenue_growth (Number): Crecimiento de ingresos %
  - eps (Number): Earnings Per Share
  - eps_surprise (Number): Sorpresa de EPS %
  - guidance (String): Guía de management
  - analyst_rating (String): Rating de analistas
  - revenue_ttm (Number): Revenue Trailing Twelve Months
  - gross_margin (Number): Margen bruto %
  - pe_ratio (Number): Price-to-Earnings ratio
  - ps_ratio (Number): Price-to-Sales ratio
  - market_cap (Number): Capitalización de mercado
  - volatility (Number): Volatilidad anualizada (0-1)
  - source (String): Fuente de datos
  - captured_at (Date): Cuando se capturaron los datos

Example Queries:
  - "Dame empresas con volatilidad baja" → filters: {volatility: {$lt: 0.15}}
  - "Empresas con P/E < 20" → filters: {pe_ratio: {$lt: 20}}
  - "Top 10 con mayor revenue growth" → sort: "-revenue_growth", limit: 10

## Entity: Position
Description: Posiciones abiertas de inversores
Fields:
  - user_id (ObjectId): ID del usuario
  - symbol (String): Ticker del activo
  - side (String): "LONG" o "SHORT"
  - quantity (Number): Cantidad de acciones
  - entry_price (Number): Precio de entrada
  - current_price (Number): Precio actual
  - stop_loss (Number): Stop loss configurado
  - take_profit (Number): Take profit configurado
  - unrealized_pnl (Number): Ganancia no realizada en $
  - unrealized_pnl_pct (Number): Ganancia no realizada en %
  - asset_type (String): "STOCK", "CRYPTO", "ETF"
  - is_open (Boolean): Si está abierta
  - opened_at (Date): Fecha de apertura
  - closed_at (Date): Fecha de cierre
  - updated_at (Date): Última actualización

Example Queries:
  - "Mis posiciones con mayor plusvalía" → sort: "-unrealized_pnl", filters: {is_open: true}
  - "Posiciones LONG abiertas" → filters: {side: "LONG", is_open: true}
  - "Gráfica de P&L del S&P500" → filters: {symbol: {$in: [SP500_SYMBOLS]}}

## Entity: Order
Description: Órdenes de compra/venta
Fields:
  - user_id (ObjectId): ID del usuario
  - symbol (String): Ticker
  - side (String): "BUY" o "SELL"
  - quantity (Number): Cantidad
  - order_type (String): "MARKET", "LIMIT"
  - price (Number): Precio (si es LIMIT)
  - status (String): "PENDING", "FILLED", "CANCELLED"
  - filled_price (Number): Precio de ejecución
  - created_at (Date): Fecha de creación
  - filled_at (Date): Fecha de ejecución

Example Queries:
  - "Órdenes ejecutadas hoy" → filters: {status: "FILLED", filled_at: {$gte: today}}
  - "Órdenes pendientes" → filters: {status: "PENDING"}

## Entity: News
Description: Noticias de mercado/empresas
Fields:
  - symbol (String): Ticker relacionado
  - headline (String): Titular
  - summary (String): Resumen
  - source (String): Fuente de noticia
  - url (String): URL de noticia
  - created_at (Date): Fecha de publicación
  - sentiment (String): "POSITIVE", "NEGATIVE", "NEUTRAL"

Example Queries:
  - "Noticias sobre AAPL del último mes" → filters: {symbol: "AAPL", created_at: {$gte: 30_days_ago}}
  - "Noticias positivas de TECH" → filters: {sentiment: "POSITIVE"}

## Entity: OptionChain
Description: Cadena de opciones
Fields:
  - symbol (String): Ticker
  - strike (Number): Precio strike
  - expiration (Date): Fecha de expiración
  - option_type (String): "CALL" o "PUT"
  - bid (Number): Bid price
  - ask (Number): Ask price
  - volume (Number): Volumen
  - open_interest (Number): Interés abierto
  - implied_volatility (Number): Volatilidad implícita
  - created_at (Date): Fecha

Example Queries:
  - "Opciones call ITM de AAPL" → filters: {symbol: "AAPL", option_type: "CALL"}
  - "Opciones con volatilidad implícita > 0.5" → filters: {implied_volatility: {$gt: 0.5}}

## Entity: Strategy
Description: Estrategias de trading
Fields:
  - user_id (ObjectId): ID del usuario
  - name (String): Nombre de estrategia
  - description (String): Descripción
  - rules (String): Reglas de la estrategia
  - status (String): "ACTIVE", "INACTIVE"
  - created_at (Date): Fecha de creación
  - performance_pct (Number): Retorno %

Example Queries:
  - "Estrategias activas" → filters: {status: "ACTIVE"}
  - "Top estrategias por retorno" → sort: "-performance_pct"

## Entity: ClosedTrade
Description: Operaciones cerradas (histórico)
Fields:
  - user_id (ObjectId): ID del usuario
  - symbol (String): Ticker
  - entry_price (Number): Precio de entrada
  - exit_price (Number): Precio de salida
  - quantity (Number): Cantidad
  - pnl (Number): Ganancia/Pérdida realizada
  - pnl_pct (Number): Ganancia/Pérdida %
  - opened_at (Date): Fecha de apertura
  - closed_at (Date): Fecha de cierre
  - duration_days (Number): Días que duró

Example Queries:
  - "Trades ganadores del mes" → filters: {pnl: {$gt: 0}, closed_at: {$gte: month_start}}
  - "Gráfica de P&L histórico" → sort: "closed_at", aggregation: "sum" field "pnl"

## Entity: AlertLog
Description: Log de alertas configuradas
Fields:
  - user_id (ObjectId): ID del usuario
  - symbol (String): Ticker
  - condition (String): Condición (ej: "price > 100")
  - triggered (Boolean): Si se disparó
  - created_at (Date): Fecha de creación

## Entity: RiskConfig
Description: Configuración de riesgo del usuario
Fields:
  - user_id (ObjectId): ID del usuario
  - max_position_size (Number): Tamaño máximo de posición %
  - max_loss_per_trade (Number): Pérdida máxima por trade %
  - max_daily_loss (Number): Pérdida diaria máxima %
  - portfolio_allocation (Object): Asignación de portfolio

## Supported Operators for Filters:
- $lt: less than (<)
- $gt: greater than (>)
- $lte: less than or equal (<=)
- $gte: greater than or equal (>=)
- $eq: equal (=)
- $ne: not equal (!=)
- $in: in array (IN)
- $nin: not in array (NOT IN)

## Common Aggregations:
- avg: Average value
- sum: Sum of values
- max: Maximum value
- min: Minimum value
- count: Count of items

## Date Ranges:
- "last day" = today - 1 day
- "last week" = today - 7 days
- "last month" = today - 30 days
- "last year" = today - 365 days
- Format: ISO 8601 (2024-01-15T10:30:00Z)
`;

/**
 * Obtiene campos permitidos por entidad (whitelist de seguridad)
 */
export const getAllowedFields = (entityName) => {
  const fieldMap = {
    Fundamental: [
      'symbol',
      'revenue_growth',
      'eps',
      'eps_surprise',
      'guidance',
      'analyst_rating',
      'revenue_ttm',
      'gross_margin',
      'pe_ratio',
      'ps_ratio',
      'market_cap',
      'volatility',
      'source',
      'captured_at',
    ],
    Position: [
      'user_id',
      'symbol',
      'side',
      'quantity',
      'entry_price',
      'current_price',
      'stop_loss',
      'take_profit',
      'unrealized_pnl',
      'unrealized_pnl_pct',
      'asset_type',
      'is_open',
      'opened_at',
      'closed_at',
      'updated_at',
    ],
    Order: [
      'user_id',
      'symbol',
      'side',
      'quantity',
      'order_type',
      'price',
      'status',
      'filled_price',
      'created_at',
      'filled_at',
    ],
    News: [
      'symbol',
      'headline',
      'summary',
      'source',
      'url',
      'created_at',
      'sentiment',
    ],
    OptionChain: [
      'symbol',
      'strike',
      'expiration',
      'option_type',
      'bid',
      'ask',
      'volume',
      'open_interest',
      'implied_volatility',
      'created_at',
    ],
    Strategy: [
      'user_id',
      'name',
      'description',
      'rules',
      'status',
      'created_at',
      'performance_pct',
    ],
    ClosedTrade: [
      'user_id',
      'symbol',
      'entry_price',
      'exit_price',
      'quantity',
      'pnl',
      'pnl_pct',
      'opened_at',
      'closed_at',
      'duration_days',
    ],
    AlertLog: ['user_id', 'symbol', 'condition', 'triggered', 'created_at'],
    RiskConfig: [
      'user_id',
      'max_position_size',
      'max_loss_per_trade',
      'max_daily_loss',
    ],
  };

  return fieldMap[entityName] || [];
};

export default {
  schemaContext,
  getAllowedFields,
};
