package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MemberRepository extends MongoRepository<Member, String> {

    boolean existsByEmail(String email);

    Page<Member> findByNameKeyContainingOrEmailContainingIgnoreCase(
            String nameKey, String email, Pageable pageable);
}
