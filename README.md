# Library Manager

[![CI](https://github.com/ericksoares13/library-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/ericksoares13/library-manager/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ericksoares13/library-manager/graph/badge.svg)](https://codecov.io/gh/ericksoares13/library-manager)

Sistema web de gerenciamento de biblioteca, desenvolvido como trabalho prático da disciplina de
Teste de Software.

**No ar:** https://library-manager-u8yk.onrender.com (a primeira visita pode levar cerca de 1
minuto, ver [Deploy](#deploy)).

## Integrantes

- Erick Soares de Souza

## Sobre o sistema

O Library Manager é a ferramenta do administrador de uma biblioteca para cuidar do acervo, dos
leitores e dos empréstimos. Não há login: os membros são registros cadastrados pelo administrador, e
é ele quem escolhe o livro e o membro de cada empréstimo.

- **Livros:** cadastro com título, autor, ISBN (conferido pelo dígito verificador) e quantidade de
  exemplares. A capa é buscada pelo ISBN na [Open Library](https://openlibrary.org) e pode ser
  ampliada com um toque. A página do livro mostra os exemplares disponíveis e os empréstimos dele.
- **Membros:** cadastro com nome, e-mail e foto, tirada pela câmera ou enviada de um arquivo e
  ajustada num recorte. A página do membro mostra quantos livros ele tem emprestados e os
  empréstimos dele.
- **Empréstimos:** empréstimo de um livro a um membro com prazo de 14 dias, destaque dos atrasados e
  registro da devolução.
- **Listas:** todas as telas têm busca (sem diferenciar acentos), ordenação, filtro por situação nos
  empréstimos e paginação.

Regras de negócio:

- ISBN e e-mail não se repetem, e o ISBN não muda depois do cadastro.
- Cada membro tem no máximo 3 empréstimos ativos e não pega duas cópias do mesmo livro ao mesmo
  tempo.
- Só se empresta um livro com exemplar disponível, e o total de exemplares não pode ficar abaixo dos
  que estão emprestados.
- Livros e membros com empréstimo ativo não podem ser excluídos.
- Um empréstimo é devolvido uma única vez, e nunca antes da data em que foi feito.

## Tecnologias

- **Java 25:** linguagem principal.
- **Spring Boot:** framework web para a API REST, a validação de dados e a integração com o banco.
- **MongoDB:** banco de dados NoSQL que armazena livros, membros, fotos e empréstimos.
- **React + TypeScript:** interface web, em `frontend/`.
- **Vite:** servidor de desenvolvimento e build do front-end, servido pelo próprio Spring Boot.
- **Motion:** animações da interface.
- **Material Symbols (Google):** ícones da interface, no estilo Rounded (licença Apache 2.0).
- **Open Library:** capas dos livros, buscadas pelo ISBN.
- **Gradle (Kotlin DSL):** build e gerenciamento de dependências.
- **Spotless, Checkstyle e ESLint:** formatação e padrão de código, verificados no build.
- **JUnit 5 + Mockito:** testes de unidade do back-end.
- **Vitest + Testing Library:** testes do front-end, simulando o uso da tela.
- **Playwright:** testes end-to-end no navegador, contra a aplicação e o banco de verdade.
- **JaCoCo e V8 (Vitest):** medição da cobertura de testes do back-end e do front-end.
- **GitHub Actions:** integração contínua, com testes rodando em Linux, macOS e Windows a cada
  commit.
- **Codecov:** publicação dos relatórios de cobertura.
- **Docker, Render e MongoDB Atlas:** imagem da aplicação, hospedagem e banco em produção.

## Uso de IA

- **Claude Code (Anthropic):** assistente de programação usado no terminal para estruturar o
  projeto, auxiliar na escrita do código, dos testes e da documentação e investigar erros. Teve
  papel maior no front-end, nas telas, animações e gestos da interface, construídos a partir das
  ideias e dos ajustes pedidos pelo autor. Todo o código gerado foi revisado pelo autor.
- **Skills do Claude Code** (`.claude/skills/`): instruções que orientam o assistente neste projeto.
  - `tests`: convenções e boas práticas de teste, baseadas no curso de Teste de Software do Prof.
    André Hora (DCC/UFMG).
  - `commit`: padrão de mensagens e fluxo de commits do projeto.
  - `apple-design`: princípios de interface e animação da Apple para a web, de
    [Emil Kowalski](https://github.com/emilkowalski/skills) (licença MIT).

## Execução da aplicação

Pré-requisitos: JDK 25 e Docker. O Gradle baixa o Node.js e compila o front-end automaticamente.

```bash
# Sobe o MongoDB local (container em segundo plano, porta 27017)
docker compose up -d

# Executa a aplicação
./gradlew bootRun
```

Para usar outro MongoDB, defina a variável `MONGODB_URI` (padrão:
`mongodb://localhost:27017/library`).

A aplicação fica em `http://localhost:8080`.

Para desenvolver o front-end com recarga automática, deixe o `bootRun` rodando e, em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O Vite abre em `http://localhost:5173` e repassa as chamadas `/api` para o Spring Boot.

## Deploy

A aplicação roda no [Render](https://render.com) (plano gratuito, a partir do `Dockerfile`) com o
banco no [MongoDB Atlas](https://www.mongodb.com/atlas) (cluster M0 gratuito).

- O serviço é descrito em `render.yaml` e a connection string do Atlas fica só no painel do Render,
  na variável `MONGODB_URI`.
- O deploy é manual: na aba **Actions** do GitHub, **CI → Run workflow** roda o pipeline inteiro e,
  se tudo passar, o job `deploy` pede ao Render que publique a versão da `main`.

Para gerar e rodar a imagem localmente (com o MongoDB do `docker compose`):

```bash
docker build -t library-manager .
docker run -p 8080:8080 -e MONGODB_URI=mongodb://host.docker.internal:27017/library library-manager
```

No plano gratuito, o Render desliga o serviço após cerca de 15 minutos sem acesso; a primeira visita
seguinte leva em torno de 1 minuto para carregar.

## Testes

- **Unidade e integração do back-end (JUnit):** entidades com as regras de negócio (sem mocks),
  services com Mockito e data fixa, controllers e validações da API.
- **Front-end (Vitest + Testing Library):** cada tela é usada como um usuário usaria, com a API
  simulada: cadastro, edição, exclusão, busca, empréstimo, devolução e mensagens de erro.
- **End-to-end (Playwright):** 5 fluxos completos no navegador, com a aplicação e o MongoDB de
  verdade.
- **Cobertura:** mínimo de 80% no back-end e no front-end, verificado no build.

O CI roda tudo isso em Linux, macOS e Windows a cada commit e envia a cobertura ao Codecov.

## Execução dos testes

Pré-requisito: JDK 25 instalado. O Gradle Wrapper baixa o Gradle e o Node.js automaticamente.

```bash
# Back-end (JUnit) com relatório de cobertura
./gradlew test

# Front-end (Vitest) com relatório de cobertura
./gradlew testFrontend

# Tudo: formatação, lint, testes e verificação de cobertura mínima (80%)
./gradlew check

# End-to-end (Playwright): exige o MongoDB rodando (docker compose up -d)
./gradlew e2eTest
```

No Windows, use `gradlew.bat` no lugar de `./gradlew`.

Os testes end-to-end sobem a aplicação na porta 8090 com um banco separado (`library-e2e`), sem
mexer nos dados de desenvolvimento, e usam a tela como um usuário: cadastram livros e membros
(inclusive com foto), emprestam, devolvem e conferem as regras de negócio.

Os relatórios de cobertura ficam em `build/reports/jacoco/test/html/index.html` (back-end) e
`frontend/coverage/index.html` (front-end).
