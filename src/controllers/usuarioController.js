var usuarioModel = require("../models/usuarioModel");

function autenticar(req, res) {
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;

    if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está indefinida!");
    } else {

        usuarioModel.autenticar(email, senha)
            .then(
                function (resultadoAutenticar) {
                    console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);
                    console.log(`Resultados: ${JSON.stringify(resultadoAutenticar)}`); 

                    if (resultadoAutenticar.length == 1) {
                        console.log(resultadoAutenticar);

                        var usuario = resultadoAutenticar[0];

                        if (!usuario.status_usuario) {
                            res.status(403).send("Este usuário está inativo.");
                        } else if (usuario.status_aprovacao == "PENDENTE") {
                            res.status(403).send("O cadastro da empresa ainda está aguardando aprovação.");
                        } else if (usuario.status_aprovacao == "RECUSADO") {
                            res.status(403).send("O cadastro da empresa foi recusado.");
                        } else {
                            res.json({
                                id_usuario: usuario.id_usuario,
                                email: usuario.email,
                                nome: usuario.nome,
                                cargo: usuario.cargo,
                                cnpj: usuario.cnpj
                            });
                        }
                                
                    } else if (resultadoAutenticar.length == 0) {
                        res.status(403).send("Email e/ou senha inválido(s)");
                    } else {
                        res.status(403).send("Mais de um usuário com o mesmo login e senha!");
                    }
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log("\nHouve um erro ao realizar o login! Erro: ", erro.sqlMessage);
                    var mensagemErro = erro.code == "ECONNREFUSED"
                        ? "Não foi possível conectar ao banco de dados. Verifique se o MySQL está ligado."
                        : erro.sqlMessage || erro.message || "Não foi possível realizar o login.";
                    res.status(500).json({
                        mensagem: mensagemErro
                    });
                }
            );
    }

}

function cadastrar(req, res) {
    
    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;
    var cnpj = req.body.cnpjServer;
    var razaoSocial = req.body.razaoSocialServer;
    var cargo = req.body.cargoServer;

    if (nome == undefined) {
        res.status(400).send("Seu nome está undefined!");
    } else if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está undefined!");
    } else if (cnpj == undefined) {
        res.status(400).send("Sua senha está undefined!");
    } else {

        // Passe os valores como parâmetro e vá para o arquivo usuarioModel.js
        usuarioModel.cadastrar(nome, email, senha, cnpj, razaoSocial, cargo)
            .then(
                function (resultado) {
                    res.json({ mensagem: "Cadastro realizado! Aguarde a aprovação da empresa para entrar." });
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log(
                        "\nHouve um erro ao realizar o cadastro! Erro: ",
                        erro.sqlMessage
                    );
                    var mensagemErro = erro.code == "ECONNREFUSED"
                        ? "Não foi possível conectar ao banco de dados. Verifique se o MySQL está ligado."
                        : erro.sqlMessage || erro.message || "Não foi possível realizar o cadastro.";
                    res.status(500).json({
                        mensagem: mensagemErro
                    });
                }
            );
    }
}

module.exports = {
    autenticar,
    cadastrar
}
