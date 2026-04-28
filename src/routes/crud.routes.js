import { Router } from 'express';

// =============================================
// FACTORY — crea un router CRUD completo
// Recibe un controlador creado con createCrudController
// =============================================
const createCrudRouter = (controller) => {
  const router = Router();

  router.get('/',      controller.findAll);   // GET  /resource
  router.get('/:id',   controller.findById);  // GET  /resource/:id
  router.post('/',     controller.create);    // POST /resource
  router.put('/:id',   controller.update);    // PUT  /resource/:id
  router.patch('/:id', controller.update);    // PATCH /resource/:id (alias)
  router.delete('/:id',controller.remove);    // DELETE /resource/:id

  return router;
};

export default createCrudRouter;
