const parametrosAlerta = new URLSearchParams(window.location.search);
const idAlertaEditando = parametrosAlerta.get('id');

async function solicitarAlerta(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const corpo = await resposta.json().catch(function () {
        return {};
    });
    if (!resposta.ok) {
        throw new Error(corpo.mensagem || 'Não foi possível concluir a operação.');
    }
    return corpo;
}

function mostrarErroAlerta(texto) {
    const aviso = document.getElementById('erro_alerta');
    aviso.textContent = texto;
    aviso.hidden = false;
}

function obterFiltrosSalvos() {
    const destinos = JSON.parse(localStorage.getItem('filtros_destinos') || '[]');
    const companhias = JSON.parse(localStorage.getItem('filtros_companhias') || '[]');
    return destinos.concat(companhias);
}

function preencherFiltros(alertaExistente) {
    const select = document.getElementById('filtro_especifico');
    const filtros = obterFiltrosSalvos();
    const semFiltro = document.createElement('option');
    semFiltro.value = '';
    semFiltro.textContent = 'Sem filtro específico';
    select.appendChild(semFiltro);

    filtros.forEach(function (filtro) {
        const opcao = document.createElement('option');
        opcao.value = String(filtro.id);
        opcao.textContent = `${filtro.nome} (${filtro.tipo === 'companhias' ? 'Companhias' : 'Destinos'})`;
        opcao.dataset.filtro = JSON.stringify(filtro);
        select.appendChild(opcao);
    });

    if (alertaExistente && alertaExistente.filtro_json) {
        const salvo = JSON.parse(alertaExistente.filtro_json);
        if (salvo.id !== undefined) {
            select.value = String(salvo.id);
        }
    }
}

function preencherAncoras(ancoras, alertaExistente) {
    const select = document.getElementById('metrica_alvo');
    select.replaceChildren();
    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = ancoras.length ? 'Selecione uma âncora' : 'Crie uma âncora antes';
    select.appendChild(inicial);
    ancoras.forEach(function (ancora) {
        const opcao = document.createElement('option');
        opcao.value = ancora.id_ancora;
        opcao.textContent = `${ancora.nome_ancora} — ${ancora.indicador_alvo}`;
        select.appendChild(opcao);
    });
    if (alertaExistente) {
        select.value = String(alertaExistente.id_ancora);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const idUsuario = sessionStorage.ID_USUARIO;
    if (!idUsuario) {
        window.location.href = 'login_usuario.html';
        return;
    }

    const queryUsuario = `idUsuario=${encodeURIComponent(idUsuario)}`;
    try {
        const [ancoras, alertaExistente] = await Promise.all([
            solicitarAlerta(`/alertas/ancoras?${queryUsuario}`),
            idAlertaEditando
                ? solicitarAlerta(`/alertas/${encodeURIComponent(idAlertaEditando)}?${queryUsuario}`)
                : Promise.resolve(null)
        ]);
        preencherAncoras(ancoras, alertaExistente);
        preencherFiltros(alertaExistente);

        if (alertaExistente) {
            document.getElementById('nome_alerta').value = alertaExistente.nome_alerta;
            document.getElementById('mensagem_alerta').value = alertaExistente.mensagem_alerta;
            document.querySelector('main h1').textContent = 'Editar alerta';
        }
    } catch (erro) {
        mostrarErroAlerta(erro.message);
        return;
    }

    document.getElementById('formulario_alerta').addEventListener('submit', async function (evento) {
        evento.preventDefault();
        const filtroSelect = document.getElementById('filtro_especifico');
        const filtroSelecionado = filtroSelect.selectedOptions[0];
        const filtro = filtroSelecionado && filtroSelecionado.value
            ? JSON.parse(filtroSelecionado.dataset.filtro)
            : null;
        const corpo = {
            idUsuario: idUsuario,
            nome: document.getElementById('nome_alerta').value.trim(),
            idAncora: document.getElementById('metrica_alvo').value,
            filtro: filtro,
            mensagem: document.getElementById('mensagem_alerta').value.trim()
        };
        const url = idAlertaEditando ? `/alertas/${encodeURIComponent(idAlertaEditando)}` : '/alertas';

        try {
            await solicitarAlerta(url, {
                method: idAlertaEditando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            });
            window.location.href = 'alertas_listar.html';
        } catch (erro) {
            mostrarErroAlerta(erro.message);
        }
    });
});