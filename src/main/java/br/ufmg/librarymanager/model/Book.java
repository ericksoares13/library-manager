package br.ufmg.librarymanager.model;

import br.ufmg.librarymanager.exception.BusinessException;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "books")
public class Book {

    @Id private String id;

    private String title;

    private String author;

    // Chaves de busca e ordenação (ver SearchKey), recalculadas sempre que título ou autor mudam
    @Indexed private String titleKey;

    @Indexed private String authorKey;

    @Indexed(unique = true)
    private String isbn;

    private int totalCopies;

    private int availableCopies;

    protected Book() {}

    public Book(final String title, final String author, final String isbn, final int totalCopies) {
        requireAtLeastOneCopy(totalCopies);
        this.title = title;
        this.author = author;
        this.updateKeys();
        this.isbn = isbn;
        this.totalCopies = totalCopies;
        this.availableCopies = totalCopies;
    }

    public void updateDetails(final String title, final String author, final int totalCopies) {
        requireAtLeastOneCopy(totalCopies);
        final int borrowedCopies = this.getBorrowedCopies();
        if (totalCopies < borrowedCopies) {
            throw new BusinessException(
                    "totalCopies cannot be lower than the " + borrowedCopies + " borrowed copies");
        }
        this.title = title;
        this.author = author;
        this.totalCopies = totalCopies;
        this.availableCopies = totalCopies - borrowedCopies;
        this.updateKeys();
    }

    public void borrowCopy() {
        if (!this.isAvailable()) {
            throw new BusinessException("No copies available for this book");
        }
        this.availableCopies--;
    }

    public void returnCopy() {
        if (this.availableCopies == this.totalCopies) {
            throw new BusinessException("All copies of this book are already available");
        }
        this.availableCopies++;
    }

    public boolean isAvailable() {
        return this.availableCopies > 0;
    }

    public int getBorrowedCopies() {
        return this.totalCopies - this.availableCopies;
    }

    public String getId() {
        return this.id;
    }

    public String getTitle() {
        return this.title;
    }

    public String getAuthor() {
        return this.author;
    }

    public String getTitleKey() {
        return this.titleKey;
    }

    public String getAuthorKey() {
        return this.authorKey;
    }

    public String getIsbn() {
        return this.isbn;
    }

    public int getTotalCopies() {
        return this.totalCopies;
    }

    public int getAvailableCopies() {
        return this.availableCopies;
    }

    private void updateKeys() {
        this.titleKey = SearchKey.of(this.title);
        this.authorKey = SearchKey.of(this.author);
    }

    private static void requireAtLeastOneCopy(final int totalCopies) {
        if (totalCopies < 1) {
            throw new BusinessException("totalCopies must be at least 1");
        }
    }
}
