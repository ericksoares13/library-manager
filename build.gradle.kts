plugins {
    java
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    jacoco
    checkstyle
    id("com.diffplug.spotless") version "8.0.0"
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

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    testImplementation(platform("org.junit:junit-bom:6.0.0"))
    testImplementation("org.springframework.boot:spring-boot-starter-test")
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
        targetExclude("build/**", ".claude/**")
        prettier("3.6.2").config(mapOf("parser" to "markdown", "proseWrap" to "always", "printWidth" to 100))
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

checkstyle {
    toolVersion = "11.1.0"
    maxWarnings = 0
}

jacoco {
    toolVersion = "0.8.14"
}

tasks.test {
    useJUnitPlatform()
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
