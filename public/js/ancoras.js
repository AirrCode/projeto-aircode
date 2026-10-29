const parametrosAncora = new URLSearchParams(window.location.search);
const idAncora = parametrosAncora.get('id');
const idUsuarioAncora = sessionStorage.ID_USUARIO;
const indicadoresAncora = {
    destinos: 'Destinos mais procurados',
    destaque: 'Destino com maior crescimento',
    faturamento: 'Faturamento estimado',
    avaliacao: 'Avaliação média',
    resolucao: 'Taxa de resolução',
    reclamacao: 'Total de reclamações',
    frequente: 'Problema mais frequente'
};

function mostrarMensagemAncora(texto, erro) {
    const elemento = document.getElementById('mensagem_ancora');
    elemento.textContent = texto;
    elemento.classList.toggle('aviso_erro_ancora', Boolean(erro));
}

async function solicitarAncora(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const corpo = await resposta.json().catch(function () {
        return {};
    });
    if (!resposta.ok) {
        throw new Error(corpo.mensagem || 'Não foi possível concluir a operação.');
    }
    return corpo;
}

function obterDescricaoValor(indicador) {
    if (indicador === 'faturamento') return { label: 'Valor alvo em reais (R$)', max: '', step: '0.01' };
    if (indicador === 'avaliacao') return { label: 'Nota alvo (0 a 5)', max: '5', step: '0.1' };
    if (indicador === 'resolucao') return { label: 'Percentual alvo (0 a 100%)', max: '100', step: '0.01' };
    return { label: 'Quantidade alvo', max: '', step: '1' };
}

function montarFormularioAncora(ancora, estados) {
    const indicadorInicial = indicadoresAncora[ancora.indicador_alvo]
        ? ancora.indicador_alvo
        : (indicadoresAncora[parametrosAncora.get('kpi')] ? parametrosAncora.get('kpi') : 'destinos');
    const area = document.getElementById('formulario_ancora');

    area.innerHTML = `
        <h2>${idAncora ? 'Editar âncora' : 'Nova âncora'}</h2>
        <p>Defina o KPI e a condição que será acompanhada pelo alerta.</p>
        <form id="form_ancora">
            <label for="nome_ancora">Nome da âncora
                <input type="text" id="nome_ancora" maxlength="100" required>
            </label>
            <label for="indicador_ancora">Indicador alvo
                <select id="indicador_ancora" required></select>
            </label>
            <div id="campos_posicao_ancora">
                <label for="estado_ancora">Estado
                    <select id="estado_ancora" required>
                        <option value="">Selecione um estado</option>
                    </select>
                </label>
                <label for="posicao_ancora">Posição no ranking
                    <select id="posicao_ancora" required>
                        <option value="">Selecione a posição</option>
                    </select>
                </label>
            </div>
            <div id="campos_valor_ancora" hidden>
                <label for="operador_ancora">Condição
                    <select id="operador_ancora">
                        <option value=">=">Maior ou igual a</option>
                        <option value=">">Maior que</option>
                        <option value="<=">Menor ou igual a</option>
                        <option value="<">Menor que</option>
                        <option value="=">Igual a</option>
                    </select>
                </label>
                <label for="valor_ancora" id="rotulo_valor_ancora">Valor alvo
                    <input type="number" id="valor_ancora" min="0" step="1">
                </label>
            </div>
            <button type="submit" class="botao_enviar_alerta">Salvar âncora</button>
        </form>
    `;

    const selectIndicador = document.getElementById('indicador_ancora');
    Object.keys(indicadoresAncora).forEach(function (chave) {
        const opcao = document.createElement('option');
        opcao.value = chave;
        opcao.textContent = indicadoresAncora[chave];
        selectIndicador.appendChild(opcao);
    });
    selectIndicador.value = indicadorInicial;

    const selectEstado = document.getElementById('estado_ancora');
    estados.forEach(function (estado) {
        const opcao = document.createElement('option');
        opcao.value = estado.uf;
        opcao.textContent = `${estado.nome_estado} (${estado.uf})`;
        selectEstado.appendChild(opcao);
    });

    const selectPosicao = document.getElementById('posicao_ancora');
    for (let posicao = 1; posicao <= 3; posicao++) {
        const opcao = document.createElement('option');
        opcao.value = String(posicao);
        opcao.textContent = `${posicao}º lugar`;
        selectPosicao.appendChild(opcao);
    }

    document.getElementById('nome_ancora').value = ancora.nome_ancora || '';
    selectEstado.value = ancora.estado || '';
    selectPosicao.value = ancora.posicao_top || '';
    document.getElementById('operador_ancora').value = ancora.operador_comparacao || '>=';
    document.getElementById('valor_ancora').value = ancora.valor_alvo ?? '';

    function atualizarCamposIndicador() {
        const ranking = ['destinos', 'destaque'].includes(selectIndicador.value);
        document.getElementById('campos_posicao_ancora').hidden = !ranking;
        document.getElementById('campos_valor_ancora').hidden = ranking;
        document.getElementById('estado_ancora').required = ranking;
        document.getElementById('posicao_ancora').required = ranking;
        document.getElementById('valor_ancora').required = !ranking;
        if (!ranking) {
            const descricao = obterDescricaoValor(selectIndicador.value);
            const rotulo = document.getElementById('rotulo_valor_ancora');
            rotulo.firstChild.textContent = `${descricao.label} `;
            document.getElementById('valor_ancora').max = descricao.max;
            document.getElementById('valor_ancora').step = descricao.step;
        }
    }

    selectIndicador.addEventListener('change', atualizarCamposIndicador);
    atualizarCamposIndicador();

    document.getElementById('form_ancora').addEventListener('submit', async function (evento) {
        evento.preventDefault();
        const indicador = selectIndicador.value;
        const ranking = ['destinos', 'destaque'].includes(indicador);
        const dados = {
            idUsuario: idUsuarioAncora,
            nome: document.getElementById('nome_ancora').value.trim(),
            indicador: indicador,
            estado: ranking ? selectEstado.value : null,
            posicao: ranking ? selectPosicao.value : null,
            valor: ranking ? null : document.getElementById('valor_ancora').value,
            operador: document.getElementById('operador_ancora').value
        };
        const metodo = idAncora ? 'PUT' : 'POST';
        const url = idAncora ? `/alertas/ancoras/${encodeURIComponent(idAncora)}` : '/alertas/ancoras';

        try {
            await solicitarAncora(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            window.location.href = 'historico_ancoras.html';
        } catch (erro) {
            mostrarMensagemAncora(erro.message, true);
        }
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    if (!idUsuarioAncora) {
        window.location.href = 'login_usuario.html';
        return;
    }

    try {
        const [estados, ancora] = await Promise.all([
            solicitarAncora(`/alertas/estados?idUsuario=${encodeURIComponent(idUsuarioAncora)}`),
            idAncora
                ? solicitarAncora(`/alertas/ancoras/${encodeURIComponent(idAncora)}?idUsuario=${encodeURIComponent(idUsuarioAncora)}`)
                : Promise.resolve({})
        ]);
        montarFormularioAncora(ancora, estados);
    } catch (erro) {
        mostrarMensagemAncora(erro.message, true);
    }
});
