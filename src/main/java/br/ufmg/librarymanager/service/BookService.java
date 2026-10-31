package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.BookRequest;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.repository.BookRepository;
import br.ufmg.librarymanager.repository.LoanRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BookService {

    private final BookRepository bookRepository;

    private final LoanRepository loanRepository;

    public BookService(final BookRepository bookRepository, final LoanRepository loanRepository) {
        this.bookRepository = bookRepository;
        this.loanRepository = loanRepository;
    }

    public List<Book> findAll() {
        return this.bookRepository.findAll();
    }

    public Book findById(final String id) {
        return this.bookRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Book not found: " + id));
    }

    public Book create(final BookRequest request) {
        if (this.bookRepository.existsByIsbn(request.isbn())) {
            throw new BusinessException("A book with ISBN " + request.isbn() + " already exists");
        }
        final Book book =
                new Book(request.title(), request.author(), request.isbn(), request.totalCopies());
        return this.bookRepository.save(book);
    }

    public Book update(final String id, final BookRequest request) {
        final Book book = this.findById(id);
        if (!book.getIsbn().equals(request.isbn())) {
            throw new BusinessException("The ISBN of a book cannot be changed");
        }
        book.updateDetails(request.title(), request.author(), request.totalCopies());
        return this.bookRepository.save(book);
    }

    public void delete(final String id) {
        final Book book = this.findById(id);
        if (this.loanRepository.existsByBookIdAndReturnDateIsNull(id)) {
            throw new BusinessException("A book with active loans cannot be deleted");
        }
        this.bookRepository.delete(book);
    }
}
