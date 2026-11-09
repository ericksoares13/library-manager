plugins {
    java
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    jacoco
    checkstyle
    id("com.diffplug.spotless") version "8.0.0"
    id("com.github.node-gradle.node") version "7.1.0"
}

group = "br.ufmg"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

val mockitoAgent = configurations.create("mockitoAgent")

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    mockitoAgent("org.mockito:mockito-core") { isTransitive = false }
}

spotless {
    lineEndings = com.diffplug.spotless.LineEnding.UNIX
    java {
        googleJavaFormat().aosp().reflowLongStrings()
        removeUnusedImports()
        trimTrailingWhitespace()
        endWithNewline()
    }
    kotlinGradle {
        ktlint()
    }
    format("markdown") {
        target("**/*.md")
        targetExclude("build/**", ".claude/**", "frontend/node_modules/**")
        prettier("3.6.2").config(
            mapOf(
                "parser" to "markdown",
                "proseWrap" to "always",
                "printWidth" to 100,
            ),
        )
    }
    format("frontend") {
        target(
            "frontend/**/*.ts",
            "frontend/**/*.tsx",
            "frontend/**/*.js",
            "frontend/**/*.css",
            "frontend/**/*.json",
            "frontend/index.html",
        )
        targetExclude(
            "frontend/node_modules/**",
            "frontend/dist/**",
            "frontend/coverage/**",
            "frontend/playwright-report/**",
            "frontend/test-results/**",
            "frontend/package-lock.json",
        )
        prettier("3.6.2").configFile("frontend/.prettierrc.json")
    }
    format("misc") {
        target(".gitignore", ".githooks/*", ".github/**/*.yml", "config/**/*.xml")
        trimTrailingWhitespace()
        endWithNewline()
    }
}

val installGitHooks by tasks.registering(Exec::class) {
    description = "Configura o git para usar os hooks versionados em .githooks"
    onlyIf { file(".git").exists() }
    commandLine("git", "config", "core.hooksPath", ".githooks")
}

tasks.compileJava {
    dependsOn(installGitHooks)
}

// Front-end: o Gradle baixa o Node e gera o build do Vite, que o Spring Boot serve como estático
node {
    version = "24.22.2"
    download = true
    nodeProjectDir = file("frontend")
    npmInstallCommand = "ci"
}

val frontendSources =
    files(
        "frontend/src",
        "frontend/public",
        "frontend/index.html",
        "frontend/package-lock.json",
        "frontend/vite.config.ts",
        "frontend/tsconfig.json",
        "frontend/e2e",
        "frontend/playwright.config.ts",
    )

val buildFrontend by tasks.registering(com.github.gradle.node.npm.task.NpmTask::class) {
    description = "Compila o front-end (tsc + vite build) em frontend/dist"
    dependsOn(tasks.npmInstall)
    args = listOf("run", "build")
    inputs.files(frontendSources)
    outputs.dir("frontend/dist")
}

val lintFrontend by tasks.registering(com.github.gradle.node.npm.task.NpmTask::class) {
    description = "Roda o ESLint no front-end"
    dependsOn(tasks.npmInstall)
    args = listOf("run", "lint")
    inputs.files(frontendSources, "frontend/eslint.config.js")
    outputs.upToDateWhen { true }
}

val testFrontend by tasks.registering(com.github.gradle.node.npm.task.NpmTask::class) {
    description = "Roda os testes do front-end (Vitest) com cobertura em frontend/coverage"
    dependsOn(tasks.npmInstall)
    args = listOf("run", "test")
    inputs.files(frontendSources)
    outputs.dir("frontend/coverage")
}

// Testes end-to-end (Playwright): sobem o jar numa porta própria com o banco library-e2e. Fora do
// `check` porque precisam do MongoDB rodando (no CI, instalado no próprio runner)
val installE2eBrowsers by tasks.registering(com.github.gradle.node.npm.task.NpxTask::class) {
    description = "Baixa o Chromium do Playwright (e as dependências do sistema no Linux)"
    dependsOn(tasks.npmInstall)
    command = "playwright"
    args = listOf("install", "--with-deps", "chromium")
}

val e2eTest by tasks.registering(com.github.gradle.node.npm.task.NpmTask::class) {
    description = "Roda os testes end-to-end (Playwright) contra a aplicação empacotada"
    group = "verification"
    dependsOn(tasks.npmInstall, installE2eBrowsers, tasks.bootJar)
    args = listOf("run", "e2e")
}

tasks.processResources {
    from(buildFrontend) { into("static") }
}

tasks.check {
    dependsOn(lintFrontend, testFrontend)
}

checkstyle {
    toolVersion = "11.1.0"
    maxWarnings = 0
}

jacoco {
    toolVersion = "0.8.14"
}

tasks.test {
    useJUnitPlatform()
    // Mockito como agente: o Java 21+ restringe o carregamento dinâmico de agentes
    jvmArgs("-javaagent:${mockitoAgent.asPath}")
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

tasks.jacocoTestCoverageVerification {
    dependsOn(tasks.jacocoTestReport)
    violationRules {
        rule {
            limit {
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}

tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}
