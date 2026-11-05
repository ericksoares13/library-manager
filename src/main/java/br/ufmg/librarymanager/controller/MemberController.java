package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.MemberRequest;
import br.ufmg.librarymanager.dto.MemberResponse;
import br.ufmg.librarymanager.service.MemberService;
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
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(final MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public List<MemberResponse> findAll() {
        return this.memberService.findAll().stream().map(MemberResponse::from).toList();
    }

    @GetMapping("/{id}")
    public MemberResponse findById(@PathVariable final String id) {
        return MemberResponse.from(this.memberService.findById(id));
    }

    @PostMapping
    public ResponseEntity<MemberResponse> create(@Valid @RequestBody final MemberRequest request) {
        final MemberResponse created = MemberResponse.from(this.memberService.create(request));
        return ResponseEntity.created(URI.create("/api/members/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public MemberResponse update(
            @PathVariable final String id, @Valid @RequestBody final MemberRequest request) {
        return MemberResponse.from(this.memberService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable final String id) {
        this.memberService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
