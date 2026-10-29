let alertasCarregados = [];

async function solicitarListaAlertas(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const corpo = await resposta.json().catch(function () {
        return {};
    });
    if (!resposta.ok) {
        throw new Error(corpo.mensagem || 'Não foi possível carregar os alertas.');
    }
    return corpo;
}

function mostrarErroListaAlertas(texto) {
    const erro = document.getElementById('erro_lista_alertas');
    erro.textContent = texto;
    erro.hidden = false;
}

function dadosDoFiltro(alerta) {
    if (!alerta.filtro_json) return null;
    const filtro = JSON.parse(alerta.filtro_json);
    const estados = Array.isArray(filtro.estados) && filtro.estados.length
        ? filtro.estados
        : (filtro.estado && filtro.estado !== 'TODOS' ? [filtro.estado] : []);
    const companhias = Array.isArray(filtro.companhias) && filtro.companhias.length
        ? filtro.companhias
        : (filtro.companhia && filtro.companhia !== 'TODAS' ? [filtro.companhia] : []);

    const inicio = filtro.dataInicial || '2025-10-01';
    const fim = filtro.dataFinal || '2025-10-31';
    return {
        nome: filtro.nome || 'Filtro salvo',
        estados: estados,
        companhias: companhias,
        problema: filtro.problema && filtro.problema !== 'TODOS' ? filtro.problema : '',
        inicio: inicio,
        fim: fim
    };
}

function formatarDataFiltro(data) {
    const partes = String(data).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : String(data);
}

function descricaoDoFiltro(alerta) {
    const filtro = dadosDoFiltro(alerta);
    if (!filtro) return 'Sem filtro';
    const partes = [filtro.nome];
    if (filtro.estados.length) partes.push(`Estados: ${filtro.estados.join(', ')}`);
    if (filtro.companhias.length) partes.push(`Companhias: ${filtro.companhias.join(', ')}`);
    if (filtro.problema) partes.push(`Problema: ${filtro.problema}`);
    partes.push(`Período: ${formatarDataFiltro(filtro.inicio)} a ${formatarDataFiltro(filtro.fim)}`);
    return partes.join(' · ');
}

function criarResumoFiltro(alerta) {
    const filtro = dadosDoFiltro(alerta);
    const resumo = document.createElement('div');
    resumo.className = 'resumo_filtro_alerta';

    if (!filtro) {
        const semFiltro = document.createElement('span');
        semFiltro.className = 'item_filtro_alerta';
        semFiltro.textContent = 'Sem filtro';
        resumo.appendChild(semFiltro);
        return resumo;
    }

    const nome = document.createElement('span');
    nome.className = 'nome_filtro_alerta';
    nome.textContent = filtro.nome;
    resumo.appendChild(nome);

    const detalhes = document.createElement('div');
    detalhes.className = 'detalhes_filtro_alerta';
    const adicionarDetalhe = function (texto, classe) {
        const item = document.createElement('span');
        item.className = classe || 'item_filtro_alerta';
        item.textContent = texto;
        detalhes.appendChild(item);
    };

    adicionarDetalhe(`Período: ${formatarDataFiltro(filtro.inicio)} a ${formatarDataFiltro(filtro.fim)}`, 'periodo_filtro_alerta');
    if (filtro.estados.length) adicionarDetalhe(`Estados: ${filtro.estados.join(', ')}`);
    if (filtro.companhias.length) adicionarDetalhe(`Companhias: ${filtro.companhias.join(', ')}`);
    if (filtro.problema) adicionarDetalhe(`Problema: ${filtro.problema}`);

    resumo.appendChild(detalhes);
    return resumo;
}

function renderizarAlertas(alertas) {
    const tbody = document.getElementById('tabela_corpo_alertas');
    tbody.replaceChildren();

    if (alertas.length === 0) {
        const linha = document.createElement('tr');
        const celula = document.createElement('td');
        celula.colSpan = 7;
        celula.className = 'vazio';
        celula.textContent = 'Nenhum alerta cadastrado até o momento.';
        linha.appendChild(celula);
        tbody.appendChild(linha);
        return;
    }

    alertas.forEach(function (alerta) {
        const linha = document.createElement('tr');
        const colunas = [
            alerta.nome_alerta,
            sessionStorage.NOME_USUARIO || 'Usuário',
            alerta.nome_ancora,
            null,
            alerta.mensagem_alerta
        ];
        colunas.forEach(function (texto, indice) {
            const celula = document.createElement('td');
            if (indice === 3) {
                celula.className = 'filtro_especifico_alerta';
                celula.appendChild(criarResumoFiltro(alerta));
            } else {
                celula.textContent = texto;
            }
            if (indice === 4) celula.className = 'mensagem_tabela_alerta';
            linha.appendChild(celula);
        });

        const celulaStatus = document.createElement('td');
        const status = document.createElement('span');
        const ativo = Number(alerta.status_alerta) === 1;
        status.className = `status_alerta ${ativo ? 'status_ativo' : 'status_inativo'}`;
        status.textContent = ativo ? 'Ativo' : 'Inativo';
        celulaStatus.appendChild(status);
        linha.appendChild(celulaStatus);

        const acoes = document.createElement('td');
        acoes.className = 'coluna_acoes';
        const grupo = document.createElement('div');
        grupo.className = 'acoes_alerta';
        const alternar = document.createElement('button');
        alternar.className = 'botao_status_alerta';
        alternar.type = 'button';
        alternar.textContent = ativo ? 'Desativar' : 'Ativar';
        alternar.addEventListener('click', function () {
            alterarStatusAlerta(alerta, !ativo);
        });
        const editar = document.createElement('a');
        editar.className = 'botao_editar_alerta';
        editar.href = `alertas_criacao.html?id=${encodeURIComponent(alerta.id_alerta)}`;
        editar.textContent = 'Editar';
        const excluir = document.createElement('button');
        excluir.className = 'botao_excluir_alerta';
        excluir.type = 'button';
        excluir.textContent = 'Excluir';
        excluir.addEventListener('click', function () {
            excluirAlerta(alerta.id_alerta);
        });
        grupo.append(alternar, editar, excluir);
        acoes.appendChild(grupo);
        linha.appendChild(acoes);
        tbody.appendChild(linha);
    });
}

function aplicarBusca() {
    const busca = document.querySelector('.busca_alertas').value.trim().toLocaleLowerCase('pt-BR');
    renderizarAlertas(alertasCarregados.filter(function (alerta) {
        return [
            alerta.nome_alerta,
            alerta.nome_ancora,
            alerta.mensagem_alerta,
            descricaoDoFiltro(alerta)
        ].join(' ').toLocaleLowerCase('pt-BR').includes(busca);
    }));
}

async function carregarAlertas() {
    const idUsuario = sessionStorage.ID_USUARIO;
    if (!idUsuario) {
        window.location.href = 'login_usuario.html';
        return;
    }

    try {
        alertasCarregados = await solicitarListaAlertas(`/alertas?idUsuario=${encodeURIComponent(idUsuario)}`);
        aplicarBusca();
    } catch (erro) {
        mostrarErroListaAlertas(erro.message);
    }
}

async function alterarStatusAlerta(alerta, ativo) {
    try {
        await solicitarListaAlertas(`/alertas/${encodeURIComponent(alerta.id_alerta)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idUsuario: sessionStorage.ID_USUARIO, ativo: ativo })
        });
        await carregarAlertas();
    } catch (erro) {
        mostrarErroListaAlertas(erro.message);
    }
}

async function excluirAlerta(idAlerta) {
    if (!window.confirm('Deseja realmente excluir este alerta?')) return;
    try {
        await solicitarListaAlertas(`/alertas/${encodeURIComponent(idAlerta)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idUsuario: sessionStorage.ID_USUARIO })
        });
        await carregarAlertas();
    } catch (erro) {
        mostrarErroListaAlertas(erro.message);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('.busca_alertas').addEventListener('input', aplicarBusca);
    carregarAlertas();
});
