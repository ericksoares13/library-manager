# Library Manager

Sistema web de gerenciamento de biblioteca, desenvolvido como trabalho prático da disciplina de
Teste de Software.

## Integrantes

- Erick Soares de Souza

## Sobre o sistema

O Library Manager permite gerenciar o acervo e os empréstimos de uma biblioteca:

- **Livros:** cadastro com título, autor, ISBN e quantidade de exemplares, com controle dos
  exemplares disponíveis.
- **Membros:** cadastro de leitores com nome e e-mail.
- **Empréstimos:** empréstimo de um livro a um membro com data de devolução prevista, além do
  registro da devolução.

## Tecnologias

- **Java 25:** linguagem principal.
- **Spring Boot:** framework web para a API REST, a validação de dados e a integração com o banco.
- **MongoDB:** banco de dados NoSQL que armazena livros, membros e empréstimos.
- **React + TypeScript:** interface web, em `frontend/`.
- **Vite:** servidor de desenvolvimento e build do front-end, servido pelo próprio Spring Boot.
- **Motion:** animações da interface.
- **Material Symbols (Google):** ícones da interface, no estilo Rounded (licença Apache 2.0).
- **Gradle (Kotlin DSL):** build e gerenciamento de dependências.
- **JUnit 5:** testes de unidade do back-end.
- **Vitest + Testing Library:** testes do front-end, simulando o uso da tela.
- **JaCoCo:** medição da cobertura de testes.
- **GitHub Actions:** integração contínua, com testes rodando em Linux, macOS e Windows a cada
  commit.
- **Codecov:** publicação dos relatórios de cobertura.

## Uso de IA

- **Claude Code (Anthropic):** assistente de programação usado no terminal para estruturar o
  projeto, auxiliar na escrita do código e da documentação. Todo o código gerado foi revisado pelo
  autor.
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
- A cada push, o CI gera a imagem Docker (job `package`) para garantir que ela continua compilando.
- O deploy é manual: na aba **Actions** do GitHub, **CI → Run workflow** roda o pipeline inteiro e,
  se tudo passar, o job `deploy` publica a versão da `main` no Render.

Para gerar e rodar a imagem localmente (com o MongoDB do `docker compose`):

```bash
docker build -t library-manager .
docker run -p 8080:8080 -e MONGODB_URI=mongodb://host.docker.internal:27017/library library-manager
```

No plano gratuito, o Render desliga o serviço após cerca de 15 minutos sem acesso; a primeira visita
seguinte leva em torno de 1 minuto para carregar.

## Execução dos testes

Pré-requisito: JDK 25 instalado. O Gradle Wrapper baixa o Gradle e o Node.js automaticamente.

```bash
# Back-end (JUnit) com relatório de cobertura
./gradlew test

# Front-end (Vitest) com relatório de cobertura
./gradlew testFrontend

# Tudo: formatação, lint, testes e verificação de cobertura mínima (80%)
./gradlew check
```

No Windows, use `gradlew.bat` no lugar de `./gradlew`.

Os relatórios de cobertura ficam em `build/reports/jacoco/test/html/index.html` (back-end) e
`frontend/coverage/index.html` (front-end).
