package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.BookRequest;
import br.ufmg.librarymanager.dto.BookResponse;
import br.ufmg.librarymanager.service.BookService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(final BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping
    public List<BookResponse> findAll() {
        return this.bookService.findAll().stream().map(BookResponse::from).toList();
    }

    @GetMapping("/{id}")
    public BookResponse findById(@PathVariable final String id) {
        return BookResponse.from(this.bookService.findById(id));
    }

    @PostMapping
    public ResponseEntity<BookResponse> create(@Valid @RequestBody final BookRequest request) {
        final BookResponse created = BookResponse.from(this.bookService.create(request));
        return ResponseEntity.created(URI.create("/api/books/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public BookResponse update(
            @PathVariable final String id, @Valid @RequestBody final BookRequest request) {
        return BookResponse.from(this.bookService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable final String id) {
        this.bookService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
