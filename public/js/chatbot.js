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

function listarPorTotal(totais, limite, nomear) {
    const chaves = Object.keys(totais);
    const totalGeral = chaves.reduce(function (soma, chave) {
        return soma + totais[chave];
    }, 0);

    return chaves
        .sort(function (a, b) {
            return totais[b] - totais[a];
        })
        .slice(0, limite)
        .map(function (chave) {
            return {
                nome: nomear ? nomear(chave) : chave,
                quantidade: Math.round(totais[chave]),
                percentual: totalGeral ? Number(((totais[chave] / totalGeral) * 100).toFixed(1)) : 0
            };
        });
}

function montarContextoDashboard() {
    const painel = obterPainelAtual();
    const filtro = obterFiltroAtual(painel);
    const dadosVoos = obterDadosDeVoosFiltrados(painel);
    const voosPorEstado = somarPor(dadosVoos, "estado", "voos");
    const voosPorCompanhia = somarPor(dadosVoos, "companhia", "voos");

    const contexto = {
        painel: painel,
        tipo_empresa: sessionStorage.SETOR_ATUACAO || "AGENCIA",
        periodo: obterTextoDoPeriodo(filtro),
        filtro_ativo: filtro ? {
            nome: filtro.nome,
            estado: obterNomeEstado(filtro.estado),
            companhia: filtro.companhia,
            problema: filtro.problema
        } : null,
        total_voos: Math.round(obterTotalVoos(dadosVoos)),
        voos_por_estado_top8: listarPorTotal(voosPorEstado, 8, obterNomeEstado),
        voos_por_companhia: listarPorTotal(voosPorCompanhia, 10)
    };

    if (painel === "destinos") {
        contexto.indicadores = {
            "Destinos mais procurados": lerTexto("kpi_destinos_valor"),
            "Destino com mais voos": lerIndicador("kpi_estado_destaque", "kpi_estado_destaque_detalhe"),
            "Faturamento estimado": lerIndicador("kpi_faturamento", "kpi_faturamento_detalhe")
        };
    } else {
        const dadosReclamacoes = obterDadosDeReclamacoes(painel);
        const reclamacoesPorProblema = somarPor(dadosReclamacoes, "problema", "quantidade");

        contexto.indicadores = {
            "Avaliação média": lerIndicador("kpi_avaliacao", "kpi_avaliacao_detalhe"),
            "Taxa de resolução": lerIndicador("kpi_resolucao", "kpi_resolucao_detalhe"),
            "Total de reclamações": lerIndicador("kpi_reclamacoes", "kpi_reclamacoes_detalhe"),
            "Problema mais frequente": lerIndicador("kpi_problema", "kpi_problema_detalhe")
        };
        contexto.reclamacoes_por_problema = listarPorTotal(reclamacoesPorProblema, 10);
        contexto.taxa_resolucao_por_companhia = companhiasBase
            .filter(function (companhia) {
                return (voosPorCompanhia[companhia.nome] || 0) > 0;
            })
            .map(function (companhia) {
                return {
                    nome: companhia.nome,
                    resolvido_percentual: Math.round(obterPercentualResolucao(companhia, dadosReclamacoes))
                };
            });
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
                detalhe = (await resposta.json()).detail;
            } catch (e) {}
            throw new Error(detalhe || "Status " + resposta.status);
        }

        const json = await resposta.json();
        mensagemResposta.textContent = json.resposta;

        historicoChat.push({ role: "user", content: pergunta });
        historicoChat.push({ role: "assistant", content: json.resposta });
        historicoChat = historicoChat.slice(-10);
    } catch (erro) {
        console.log("Erro no chatbot: ", erro);
        mensagemResposta.textContent = erro.message.indexOf("Limite") == 0
            ? erro.message
            : "Não consegui responder agora. Confira se o servidor do chatbot está ligado.";
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