var funcionarioModel = require("../models/funcionarioModel");

// Hierarquia: quanto maior o número, maior o poder
var NIVEIS = {
    FUNCIONARIO: 1,
    GERENTE: 2,
    ADMIN_MASTER: 3
};

// ADMIN_MASTER gerencia qualquer um; GERENTE só quem tem nível menor (FUNCIONARIO); FUNCIONARIO ninguém
function podeGerenciar(nivelAtor, nivelAlvo) {
    if (nivelAtor == "ADMIN_MASTER") {
        return true;
    }
    return NIVEIS[nivelAtor] > NIVEIS[nivelAlvo];
}

// Nível que o ator pode atribuir a alguém (admin qualquer um; gerente só FUNCIONARIO)
function podeAtribuir(nivelAtor, nivelNovo) {
    if (NIVEIS[nivelNovo] == undefined) {
        return false;
    }
    if (nivelAtor == "ADMIN_MASTER") {
        return true;
    }
    return NIVEIS[nivelNovo] < NIVEIS[nivelAtor];
}

function tratarErro(res, erro, mensagemPadrao) {
    console.log(erro);
    var mensagemErro = erro.code == "ECONNREFUSED"
        ? "Não foi possível conectar ao banco de dados. Verifique se o MySQL está ligado."
        : erro.code == "ER_DUP_ENTRY"
            ? "Já existe um usuário com este email."
            : erro.sqlMessage || erro.message || mensagemPadrao;
    res.status(500).json({ mensagem: mensagemErro });
}

// Busca quem está agindo e o alvo, garantindo que são da mesma empresa
async function carregarAtorEAlvo(idUsuario, idFuncionario) {
    var atores = await funcionarioModel.buscarUsuario(idUsuario);
    var alvos = await funcionarioModel.buscarUsuario(idFuncionario);

    if (atores.length == 0 || alvos.length == 0 || atores[0].id_empresa != alvos[0].id_empresa) {
        return null;
    }
    return { ator: atores[0], alvo: alvos[0] };
}

function listar(req, res) {
    var idUsuario = req.params.idUsuario;

    funcionarioModel.listar(idUsuario)
        .then(function (resultado) {
            res.json(resultado);
        }).catch(function (erro) {
            tratarErro(res, erro, "Não foi possível listar os funcionários.");
        });
}

async function adicionar(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;
    var cargo = req.body.cargoServer;
    var nivelAcesso = req.body.nivelAcessoServer || "FUNCIONARIO";

    if (idUsuario == undefined) {
        return res.status(400).send("O id do usuário está undefined!");
    } else if (nome == undefined) {
        return res.status(400).send("O nome está undefined!");
    } else if (email == undefined) {
        return res.status(400).send("O email está undefined!");
    } else if (senha == undefined) {
        return res.status(400).send("A senha está undefined!");
    }

    try {
        var atores = await funcionarioModel.buscarUsuario(idUsuario);

        if (atores.length == 0) {
            return res.status(404).json({ mensagem: "Usuário não encontrado." });
        }
        if (!podeAtribuir(atores[0].nivel_acesso, nivelAcesso)) {
            return res.status(403).json({ mensagem: "Você não tem permissão para criar um usuário com este nível de acesso." });
        }

        await funcionarioModel.adicionar(atores[0].id_empresa, nome, email, senha, cargo, nivelAcesso);
        res.json({ mensagem: "Funcionário adicionado!" });
    } catch (erro) {
        tratarErro(res, erro, "Não foi possível adicionar o funcionário.");
    }
}

async function editar(req, res) {
    var idFuncionario = req.params.idFuncionario;
    var idUsuario = req.body.idUsuarioServer;
    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var cargo = req.body.cargoServer;
    var nivelAcesso = req.body.nivelAcessoServer;

    if (idUsuario == undefined) {
        return res.status(400).send("O id do usuário está undefined!");
    } else if (nome == undefined) {
        return res.status(400).send("O nome está undefined!");
    } else if (email == undefined) {
        return res.status(400).send("O email está undefined!");
    }

    try {
        var envolvidos = await carregarAtorEAlvo(idUsuario, idFuncionario);

        if (!envolvidos) {
            return res.status(404).json({ mensagem: "Funcionário não encontrado." });
        }
        if (!podeGerenciar(envolvidos.ator.nivel_acesso, envolvidos.alvo.nivel_acesso)) {
            return res.status(403).json({ mensagem: "Você não tem permissão para editar este funcionário." });
        }

        // se o nível não vier, mantém o atual
        if (nivelAcesso == undefined) {
            nivelAcesso = envolvidos.alvo.nivel_acesso;
        } else if (nivelAcesso != envolvidos.alvo.nivel_acesso && !podeAtribuir(envolvidos.ator.nivel_acesso, nivelAcesso)) {
            return res.status(403).json({ mensagem: "Você não tem permissão para atribuir este nível de acesso." });
        }

        await funcionarioModel.editar(idFuncionario, nome, email, cargo, nivelAcesso);
        res.json({ mensagem: "Funcionário atualizado!" });
    } catch (erro) {
        tratarErro(res, erro, "Não foi possível editar o funcionário.");
    }
}

async function excluir(req, res) {
    var idFuncionario = req.params.idFuncionario;
    var idUsuario = req.params.idUsuario;

    if (idFuncionario == idUsuario) {
        return res.status(400).json({ mensagem: "Você não pode excluir o seu próprio usuário." });
    }

    try {
        var envolvidos = await carregarAtorEAlvo(idUsuario, idFuncionario);

        if (!envolvidos) {
            return res.status(404).json({ mensagem: "Funcionário não encontrado." });
        }
        if (!podeGerenciar(envolvidos.ator.nivel_acesso, envolvidos.alvo.nivel_acesso)) {
            return res.status(403).json({ mensagem: "Você não tem permissão para excluir este funcionário." });
        }

        await funcionarioModel.excluir(idFuncionario);
        res.json({ mensagem: "Funcionário excluído!" });
    } catch (erro) {
        tratarErro(res, erro, "Não foi possível excluir o funcionário.");
    }
}

module.exports = {
    listar,
    adicionar,
    editar,
    excluir
};
