package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.MemberPhoto;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MemberPhotoRepository extends MongoRepository<MemberPhoto, String> {}
