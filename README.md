# AuroraOS — Portfólio

Portfólio pessoal que simula um sistema operacional retrô usando somente HTML, CSS e JavaScript com ES Modules. O projeto foi mantido sem Node.js e pode continuar hospedado pelo GitHub Pages.

## O que já está implementado

- animação de boot com opção de pular;
- tela de entrada;
- desktop com atalhos móveis e posições salvas no `localStorage`;
- janelas com foco, arraste, minimizar, maximizar, restaurar e fechar;
- barra de tarefas, menu iniciar, relógio e calendário;
- visualizador responsivo do currículo, impressão e download do PDF;
- bloco de notas com salvamento local e contadores de texto;
- telas provisórias para aplicações ainda não concluídas.

## Como executar

Os componentes são carregados com `fetch`, portanto o projeto precisa ser aberto por um servidor HTTP local. Abrir o `index.html` diretamente pelo explorador de arquivos pode bloquear os módulos no navegador.

Com Python instalado:

```bash
python -m http.server 5500
```

Depois, acesse `http://localhost:5500`.

Também é possível usar a extensão Live Server no VS Code.

## Estrutura principal

```text
assets/                  imagens e PDF do currículo
components/              componentes visuais e aplicações
  aplications/            gerenciador e conteúdo das aplicações
  desktop/                atalhos e posições do desktop
  dialog/                 caixas de diálogo
  sessionScreem/          tela de entrada
  sysBoot/                terminal de inicialização
  task/                   tarefas e arraste de janelas
  taskbar/                barra, menu iniciar e calendário
  window/                 estrutura das janelas
css/                      estilos globais e do desktop
js/                       inicialização, viewport e armazenamento
index.html                estrutura principal da página
```
