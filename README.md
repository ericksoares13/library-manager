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
- **Spring Boot:** framework web para a API REST, a validação de dados e a integração com o
  banco.
- **MongoDB:** banco de dados NoSQL que armazena livros, membros e empréstimos.
- **Gradle (Kotlin DSL):** build e gerenciamento de dependências.
- **JUnit 5:** testes de unidade.
- **JaCoCo:** medição da cobertura de testes.
- **GitHub Actions:** integração contínua, com testes rodando em Linux, macOS e Windows a cada
  commit.
- **Codecov:** publicação dos relatórios de cobertura.

## Uso de IA

- **Claude Code (Anthropic):** assistente de programação usado no terminal para estruturar o
  projeto, auxiliar na escrita do código e da documentação. Todo o código gerado foi revisado
  pelo autor.

## Execução dos testes

Pré-requisito: JDK 25 instalado. O Gradle Wrapper baixa o Gradle automaticamente.

```bash
# Executar os testes
./gradlew test

# Executar os testes e gerar o relatório de cobertura
./gradlew test jacocoTestReport
```

No Windows, use `gradlew.bat` no lugar de `./gradlew`.

O relatório de cobertura fica em `build/reports/jacoco/test/html/index.html`.
