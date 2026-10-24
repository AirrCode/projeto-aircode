var express = require("express");
var router = express.Router();

var aprovacaoController = require("../controllers/aprovacaoController");

router.get("/pendentes", function (req, res) {
    aprovacaoController.listarPendentes(req, res);
});

router.put("/aprovar/:idEmpresa", function (req, res) {
    aprovacaoController.aprovar(req, res);
});

router.put("/rejeitar/:idEmpresa", function (req, res) {
    aprovacaoController.rejeitar(req, res);
});

module.exports = router;