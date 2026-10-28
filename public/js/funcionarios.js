
var idUsuario = sessionStorage.ID_USUARIO;
var funcionarios = [];
var funcionariosExibidos = [];
var idFuncionarioEmEdicao = null;

var NIVEIS = {
    FUNCIONARIO: 1,
    GERENTE: 2,
    ADMIN_MASTER: 3
};

var NOMES_NIVEIS = {
    FUNCIONARIO: "Funcionário",
    GERENTE: "Gerente",
    ADMIN_MASTER: "Administrador"
};

// Verifica se o usuario esta logado
if (idUsuario == null) {
    window.location = "login_usuario.html";
}

document.getElementById("nome_usuario_dashboard").textContent =
    sessionStorage.NOME_USUARIO || "Aircode";

// Mostra mensagem de erro
function mostrarErro(texto) {
    var erro = document.getElementById("erro_funcionario");

    erro.textContent = texto;
    erro.hidden = texto == "";
}

// Busca o nivel de acesso do usuario logado
function meuNivel() {
    for (var i = 0; i < funcionarios.length; i++) {
        if (funcionarios[i].id_usuario == idUsuario) {
            return funcionarios[i].nivel_acesso;
        }
    }

    return "FUNCIONARIO";
}

// Verifica se posso gerenciar outro funcionario
function podeGerenciar(nivelAlvo) {
    var nivel = meuNivel();

    if (nivel == "ADMIN_MASTER") {
        return true;
    }

    return NIVEIS[nivel] > NIVEIS[nivelAlvo];
}

// Preenche as opcoes de nivel de acesso
function preencherNiveis(nivelSelecionado) {
    var select = document.getElementById("nivel_funcionario");
    var opcoes = "";

    for (var nivel in NIVEIS) {
        if (meuNivel() == "ADMIN_MASTER" ||
            NIVEIS[nivel] < NIVEIS[meuNivel()] ||
            nivel == nivelSelecionado) {

            opcoes += "<option value='" + nivel + "'>" +
                NOMES_NIVEIS[nivel] + "</option>";
        }
    }

    select.innerHTML = opcoes;
    select.value = nivelSelecionado || "FUNCIONARIO";

    select.disabled =
        nivelSelecionado != null &&
        !podeGerenciar(nivelSelecionado);
}

// Carrega os funcionarios do banco
function carregarFuncionarios() {
    var lista = document.getElementById("lista_funcionarios");

    lista.innerHTML =
        "<p class='mensagem_tabela'>Carregando...</p>";

    fetch("/funcionarios/listar/" + idUsuario)
        .then(function (resposta) {
            if (!resposta.ok) {
                throw new Error("Erro ao carregar funcionarios.");
            }

            return resposta.json();
        })
        .then(function (dados) {
            funcionarios = dados;

            document.getElementById("botao_adicionar").hidden =
                meuNivel() == "FUNCIONARIO";

            renderizarLista();
        })
        .catch(function () {
            lista.innerHTML =
                "<p class='mensagem_tabela'>" +
                "Nao foi possivel carregar os funcionarios.</p>";
        });
}

// Protege os textos para nao interpretar dados como HTML
function protegerTexto(texto) {
    return String(texto == null ? "" : texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Monta a lista de funcionarios
function renderizarLista() {
    var termo = document.getElementById("campo_busca")
        .value.toLowerCase().trim();

    var lista = document.getElementById("lista_funcionarios");
    var html = "";
    var quantidade = 0;

    funcionariosExibidos = [];

    for (var i = 0; i < funcionarios.length; i++) {
        var f = funcionarios[i];

        var dados = (
            f.nome + " " +
            f.email + " " +
            (f.cargo || "-")
        ).toLowerCase();

        if (dados.indexOf(termo) != -1) {
            funcionariosExibidos.push(f);

            html += "<div class='linha_funcionario' role='row'>";

            html += "<span>" + protegerTexto(f.nome) + "</span>";
            html += "<span>" + protegerTexto(f.email) + "</span>";
            html += "<span>" + protegerTexto(f.cargo || "-") + "</span>";

            html += "<span class='coluna_acoes'>";

            if (podeGerenciar(f.nivel_acesso)) {
                html +=
                    "<button type='button' " +
                    "class='botao_editar_filtro_salvo' " +
                    "onclick='abrirModalPorIndice(" + quantidade + ")'>" +
                    "editar</button>";

                html +=
                    "<button type='button' " +
                    "class='botao_excluir_filtro' " +
                    "onclick='excluirPorIndice(" + quantidade + ")'>" +
                    "excluir</button>";
            }

            html += "</span>";
            html += "</div>";

            quantidade++;
        }
    }

    if (quantidade == 0) {
        html = "<p class='mensagem_tabela'>" +
            "Nenhum funcionario encontrado.</p>";
    }

    lista.innerHTML = html;
}

// Abre o modal para adicionar ou editar
function abrirModal(funcionario) {
    if (funcionario != null &&
        !podeGerenciar(funcionario.nivel_acesso)) {
        alert("Voce nao pode gerenciar este funcionario.");
        return;
    }

    idFuncionarioEmEdicao = funcionario
        ? funcionario.id_usuario
        : null;

    document.getElementById("titulo_modal_funcionario").textContent =
        funcionario ? "Editar funcionário" : "Adicionar funcionário";

    document.getElementById("nome_funcionario").value =
        funcionario ? funcionario.nome : "";

    document.getElementById("email_funcionario").value =
        funcionario ? funcionario.email : "";

    document.getElementById("cargo_funcionario").value =
        funcionario ? (funcionario.cargo || "") : "";

    preencherNiveis(
        funcionario ? funcionario.nivel_acesso : "FUNCIONARIO"
    );

    document.getElementById("senha_funcionario").value = "";

    document.getElementById("senha_funcionario").required =
        funcionario == null;

    document.getElementById("campo_senha_funcionario").hidden =
        funcionario != null;

    mostrarErro("");

    document.getElementById("modal_funcionario").hidden = false;
    document.getElementById("nome_funcionario").focus();
}

// Localiza o funcionario selecionado para editar
function abrirModalPorIndice(indice) {
    abrirModal(funcionariosExibidos[indice]);
}

// Fecha o modal
function fecharModal() {
    document.getElementById("modal_funcionario").hidden = true;
}

// Le a mensagem de erro enviada pelo servidor
function lerMensagem(resposta, mensagemPadrao) {
    return resposta.json()
        .then(function (dados) {
            return dados.mensagem || mensagemPadrao;
        })
        .catch(function () {
            return mensagemPadrao;
        });
}

// Salva um funcionario novo ou editado
function salvarFuncionario(evento) {
    evento.preventDefault();
    mostrarErro("");

    var botao = document.getElementById("botao_salvar_funcionario");

    var corpo = {
        idUsuarioServer: idUsuario,
        nomeServer: document.getElementById("nome_funcionario").value.trim(),
        emailServer: document.getElementById("email_funcionario").value.trim(),
        cargoServer: document.getElementById("cargo_funcionario").value.trim(),
        nivelAcessoServer: document.getElementById("nivel_funcionario").value
    };

    var url = "/funcionarios/adicionar";
    var metodo = "POST";

    if (idFuncionarioEmEdicao != null) {
        url = "/funcionarios/editar/" + idFuncionarioEmEdicao;
        metodo = "PUT";
    } else {
        corpo.senhaServer =
            document.getElementById("senha_funcionario").value;
    }

    botao.disabled = true;

    fetch(url, {
        method: metodo,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(corpo)
    })
        .then(function (resposta) {
            if (!resposta.ok) {
                return lerMensagem(
                    resposta,
                    "Nao foi possivel salvar o funcionario."
                ).then(function (mensagem) {
                    throw new Error(mensagem);
                });
            }

            fecharModal();
            carregarFuncionarios();
        })
        .catch(function (erro) {
            mostrarErro(
                erro.message || "Nao foi possivel conectar ao servidor."
            );
        })
        .finally(function () {
            botao.disabled = false;
        });
}

// Exclui o funcionario selecionado
function excluirFuncionario(funcionario) {
    if (!podeGerenciar(funcionario.nivel_acesso)) {
        alert("Voce nao pode excluir este funcionario.");
        return;
    }

    if (!confirm("Deseja excluir " + funcionario.nome + "?")) {
        return;
    }

    fetch(
        "/funcionarios/excluir/" +
        idUsuario + "/" + funcionario.id_usuario,
        {
            method: "DELETE"
        }
    )
        .then(function (resposta) {
            if (!resposta.ok) {
                return lerMensagem(
                    resposta,
                    "Nao foi possivel excluir o funcionario."
                ).then(function (mensagem) {
                    throw new Error(mensagem);
                });
            }

            carregarFuncionarios();
        })
        .catch(function (erro) {
            alert(erro.message || "Erro ao conectar ao servidor.");
        });
}

// Localiza o funcionario selecionado para excluir
function excluirPorIndice(indice) {
    excluirFuncionario(funcionariosExibidos[indice]);
}

// Eventos dos botoes e campos
document.getElementById("botao_adicionar")
    .addEventListener("click", function () {
        abrirModal(null);
    });

document.getElementById("botao_fechar_modal")
    .addEventListener("click", fecharModal);

document.getElementById("modal_funcionario")
    .addEventListener("click", function (evento) {
        if (evento.target.id == "modal_funcionario") {
            fecharModal();
        }
    });

document.addEventListener("keydown", function (evento) {
    if (evento.key == "Escape") {
        fecharModal();
    }
});

document.getElementById("formulario_funcionario")
    .addEventListener("submit", salvarFuncionario);

document.getElementById("campo_busca")
    .addEventListener("input", renderizarLista);

// Inicia a pagina
carregarFuncionarios();
