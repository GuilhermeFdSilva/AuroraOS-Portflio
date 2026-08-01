# AuroraOS — Portfólio Interativo

> **Status:** em desenvolvimento ativo

AuroraOS é meu portfólio pessoal apresentado como um sistema operacional retrô. Em vez de uma página estática, o projeto transforma currículo, projetos e informações profissionais em uma interface interativa com desktop, janelas e aplicativos.

O projeto foi desenvolvido com **HTML, CSS e JavaScript**, utilizando **ES Modules** e sem depender de Node.js ou de frameworks de interface para funcionar.

## Visão geral

O objetivo do AuroraOS é demonstrar fundamentos de desenvolvimento front-end por meio de uma aplicação visual completa, incluindo:

- organização modular do código;
- manipulação do DOM;
- gerenciamento de eventos e estados da interface;
- responsividade;
- persistência de dados no navegador;
- suporte a interações por mouse e toque.

## Funcionalidades implementadas

- animação de inicialização com opção de pular;
- tela de entrada;
- desktop com atalhos móveis;
- persistência das posições dos atalhos com `localStorage`;
- janelas com foco, arraste, minimização, maximização, restauração e fechamento;
- barra de tarefas;
- menu iniciar;
- relógio e calendário;
- visualizador responsivo do currículo;
- impressão e download do currículo em PDF;
- telas provisórias para aplicações ainda em desenvolvimento.

## Principais desafios técnicos

### Gerenciamento de janelas

A aplicação controla múltiplas janelas e seus diferentes estados, mantendo o foco visual, a ordem de sobreposição e a integração com a barra de tarefas.

### Interface responsiva

O comportamento da aplicação precisa se adaptar a diferentes tamanhos de tela sem perder a proposta de um ambiente desktop. Também foram considerados eventos de toque e alterações na área visível do navegador em dispositivos móveis.

### Persistência local

As posições dos atalhos são armazenadas no navegador para preservar a organização escolhida pelo usuário entre diferentes acessos.

### Organização modular

As responsabilidades da interface foram separadas em componentes e módulos, evitando concentrar toda a aplicação em um único arquivo JavaScript.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- ES Modules
- Fetch API
- Local Storage
- Git e GitHub

## Estrutura principal

```text
assets/        imagens e documentos
components/    componentes visuais e aplicações
css/           estilos globais e específicos
js/            inicialização, viewport e armazenamento
index.html     ponto de entrada da aplicação
```

## Como executar localmente

Os componentes são carregados com `fetch`, portanto o projeto deve ser executado por um servidor HTTP local.

```bash
git clone https://github.com/GuilhermeFdSilva/portfolio-v1.git
cd portfolio-v1
python -m http.server 5500
```

Depois, acesse:

```text
http://localhost:5500
```

Também é possível utilizar uma extensão de servidor local, como o Live Server.

## Próximas melhorias

- concluir as aplicações internas;
- ampliar a navegação por teclado;
- revisar acessibilidade e semântica;
- adicionar testes automatizados;
- melhorar a documentação da arquitetura;
- publicar uma versão estável.

## Repositório

[Ver código-fonte no GitHub](https://github.com/GuilhermeFdSilva/portfolio-v1)
