
var funcionarioModel = require("../models/funcionarioModel");

// Hierarquia dos niveis de acesso
var NIVEIS = {
    FUNCIONARIO: 1,
    GERENTE: 2,
    ADMIN_MASTER: 3
};

// Verifica se o usuario pode gerenciar outro funcionario
function podeGerenciar(nivelAtor, nivelAlvo) {
    if (nivelAtor == "ADMIN_MASTER") {
        return true;
    }

    return NIVEIS[nivelAtor] > NIVEIS[nivelAlvo];
}

// Verifica qual nivel o usuario pode atribuir
function podeAtribuir(nivelAtor, nivelNovo) {
    if (NIVEIS[nivelNovo] == undefined) {
        return false;
    }

    if (nivelAtor == "ADMIN_MASTER") {
        return true;
    }

    return NIVEIS[nivelNovo] < NIVEIS[nivelAtor];
}

// Trata os erros do sistema
function tratarErro(res, erro, mensagemPadrao) {
    console.log(erro);

    var mensagemErro = mensagemPadrao;

    if (erro.code == "ECONNREFUSED") {
        mensagemErro =
            "Nao foi possivel conectar ao banco de dados. Verifique se o MySQL esta ligado.";
    } else if (erro.code == "ER_DUP_ENTRY") {
        mensagemErro = "Ja existe um usuario com este email.";
    } else if (erro.sqlMessage) {
        mensagemErro = erro.sqlMessage;
    } else if (erro.message) {
        mensagemErro = erro.message;
    }

    res.status(500).json({
        mensagem: mensagemErro
    });
}

// Busca o usuario que esta fazendo a acao e o funcionario alvo
// Os dois precisam pertencer a mesma empresa
async function carregarAtorEAlvo(idUsuario, idFuncionario) {
    var atores = await funcionarioModel.buscarUsuario(idUsuario);
    var alvos = await funcionarioModel.buscarUsuario(idFuncionario);

    if (atores.length == 0 || alvos.length == 0) {
        return null;
    }

    if (atores[0].id_empresa != alvos[0].id_empresa) {
        return null;
    }

    return {
        ator: atores[0],
        alvo: alvos[0]
    };
}

// Lista os funcionarios
function listar(req, res) {
    var idUsuario = req.params.idUsuario;

    funcionarioModel.listar(idUsuario)
        .then(function (resultado) {
            res.json(resultado);
        })
        .catch(function (erro) {
            tratarErro(
                res,
                erro,
                "Nao foi possivel listar os funcionarios."
            );
        });
}

// Adiciona um funcionario
async function adicionar(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;
    var cargo = req.body.cargoServer;
    var nivelAcesso = req.body.nivelAcessoServer || "FUNCIONARIO";

    // Verifica se os campos obrigatorios foram enviados
    if (idUsuario == undefined) {
        return res.status(400).json({
            mensagem: "O id do usuario nao foi informado."
        });
    }

    if (nome == undefined || nome.trim() == "") {
        return res.status(400).json({
            mensagem: "O nome nao foi informado."
        });
    }

    if (email == undefined || email.trim() == "") {
        return res.status(400).json({
            mensagem: "O email nao foi informado."
        });
    }

    if (senha == undefined || senha == "") {
        return res.status(400).json({
            mensagem: "A senha nao foi informada."
        });
    }

    try {
        var atores = await funcionarioModel.buscarUsuario(idUsuario);

        if (atores.length == 0) {
            return res.status(404).json({
                mensagem: "Usuario nao encontrado."
            });
        }

        // Verifica se o usuario pode criar esse nivel de acesso
        if (!podeAtribuir(atores[0].nivel_acesso, nivelAcesso)) {
            return res.status(403).json({
                mensagem: "Voce nao tem permissao para criar um usuario com este nivel de acesso."
            });
        }

        await funcionarioModel.adicionar(
            atores[0].id_empresa,
            nome,
            email,
            senha,
            cargo,
            nivelAcesso
        );

        res.json({
            mensagem: "Funcionario adicionado!"
        });
    } catch (erro) {
        tratarErro(
            res,
            erro,
            "Nao foi possivel adicionar o funcionario."
        );
    }
}

// Edita um funcionario
async function editar(req, res) {
    var idFuncionario = req.params.idFuncionario;
    var idUsuario = req.body.idUsuarioServer;
    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var cargo = req.body.cargoServer;
    var nivelAcesso = req.body.nivelAcessoServer;

    // Verifica os campos obrigatorios
    if (idUsuario == undefined) {
        return res.status(400).json({
            mensagem: "O id do usuario nao foi informado."
        });
    }

    if (nome == undefined || nome.trim() == "") {
        return res.status(400).json({
            mensagem: "O nome nao foi informado."
        });
    }

    if (email == undefined || email.trim() == "") {
        return res.status(400).json({
            mensagem: "O email nao foi informado."
        });
    }

    try {
        var envolvidos = await carregarAtorEAlvo(
            idUsuario,
            idFuncionario
        );

        if (envolvidos == null) {
            return res.status(404).json({
                mensagem: "Funcionario nao encontrado."
            });
        }

        // Verifica se pode editar o funcionario
        if (!podeGerenciar(
            envolvidos.ator.nivel_acesso,
            envolvidos.alvo.nivel_acesso
        )) {
            return res.status(403).json({
                mensagem: "Voce nao tem permissao para editar este funcionario."
            });
        }

        // Se o nivel nao foi enviado, mantem o atual
        if (nivelAcesso == undefined) {
            nivelAcesso = envolvidos.alvo.nivel_acesso;
        } else if (
            nivelAcesso != envolvidos.alvo.nivel_acesso &&
            !podeAtribuir(envolvidos.ator.nivel_acesso, nivelAcesso)
        ) {
            return res.status(403).json({
                mensagem: "Voce nao tem permissao para atribuir este nivel de acesso."
            });
        }

        await funcionarioModel.editar(
            idFuncionario,
            nome,
            email,
            cargo,
            nivelAcesso
        );

        res.json({
            mensagem: "Funcionario atualizado!"
        });
    } catch (erro) {
        tratarErro(
            res,
            erro,
            "Nao foi possivel editar o funcionario."
        );
    }
}

// Exclui um funcionario
async function excluir(req, res) {
    var idFuncionario = req.params.idFuncionario;
    var idUsuario = req.params.idUsuario;

    // Impede que o usuario exclua a propria conta
    if (idFuncionario == idUsuario) {
        return res.status(400).json({
            mensagem: "Voce nao pode excluir o seu proprio usuario."
        });
    }

    try {
        var envolvidos = await carregarAtorEAlvo(
            idUsuario,
            idFuncionario
        );

        if (envolvidos == null) {
            return res.status(404).json({
                mensagem: "Funcionario nao encontrado."
            });
        }

        // Verifica se pode excluir o funcionario
        if (!podeGerenciar(
            envolvidos.ator.nivel_acesso,
            envolvidos.alvo.nivel_acesso
        )) {
            return res.status(403).json({
                mensagem: "Voce nao tem permissao para excluir este funcionario."
            });
        }

        await funcionarioModel.excluir(idFuncionario);

        res.json({
            mensagem: "Funcionario excluido!"
        });
    } catch (erro) {
        tratarErro(
            res,
            erro,
            "Nao foi possivel excluir o funcionario."
        );
    }
}

// Exporta as funcoes para as rotas
module.exports = {
    listar,
    adicionar,
    editar,
    excluir
};
