document.addEventListener('DOMContentLoaded', function() {
    // 1. Carrega as âncoras cadastradas no select de Âncora Alvo
    carregarSelectAncoras();

    // 2. Verifica se a URL possui um ID (modo edição)
    const urlParams = new URLSearchParams(window.location.search);
    const alertaId = urlParams.get('id');

    if (alertaId) {
        preencherDadosEdicao(alertaId);
    }

    // 3. Gerencia o envio do formulário (Criar ou Salvar Alteração)
    var formulario = document.getElementById('formulario_alerta');
    if (formulario) {
        formulario.addEventListener('submit', function(event) {
            event.preventDefault(); // Evita recarregar a página

            var alertas = JSON.parse(localStorage.getItem('alertas_aircode')) || [];

            var nomeAlerta = document.getElementById('nome_alerta').value;
            var metricaAlvo = document.getElementById('metrica_alvo').value;
            var mensagemAlerta = document.getElementById('mensagem_alerta').value;

            if (alertaId) {
                // Modo Edição: Atualiza o alerta existente
                var index = alertas.findIndex(a => a.id == alertaId);
                if (index !== -1) {
                    alertas[index].nome = nomeAlerta;
                    alertas[index].metrica = metricaAlvo;
                    alertas[index].mensagem = mensagemAlerta;
                }
            } else {
                // Modo Criação: Cria um novo alerta
                var novoAlerta = {
                    id: Date.now(),
                    nome: nomeAlerta,
                    criador: "Usuário Aircode",
                    metrica: metricaAlvo,
                    status: "Ativo",
                    mensagem: mensagemAlerta
                };
                alertas.push(novoAlerta);
            }

            // Salva no localStorage usando a chave unificada
            localStorage.setItem('alertas_aircode', JSON.stringify(alertas));

            // Redireciona para a tela de listagem correta
            window.location.href = 'alertas_listar.html';
        });
    }
});

// Função para popular o select de Âncora Alvo
function carregarSelectAncoras() {
    var selectAncora = document.getElementById('metrica_alvo'); 
    if (!selectAncora) return;

    var ancoras = JSON.parse(localStorage.getItem('ancoras_aircode')) || [];
    selectAncora.innerHTML = '<option value="">Selecione uma âncora</option>';

    if (ancoras.length === 0) {
        var optionVazia = document.createElement('option');
        optionVazia.value = "";
        optionVazia.textContent = "Nenhuma âncora encontrada";
        optionVazia.disabled = true;
        selectAncora.appendChild(optionVazia);
        return;
    }

    ancoras.forEach(function(ancora) {
        var nomeAncora = ancora.valores.nome || 'Sem nome';
        var option = document.createElement('option');
        option.value = nomeAncora;
        option.textContent = nomeAncora;
        selectAncora.appendChild(option);
    });
}

// Função para preencher os dados caso seja uma edição
function preencherDadosEdicao(id) {
    var alertas = JSON.parse(localStorage.getItem('alertas_aircode')) || [];
    var alertaEncontrado = alertas.find(a => a.id == id);

    if (alertaEncontrado) {
        document.getElementById('nome_alerta').value = alertaEncontrado.nome || '';
        document.getElementById('metrica_alvo').value = alertaEncontrado.metrica || '';
        
        var campoMensagem = document.getElementById('mensagem_alerta');
        if (campoMensagem) {
            campoMensagem.value = alertaEncontrado.mensagem || '';
        }

        // Altera o título da página visualmente para indicar edição
        const titulo = document.querySelector('main h1');
        if (titulo) titulo.textContent = 'Editar Alerta';
    }
}