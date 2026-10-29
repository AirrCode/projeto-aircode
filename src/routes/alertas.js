const express = require("express");
const router = express.Router();
const alertaController = require("../controllers/alertaController");

router.get("/estados", alertaController.listarEstados);
router.get("/ancoras", alertaController.listarAncoras);
router.get("/ancoras/:id", alertaController.obterAncora);
router.post("/ancoras", alertaController.salvarAncora);
router.put("/ancoras/:id", function (req, res) {
    req.body.id = req.params.id;
    alertaController.salvarAncora(req, res);
});
router.delete("/ancoras/:id", alertaController.excluirAncora);
router.get("/avaliar", alertaController.avaliar);
router.get("/", alertaController.listarAlertas);
router.get("/:id", alertaController.obterAlerta);
router.post("/", alertaController.salvarAlerta);
router.put("/:id", function (req, res) {
    req.body.id = req.params.id;
    alertaController.salvarAlerta(req, res);
});
router.patch("/:id/status", alertaController.alterarStatus);
router.delete("/:id", alertaController.excluirAlerta);

module.exports = router;
