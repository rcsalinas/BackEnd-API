const express = require("express");
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const cursosControllers = require("../controllers/cursos-controllers");

const router = express.Router();

router.get("/", cursosControllers.getCursos);
router.get("/:cursoId", cursosControllers.getCursoById);

router.use(checkAuth);

router.get("/user/:userId", cursosControllers.getCursosByUserId);

router.post("/", fileUpload.single("image"), cursosControllers.createCurso);

router.patch("/:cursoId", fileUpload.single("image"), cursosControllers.updateCurso);

router.patch("/:cursoId/publicar", cursosControllers.publicarCursoPorId);

router.patch("/:cursoId/despublicar", cursosControllers.despublicarCursoPorId);

router.delete("/:cursoId/eliminar", cursosControllers.eliminarCursoPorId);

module.exports = router;
