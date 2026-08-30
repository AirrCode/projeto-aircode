CREATE DATABASE aircode;
USE aircode;

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR (45) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(45) NOT NULL UNIQUE,
    senha VARCHAR (45) NOT NULL
);

-- Companhias Aéreas
CREATE TABLE companhia (
    id_companhia INT AUTO_INCREMENT PRIMARY KEY,
    sigla_icao VARCHAR(5) NULL,
    nome_empresa VARCHAR(150) NOT NULL,
    nome_fantasia_consumidor VARCHAR(150) NULL,
    nacionalidade VARCHAR(30) DEFAULT 'BRASILEIRA',
    status_ativa BOOLEAN DEFAULT TRUE
);

-- Aeroportos
CREATE TABLE aeroporto (
    id_aeroporto INT AUTO_INCREMENT PRIMARY KEY,
    sigla_icao_iata VARCHAR(10) NOT NULL UNIQUE,
    nome_aeroporto VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NULL,
    regiao VARCHAR(30) NULL,
    pais VARCHAR(50) NOT NULL DEFAULT 'BRASIL',
    continente VARCHAR(50) NULL
);

-- Rotas Aéreas
CREATE TABLE rota (
    id_rota INT AUTO_INCREMENT PRIMARY KEY,
    id_aeroporto_origem INT NOT NULL,
    id_aeroporto_destino INT NOT NULL,
    natureza VARCHAR(20) NOT NULL CHECK (natureza IN ('DOMÉSTICA', 'INTERNACIONAL')),
    distancia_km DECIMAL(10,2) NULL,
    CONSTRAINT fk_rota_origem FOREIGN KEY (id_aeroporto_origem) REFERENCES aeroporto(id_aeroporto),
    CONSTRAINT fk_rota_destino FOREIGN KEY (id_aeroporto_destino) REFERENCES aeroporto(id_aeroporto)
);

-- Operações de Voos
CREATE TABLE voo_mensal (
    id_voo_mensal INT AUTO_INCREMENT PRIMARY KEY,
    id_companhia INT NOT NULL,
    id_rota INT NOT NULL,
    ano INT NOT NULL,
    mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    grupo_voo VARCHAR(30) NULL,
    passageiros_pagos INT DEFAULT 0,
    passageiros_gratis INT DEFAULT 0,
    assentos_ofertados INT DEFAULT 0,
    decolagens INT DEFAULT 0,
    combustivel_litros DECIMAL(12,2) NULL,
    horas_voadas DECIMAL(8,2) NULL,
    distancia_voada_km DECIMAL(10,2) NULL,
    CONSTRAINT fk_voo_companhia FOREIGN KEY (id_companhia) REFERENCES companhia(id_companhia),
    CONSTRAINT fk_voo_rota FOREIGN KEY (id_rota) REFERENCES rota(id_rota)
);

-- Reclamações e Qualidade
CREATE TABLE reclamacao (
    id_reclamacao INT AUTO_INCREMENT PRIMARY KEY,
    id_companhia INT NOT NULL,
    uf_consumidor VARCHAR(2) NULL,
    cidade_consumidor VARCHAR(100) NULL,
    data_abertura DATE NOT NULL,
    data_finalizacao DATE NULL,
    tempo_resposta_dias INT NULL,
    grupo_problema VARCHAR(100) NOT NULL,
    problema VARCHAR(255) NOT NULL,
    forma_contrato VARCHAR(100) NULL,
    situacao VARCHAR(50) NULL,
    avaliacao_reclamacao VARCHAR(30) CHECK (avaliacao_reclamacao IN ('Resolvida', 'Não Resolvida', 'Não Avaliada')),
    nota_consumidor INT CHECK (nota_consumidor BETWEEN 1 AND 5),
    codigo_classificador_anac VARCHAR(50) NULL,
    CONSTRAINT fk_reclamacao_companhia FOREIGN KEY (id_companhia) REFERENCES companhia(id_companhia)
);


-- VIEWS PARA INDICADORES

CREATE VIEW vw_indicadores_aircode AS
SELECT 
    c.nome_empresa AS companhia,
    r.id_rota,
    ao.sigla_icao_iata AS origem,
    ad.sigla_icao_iata AS destino,
    v.ano,
    v.mes,
    -- Volume total de passageiros transportados
    SUM(v.passageiros_pagos + v.passageiros_gratis) AS total_passageiros,
    
    -- Taxa média de ocupação dos voos (%)
    ROUND(
        CASE 
            WHEN SUM(v.assentos_ofertados) > 0 
            THEN (SUM(v.passageiros_pagos) / SUM(v.assentos_ofertados)) * 100 
            ELSE 0 
        END, 2
    ) AS taxa_ocupacao_pct,
    
    -- Média de decolagens por período
    SUM(v.decolagens) AS total_decolagens
FROM voo_mensal v
JOIN companhia c ON v.id_companhia = c.id_companhia
JOIN rota r ON v.id_rota = r.id_rota
JOIN aeroporto ao ON r.id_aeroporto_origem = ao.id_aeroporto
JOIN aeroporto ad ON r.id_aeroporto_destino = ad.id_aeroporto
GROUP BY c.nome_empresa, r.id_rota, ao.sigla_icao_iata, ad.sigla_icao_iata, v.ano, v.mes;