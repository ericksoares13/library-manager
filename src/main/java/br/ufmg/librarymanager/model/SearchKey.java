package br.ufmg.librarymanager.model;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Texto em forma de chave para busca e ordenação: sem acentos, minúsculo e sem espaços nas pontas
 * ("Memórias" e "memorias" viram a mesma chave). O Mongo compara bytes, então a ordem e a busca
 * usam a chave, não o texto original.
 */
public final class SearchKey {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private SearchKey() {}

    public static String of(final String text) {
        if (text == null) {
            return "";
        }
        final String decomposed = Normalizer.normalize(text, Normalizer.Form.NFD);
        return DIACRITICS.matcher(decomposed).replaceAll("").toLowerCase(Locale.ROOT).trim();
    }
}
