package br.ufmg.librarymanager.model;

import java.util.Locale;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "members")
public class Member {

    public static final int MAX_ACTIVE_LOANS = 3;

    @Id private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    // Chave de busca e ordenação do nome (ver SearchKey), recalculada sempre que o nome muda
    @Indexed private String nameKey;

    private boolean hasPhoto;

    // Cresce a cada foto nova e não volta atrás ao remover: o endereço da foto nunca se repete
    private int photoVersion;

    protected Member() {}

    public Member(final String name, final String email) {
        this.name = name;
        this.email = normalizeEmail(email);
        this.nameKey = SearchKey.of(name);
    }

    /**
     * E-mail como é guardado: em minúsculas, para "Ana@Example.com" e "ana@example.com" serem o
     * mesmo e-mail no índice único.
     */
    public static String normalizeEmail(final String email) {
        return email.toLowerCase(Locale.ROOT);
    }

    public void updateDetails(final String name, final String email) {
        this.name = name;
        this.email = normalizeEmail(email);
        this.nameKey = SearchKey.of(name);
    }

    /** Registra uma foto nova (a imagem fica em `MemberPhoto`). */
    public void changePhoto() {
        this.hasPhoto = true;
        this.photoVersion++;
    }

    public void removePhoto() {
        this.hasPhoto = false;
    }

    /** Versão da foto atual; `null` sem foto. */
    public Integer getPhotoVersion() {
        return this.hasPhoto ? this.photoVersion : null;
    }

    public String getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public String getEmail() {
        return this.email;
    }

    public String getNameKey() {
        return this.nameKey;
    }
}
