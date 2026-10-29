document.addEventListener('DOMContentLoaded', function() {
    carregarAlertas();
});

function carregarAlertas() {
    var tbody = document.getElementById('tabela_corpo_alertas');
    if (!tbody) return;

    // Busca os alertas salvos no localStorage usando a mesma chave
    var alertas = JSON.parse(localStorage.getItem('alertas_aircode')) || [];

    tbody.innerHTML = '';

    if (alertas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum alerta cadastrado até o momento.</td></tr>`;
        return;
    }

    alertas.forEach(function(alerta, index) {
        var tr = document.createElement('tr');
        
        // Define a classe CSS baseada no status do alerta
        var classeStatus = alerta.status === 'Ativo' ? 'status_ativo' : 'status_inativo';

        tr.innerHTML = `
            <td>${alerta.nome}</td>
            <td class="coluna_criador">${alerta.criador}</td>
            <td>${alerta.metrica}</td>
            <td><span class="status_alerta ${classeStatus}">${alerta.status}</span></td>
            <td class="coluna_acoes">
                <div class="acoes_alerta">
                    <a class="botao_editar_alerta" href="alertas_criacao.html?id=${alerta.id}">Editar</a>
                    <button class="botao_excluir_alerta" type="button" onclick="excluirAlerta(${index})">Excluir</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function excluirAlerta(index) {
    if (confirm('Deseja realmente excluir este alerta?')) {
        var alertas = JSON.parse(localStorage.getItem('alertas_aircode')) || [];
        alertas.splice(index, 1);
        
        // Atualiza o localStorage e recarrega a tabela imediatamente
        localStorage.setItem('alertas_aircode', JSON.stringify(alertas));
        carregarAlertas();
    }
}