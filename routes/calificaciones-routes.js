const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const calificacionesControllers = require("../controllers/calificaciones-controllers");

const router = express.Router();

router.get("/:cursoId/byCurso", calificacionesControllers.getCalificacionesByCurso);

router.use(checkAuth);

router.get("/:userId/", calificacionesControllers.getCalificacionesByUser);

router.post("/", calificacionesControllers.createCalificacion);

router.delete("/:calificacionId/rechazar", calificacionesControllers.rechazarCalificacion);

router.delete("/:calificacionId/eliminar", calificacionesControllers.deleteCalificacion);

router.patch("/:calificacionId/aceptar", calificacionesControllers.aceptarCalificacion);

router.patch("/:calificacionId/editar", calificacionesControllers.editarCalificacion);

module.exports = router;
