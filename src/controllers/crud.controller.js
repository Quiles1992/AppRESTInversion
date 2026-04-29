// =============================================
// FACTORY — crea un controlador CRUD completo
// Recibe un servicio creado con createCrudService
// =============================================
const createCrudController = (service) => ({

  // GET /resource — obtener todos
  findAll: async (req, res, next) => {
    try {
      const data = await service.findAll(req.query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET /resource/:id — obtener uno por ID
  findById: async (req, res, next) => {
    try {
      const data = await service.findById(req.params.id, req.query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  // POST /resource — crear nuevo registro
  create: async (req, res, next) => {
    try {
      const data = await service.create(req.body, req.query);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  },

  // PUT /resource/:id — actualizar registro
  update: async (req, res, next) => {
    try {
      const data = await service.update(req.params.id, req.body, req.query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  // DELETE /resource/:id — eliminar registro
  remove: async (req, res, next) => {
    try {
      const data = await service.remove(req.params.id, req.query);
      res.status(200).json({ message: 'Registro eliminado correctamente.', item: data });
    } catch (error) {
      next(error);
    }
  },
});

export default createCrudController;
