var idUsuario = sessionStorage.ID_USUARIO;
var funcionarios = [];
var idFuncionarioEmEdicao = null;

// Mesma hierarquia do backend (o backend é quem realmente valida)
var NIVEIS = { FUNCIONARIO: 1, GERENTE: 2, ADMIN_MASTER: 3 };
var NOMES_NIVEIS = { FUNCIONARIO: "Funcionário", GERENTE: "Gerente", ADMIN_MASTER: "Administrador" };

function meuNivel() {
    var eu = funcionarios.find(function (f) {
        return String(f.id_usuario) == String(idUsuario);
    });
    return eu ? eu.nivel_acesso : "FUNCIONARIO";
}

function podeGerenciar(nivelAlvo) {
    var nivel = meuNivel();
    return nivel == "ADMIN_MASTER" || NIVEIS[nivel] > NIVEIS[nivelAlvo];
}

function niveisPermitidos() {
    var nivel = meuNivel();
    return Object.keys(NIVEIS).filter(function (n) {
        return nivel == "ADMIN_MASTER" || NIVEIS[n] < NIVEIS[nivel];
    });
}

function preencherNiveis(selecionado) {
    var select = document.getElementById("nivel_funcionario");
    select.innerHTML = "";
    var opcoes = niveisPermitidos();
    if (selecionado && opcoes.indexOf(selecionado) == -1) {
        opcoes.push(selecionado);
    }
    opcoes.forEach(function (n) {
        var opcao = document.createElement("option");
        opcao.value = n;
        opcao.textContent = NOMES_NIVEIS[n];
        select.appendChild(opcao);
    });
    select.value = selecionado || "FUNCIONARIO";
    select.disabled = selecionado && niveisPermitidos().indexOf(selecionado) == -1;
}

if (idUsuario == null) {
    window.location = "login_usuario.html";
}

document.getElementById("nome_usuario_dashboard").textContent = sessionStorage.NOME_USUARIO || "Aircode";

function mostrarErro(texto) {
    var erro = document.getElementById("erro_funcionario");
    erro.textContent = texto;
    erro.hidden = !texto;
}

async function lerMensagem(resposta, padrao) {
    try {
        var json = await resposta.json();
        return json.mensagem || padrao;
    } catch (e) {
        return padrao;
    }
}

function carregarFuncionarios() {
    var lista = document.getElementById("lista_funcionarios");
    lista.innerHTML = '<p class="mensagem_tabela">Carregando...</p>';

    fetch("/funcionarios/listar/" + idUsuario)
        .then(function (resposta) {
            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os funcionários.");
            }
            return resposta.json();
        })
        .then(function (dados) {
            funcionarios = dados;
            document.getElementById("botao_adicionar").hidden = meuNivel() == "FUNCIONARIO";
            renderizarLista();
        })
        .catch(function (erro) {
            lista.innerHTML = '<p class="mensagem_tabela">' + erro.message + "</p>";
        });
}

function renderizarLista() {
    var termo = document.getElementById("campo_busca").value.trim().toLowerCase();
    var lista = document.getElementById("lista_funcionarios");
    lista.innerHTML = "";

    var filtrados = funcionarios.filter(function (f) {
        return [f.nome, f.email, f.cargo].join(" ").toLowerCase().includes(termo);
    });

    if (filtrados.length == 0) {
        lista.innerHTML = '<p class="mensagem_tabela">Nenhum funcionário encontrado.</p>';
        return;
    }

    filtrados.forEach(function (f) {
        var linha = document.createElement("div");
        linha.className = "linha_funcionario";
        linha.setAttribute("role", "row");

        [f.nome, f.email, f.cargo || "-"].forEach(function (texto) {
            var celula = document.createElement("span");
            celula.textContent = texto;
            linha.appendChild(celula);
        });

        var acoes = document.createElement("span");
        acoes.className = "coluna_acoes";

        if (!podeGerenciar(f.nivel_acesso)) {
            linha.appendChild(acoes);
            lista.appendChild(linha);
            return;
        }

        var botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "botao_editar_filtro_salvo";
        botaoEditar.textContent = "editar";
        botaoEditar.addEventListener("click", function () {
            abrirModal(f);
        });

        var botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.className = "botao_excluir_filtro";
        botaoExcluir.textContent = "excluir";
        botaoExcluir.addEventListener("click", function () {
            excluirFuncionario(f);
        });

        acoes.appendChild(botaoEditar);
        acoes.appendChild(botaoExcluir);
        linha.appendChild(acoes);
        lista.appendChild(linha);
    });
}

function abrirModal(funcionario) {
    idFuncionarioEmEdicao = funcionario ? funcionario.id_usuario : null;
    document.getElementById("titulo_modal_funcionario").textContent = funcionario ? "Editar funcionário" : "Adicionar funcionário";
    document.getElementById("nome_funcionario").value = funcionario ? funcionario.nome : "";
    document.getElementById("email_funcionario").value = funcionario ? funcionario.email : "";
    document.getElementById("cargo_funcionario").value = funcionario ? (funcionario.cargo || "") : "";
    preencherNiveis(funcionario ? funcionario.nivel_acesso : "FUNCIONARIO");
    document.getElementById("senha_funcionario").value = "";
    document.getElementById("senha_funcionario").required = !funcionario;
    document.getElementById("campo_senha_funcionario").hidden = !!funcionario;
    mostrarErro("");
    document.getElementById("modal_funcionario").hidden = false;
    document.getElementById("nome_funcionario").focus();
}

function fecharModal() {
    document.getElementById("modal_funcionario").hidden = true;
}

async function salvarFuncionario(evento) {
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

    if (idFuncionarioEmEdicao) {
        url = "/funcionarios/editar/" + idFuncionarioEmEdicao;
        metodo = "PUT";
    } else {
        corpo.senhaServer = document.getElementById("senha_funcionario").value;
    }

    botao.disabled = true;

    try {
        var resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo)
        });

        if (!resposta.ok) {
            mostrarErro(await lerMensagem(resposta, "Não foi possível salvar o funcionário."));
            return;
        }

        fecharModal();
        carregarFuncionarios();
    } catch (erro) {
        mostrarErro("Não foi possível conectar ao servidor.");
    } finally {
        botao.disabled = false;
    }
}

async function excluirFuncionario(funcionario) {
    if (!confirm("Deseja excluir " + funcionario.nome + "?")) {
        return;
    }

    try {
        var resposta = await fetch("/funcionarios/excluir/" + idUsuario + "/" + funcionario.id_usuario, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            alert(await lerMensagem(resposta, "Não foi possível excluir o funcionário."));
            return;
        }

        carregarFuncionarios();
    } catch (erro) {
        alert("Não foi possível conectar ao servidor.");
    }
}

document.getElementById("botao_adicionar").addEventListener("click", function () {
    abrirModal(null);
});
document.getElementById("botao_fechar_modal").addEventListener("click", fecharModal);
document.getElementById("modal_funcionario").addEventListener("click", function (evento) {
    if (evento.target.id == "modal_funcionario") {
        fecharModal();
    }
});
document.addEventListener("keydown", function (evento) {
    if (evento.key == "Escape") {
        fecharModal();
    }
});
document.getElementById("formulario_funcionario").addEventListener("submit", salvarFuncionario);
document.getElementById("campo_busca").addEventListener("input", renderizarLista);

carregarFuncionarios();
