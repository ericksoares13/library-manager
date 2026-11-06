package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BookRepository extends MongoRepository<Book, String> {

    boolean existsByIsbn(String isbn);

    Page<Book> findByTitleKeyContainingOrAuthorKeyContainingOrIsbnContaining(
            String titleKey, String authorKey, String isbn, Pageable pageable);
}
