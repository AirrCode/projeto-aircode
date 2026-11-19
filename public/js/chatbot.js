const URL_CHATBOT = "http://" + window.location.hostname + ":8000/chat";
let historicoChat = [];
let chatOcupado = false;
let chatJaAberto = false;

function lerTexto(id) {
    const elemento = document.getElementById(id);
    return elemento ? elemento.textContent.trim() : "";
}

function lerIndicador(idValor, idDetalhe) {
    const valor = lerTexto(idValor);
    const detalhe = lerTexto(idDetalhe);
    return detalhe ? valor + " (" + detalhe + ")" : valor;
}

function montarContextoDashboard() {
    const painel = obterPainelAtual();
    const filtro = obterFiltroAtual(painel);
    const estados = filtro ? obterEstadosSelecionados(filtro) : [];
    const companhias = filtro ? obterCompanhiasSelecionadas(filtro) : [];
    const contexto = {
        painel: painel,
        tipo_empresa: sessionStorage.SETOR_ATUACAO || "AGENCIA",
        periodo: obterTextoDoPeriodo(filtro),
        filtro_ativo: filtro ? {
            nome: filtro.nome,
            estado: estados.length
                ? estados.map(obterNomeEstado).join(", ")
                : "Todos os estados",
            companhia: companhias.length
                ? companhias.map(obterNomeCompanhia).join(", ")
                : "Todas as companhias",
            problema: filtro.problemas.length
                ? filtro.problemas.join(", ")
                : "Todos os problemas"
        } : null,
        indicadores: {}
    };

    if (painel === "destinos") {
        contexto.indicadores = {
            "Destinos mais procurados": lerTexto("kpi_destinos_valor"),
            "Destino com mais voos": lerIndicador("kpi_estado_destaque", "kpi_estado_destaque_detalhe"),
            "Quantidade de viajantes internacionais": lerIndicador("kpi_internacionais_valor", "kpi_internacionais_detalhe")
        };
    } else {
        contexto.indicadores = {
            "Avaliação média": lerIndicador("kpi_avaliacao", "kpi_avaliacao_detalhe"),
            "Taxa de resolução": lerIndicador("kpi_resolucao", "kpi_resolucao_detalhe"),
            "Total de reclamações": lerIndicador("kpi_reclamacoes", "kpi_reclamacoes_detalhe"),
            "Problema mais frequente": lerIndicador("kpi_problema", "kpi_problema_detalhe")
        };
    }

    return contexto;
}

function adicionarMensagem(papel, texto) {
    const area = document.getElementById("mensagens_chat");
    const mensagem = document.createElement("div");
    mensagem.className = "mensagem_chat mensagem_" + papel;
    mensagem.textContent = texto;
    area.appendChild(mensagem);
    area.scrollTop = area.scrollHeight;
    return mensagem;
}

function abrirChat() {
    document.getElementById("janela_chat").hidden = false;
    document.getElementById("campo_chat").focus();

    if (!chatJaAberto) {
        chatJaAberto = true;
        adicionarMensagem("assistente", "Oi! Eu leio os números que estão na sua tela. Pergunte algo ou peça uma análise, por exemplo: \"resuma o que estou vendo\".");
    }
}

function fecharChat() {
    document.getElementById("janela_chat").hidden = true;
}

async function enviarPergunta(evento) {
    evento.preventDefault();

    if (chatOcupado) {
        return;
    }

    const campo = document.getElementById("campo_chat");
    const botao = document.getElementById("botao_enviar_chat");
    const pergunta = campo.value.trim();

    if (pergunta == "") {
        return;
    }

    campo.value = "";
    adicionarMensagem("usuario", pergunta);
    const mensagemResposta = adicionarMensagem("assistente", "Analisando...");

    chatOcupado = true;
    botao.disabled = true;

    try {
        const resposta = await fetch(URL_CHATBOT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensagem: pergunta,
                historico: historicoChat,
                dashboard: montarContextoDashboard()
            })
        });

        if (!resposta.ok) {
            let detalhe = "";
            try {
                const corpo = await resposta.json();
                detalhe = corpo.detail || corpo.mensagem || "";
            } catch (erroJson) {
                detalhe = "";
            }
            throw new Error(detalhe || "Status " + resposta.status);
        }

        const json = await resposta.json();
        mensagemResposta.textContent = json.resposta;

        historicoChat.push({ role: "user", content: pergunta });
        historicoChat.push({ role: "assistant", content: json.resposta });
        historicoChat = historicoChat.slice(-10);
    } catch (erro) {
        console.log("Erro no chatbot: ", erro);
        mensagemResposta.textContent = erro instanceof TypeError
            ? "Não foi possível conectar ao servidor do chatbot. Confira se ele está ligado e tente novamente."
            : erro.message || "Não consegui responder agora. Tente novamente.";
    } finally {
        chatOcupado = false;
        botao.disabled = false;
        const area = document.getElementById("mensagens_chat");
        area.scrollTop = area.scrollHeight;
        campo.focus();
    }
}

document.getElementById("botao_chat").addEventListener("click", abrirChat);
document.getElementById("botao_fechar_chat").addEventListener("click", fecharChat);
document.getElementById("formulario_chat").addEventListener("submit", enviarPergunta);