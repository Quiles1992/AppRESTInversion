import { Router } from 'express';

import userRoutes          from './users.routes';
import strategyRoutes      from './strategies.routes';
import signalEventRoutes   from './signal-events.routes';
import orderRoutes         from './orders.routes';
import positionRoutes      from './positions.routes';
import closedTradeRoutes   from './closed-trades.routes';
import alertLogRoutes      from './alert-log.routes';
import newsRoutes          from './news.routes';
import eventCalendarRoutes from './event-calendar.routes';
import fundamentalRoutes   from './fundamentals.routes';
import optionChainRoutes   from './option-chain.routes';

const router = Router();

router.use('/users',          userRoutes);
router.use('/strategies',     strategyRoutes);
router.use('/signal-events',  signalEventRoutes);
router.use('/orders',         orderRoutes);
router.use('/positions',      positionRoutes);
router.use('/closed-trades',  closedTradeRoutes);
router.use('/alert-log',      alertLogRoutes);
router.use('/news',           newsRoutes);
router.use('/event-calendar', eventCalendarRoutes);
router.use('/fundamentals',   fundamentalRoutes);
router.use('/option-chain',   optionChainRoutes);

export default router;
