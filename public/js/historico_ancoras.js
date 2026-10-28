document.addEventListener('DOMContentLoaded', function() {
    carregarHistorico();
});

function carregarHistorico() {
    var tbody = document.getElementById('tabela_corpo');
    var ancoras = JSON.parse(localStorage.getItem('ancoras_aircode')) || [];

    tbody.innerHTML = '';

    if (ancoras.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="vazio">Nenhuma âncora cadastrada até o momento.</td></tr>`;
        return;
    }

    ancoras.forEach(function(ancora, index) {
        var tr = document.createElement('tr');

        var nomeAncora = ancora.valores.nome || 'Sem nome';
        var indicadorAlvo = ancora.valores.indicador_alvo || ancora.tipo;
        var criador = ancora.criador || 'Usuário Aircode';
        var status = ancora.status || 'Ativado';
        var idUnico = ancora.id || (Date.now() + index);

        tr.innerHTML = `
            <td><strong>${nomeAncora}</strong></td>
            <td>${indicadorAlvo}</td>
            <td>${criador}</td>
            <td class="td-status"><span class="badge-status">${status}</span></td>
            <td class="acoes-tabela">
                <button class="btn-editar" onclick="editarAncora('${idUnico}')">Editar</button>
                <button class="btn-excluir" onclick="excluirAncora(${index})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function editarAncora(id) {
    window.location.href = `editar_ancora.html?id=${id}`;
}

function excluirAncora(index) {
    if (confirm('Tem certeza que deseja excluir esta âncora?')) {
        var ancoras = JSON.parse(localStorage.getItem('ancoras_aircode')) || [];
        ancoras.splice(index, 1);
        localStorage.setItem('ancoras_aircode', JSON.stringify(ancoras));
        carregarHistorico();
    }
}