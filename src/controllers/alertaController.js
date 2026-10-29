const alertaModel = require("../models/alertaModel");

function lerIdUsuario(req) {
    const idUsuario = Number(req.query.idUsuario || (req.body && req.body.idUsuario));
    return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

function erro(res, error) {
    console.log("Erro na operação de alertas.", error.sqlMessage || error.message);
    res.status(500).json({ mensagem: error.sqlMessage || error.message || "Não foi possível concluir a operação." });
}

function validarNome(nome) {
    return typeof nome === "string" && nome.trim().length > 0 && nome.trim().length <= 100;
}

function listarEstados(req, res) {
    if (!lerIdUsuario(req)) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.listarEstados()
        .then(resultado => res.json(resultado))
        .catch(error => erro(res, error));
}

function listarAncoras(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.listarAncoras(idUsuario)
        .then(resultado => res.json(resultado))
        .catch(error => erro(res, error));
}

function obterAncora(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.obterAncora(idUsuario, req.params.id)
        .then(resultado => resultado
            ? res.json(resultado)
            : res.status(404).json({ mensagem: "Âncora não encontrada." }))
        .catch(error => erro(res, error));
}

function salvarAncora(req, res) {
    const idUsuario = lerIdUsuario(req);
    const { nome, indicador, estado, posicao, valor, operador } = req.body;
    const indicadores = ["destinos", "destaque", "faturamento", "avaliacao", "resolucao", "reclamacao", "frequente"];
    const posicaoTop = Number(posicao);
    const valorAlvo = valor === "" || valor === null || valor === undefined ? null : Number(valor);

    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    if (!validarNome(nome)) return res.status(400).json({ mensagem: "Informe um nome para a âncora (até 100 caracteres)." });
    if (!indicadores.includes(indicador)) return res.status(400).json({ mensagem: "Selecione um indicador válido." });
    if ((indicador === "destinos" || indicador === "destaque") && (!/^[A-Z]{2}$/.test(estado) || posicaoTop < 1 || posicaoTop > 3)) {
        return res.status(400).json({ mensagem: "Selecione um estado e uma posição entre 1 e 3." });
    }
    if (indicador !== "destinos" && indicador !== "destaque" && (!Number.isFinite(valorAlvo) || ![">", ">=", "<", "<=", "="].includes(operador))) {
        return res.status(400).json({ mensagem: "Informe um valor alvo e um comparador válidos." });
    }
    if ((indicador === "avaliacao" && (valorAlvo < 0 || valorAlvo > 5))
        || (indicador === "resolucao" && (valorAlvo < 0 || valorAlvo > 100))
        || (valorAlvo !== null && valorAlvo < 0)) {
        return res.status(400).json({ mensagem: "O valor alvo está fora do intervalo permitido." });
    }

    alertaModel.salvarAncora(idUsuario, {
        id: req.body.id || null,
        nome: nome.trim(),
        indicador,
        estado: indicador === "destinos" || indicador === "destaque" ? estado : null,
        posicao: indicador === "destinos" || indicador === "destaque" ? posicaoTop : null,
        valor: indicador === "destinos" || indicador === "destaque" ? null : valorAlvo,
        operador: operador || ">="
    })
        .then(id => res.status(200).json({ id: id, mensagem: "Âncora salva." }))
        .catch(error => erro(res, error));
}

function excluirAncora(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.excluirAncora(idUsuario, req.params.id)
        .then(() => res.json({ mensagem: "Âncora excluída." }))
        .catch(error => erro(res, error));
}

function listarAlertas(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.listarAlertas(idUsuario)
        .then(resultado => res.json(resultado))
        .catch(error => erro(res, error));
}

function obterAlerta(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.obterAlerta(idUsuario, req.params.id)
        .then(resultado => resultado
            ? res.json(resultado)
            : res.status(404).json({ mensagem: "Alerta não encontrado." }))
        .catch(error => erro(res, error));
}

function salvarAlerta(req, res) {
    const idUsuario = lerIdUsuario(req);
    const { nome, idAncora, filtro, mensagem } = req.body;
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    if (!validarNome(nome)) return res.status(400).json({ mensagem: "Informe um nome para o alerta." });
    if (!Number.isInteger(Number(idAncora))) return res.status(400).json({ mensagem: "Selecione uma âncora." });
    if (typeof mensagem !== "string" || !mensagem.trim()) return res.status(400).json({ mensagem: "Escreva a mensagem do alerta." });

    alertaModel.salvarAlerta(idUsuario, {
        id: req.body.id || null,
        idAncora: Number(idAncora),
        nome: nome.trim(),
        filtro: filtro || null,
        mensagem: mensagem.trim()
    })
        .then(id => res.status(200).json({ id: id, mensagem: "Alerta salvo." }))
        .catch(error => erro(res, error));
}

function alterarStatus(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.alterarStatusAlerta(idUsuario, req.params.id, Boolean(req.body.ativo))
        .then(() => res.json({ mensagem: "Status atualizado." }))
        .catch(error => erro(res, error));
}

function excluirAlerta(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.excluirAlerta(idUsuario, req.params.id)
        .then(() => res.json({ mensagem: "Alerta excluído." }))
        .catch(error => erro(res, error));
}

function avaliar(req, res) {
    const idUsuario = lerIdUsuario(req);
    if (!idUsuario) return res.status(400).json({ mensagem: "Usuário inválido." });
    alertaModel.avaliarAlertas(idUsuario)
        .then(resultado => res.json(resultado))
        .catch(error => erro(res, error));
}

module.exports = {
    listarEstados,
    listarAncoras,
    obterAncora,
    salvarAncora,
    excluirAncora,
    listarAlertas,
    obterAlerta,
    salvarAlerta,
    alterarStatus,
    excluirAlerta,
    avaliar
};
