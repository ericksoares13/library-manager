package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.MemberRequest;
import br.ufmg.librarymanager.dto.MemberResponse;
import br.ufmg.librarymanager.dto.MemberSort;
import br.ufmg.librarymanager.dto.PageResponse;
import br.ufmg.librarymanager.service.MemberService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(final MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public PageResponse<MemberResponse> search(
            @RequestParam(defaultValue = "") final String q,
            @RequestParam(defaultValue = "NAME") final MemberSort sort,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return PageResponse.from(
                this.memberService.search(q, sort, page, size), MemberResponse::from);
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

    @PutMapping("/{id}/photo")
    public MemberResponse changePhoto(
            @PathVariable final String id, @RequestBody final byte[] photo) {
        return MemberResponse.from(this.memberService.changePhoto(id, photo));
    }

    /**
     * A foto em JPEG. O front pede com a versão no endereço (`?v=`), então o navegador pode guardar
     * a imagem: uma foto nova tem outro endereço.
     */
    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> findPhoto(@PathVariable final String id) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic())
                .body(this.memberService.findPhoto(id));
    }

    @DeleteMapping("/{id}/photo")
    public MemberResponse removePhoto(@PathVariable final String id) {
        return MemberResponse.from(this.memberService.removePhoto(id));
    }
}
