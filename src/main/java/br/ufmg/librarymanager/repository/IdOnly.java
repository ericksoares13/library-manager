package br.ufmg.librarymanager.repository;

/** Projeção que traz só o id do documento (busca de livros e membros para filtrar empréstimos). */
public interface IdOnly {

    String getId();
}
