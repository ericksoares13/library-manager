package br.ufmg.librarymanager.model;

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

    protected Member() {}

    public Member(final String name, final String email) {
        this.name = name;
        this.email = email;
        this.nameKey = SearchKey.of(name);
    }

    public void updateDetails(final String name, final String email) {
        this.name = name;
        this.email = email;
        this.nameKey = SearchKey.of(name);
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
