async function solicitarAncoras(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const corpo = await resposta.json().catch(function () {
        return {};
    });
    if (!resposta.ok) {
        throw new Error(corpo.mensagem || 'Não foi possível carregar as âncoras.');
    }
    return corpo;
}

function mostrarErroAncoras(mensagem) {
    const aviso = document.getElementById('mensagem_ancoras');
    aviso.textContent = mensagem;
    aviso.hidden = false;
}

async function carregarHistorico() {
    const usuario = sessionStorage.ID_USUARIO;
    const tbody = document.getElementById('tabela_corpo');

    if (!usuario) {
        window.location.href = 'login_usuario.html';
        return;
    }

    try {
        const ancoras = await solicitarAncoras(`/alertas/ancoras?idUsuario=${encodeURIComponent(usuario)}`);
        tbody.replaceChildren();

        if (ancoras.length === 0) {
            const linha = document.createElement('tr');
            const celula = document.createElement('td');
            celula.colSpan = 5;
            celula.className = 'vazio';
            celula.textContent = 'Nenhuma âncora cadastrada até o momento.';
            linha.appendChild(celula);
            tbody.appendChild(linha);
            return;
        }

        ancoras.forEach(function (ancora) {
            const linha = document.createElement('tr');
            const valores = [
                ancora.nome_ancora,
                `${ancora.indicador_alvo}${ancora.estado ? ` · ${ancora.estado} no Top ${ancora.posicao_top}` : ` · ${ancora.operador_comparacao} ${ancora.valor_alvo}`}`,
                sessionStorage.NOME_USUARIO || 'Usuário',
                'Ativada'
            ];
            valores.forEach(function (texto, indice) {
                const celula = document.createElement('td');
                if (indice === 0) {
                    const forte = document.createElement('strong');
                    forte.textContent = texto;
                    celula.appendChild(forte);
                } else {
                    celula.textContent = texto;
                }
                if (indice === 3) {
                    celula.className = 'td-status';
                    const status = document.createElement('span');
                    status.className = 'badge-status';
                    status.textContent = texto;
                    celula.replaceChildren(status);
                }
                linha.appendChild(celula);
            });

            const acoes = document.createElement('td');
            acoes.className = 'acoes-tabela';
            const editar = document.createElement('button');
            editar.className = 'btn-editar';
            editar.type = 'button';
            editar.textContent = 'Editar';
            editar.addEventListener('click', function () {
                window.location.href = `ancoras.html?id=${encodeURIComponent(ancora.id_ancora)}`;
            });
            const excluir = document.createElement('button');
            excluir.className = 'btn-excluir';
            excluir.type = 'button';
            excluir.textContent = 'Excluir';
            excluir.addEventListener('click', function () {
                excluirAncora(ancora.id_ancora);
            });
            acoes.append(editar, excluir);
            linha.appendChild(acoes);
            tbody.appendChild(linha);
        });
    } catch (erro) {
        mostrarErroAncoras(erro.message);
    }
}

async function excluirAncora(idAncora) {
    if (!window.confirm('Tem certeza que deseja excluir esta âncora? Os alertas ligados a ela também serão excluídos.')) {
        return;
    }

    try {
        await solicitarAncoras(`/alertas/ancoras/${encodeURIComponent(idAncora)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idUsuario: sessionStorage.ID_USUARIO })
        });
        await carregarHistorico();
    } catch (erro) {
        mostrarErroAncoras(erro.message);
    }
}

document.addEventListener('DOMContentLoaded', carregarHistorico);
