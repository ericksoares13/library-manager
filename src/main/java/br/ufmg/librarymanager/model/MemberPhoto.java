package br.ufmg.librarymanager.model;

import br.ufmg.librarymanager.exception.BadRequestException;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Foto do membro (JPEG já recortado pelo front), numa coleção separada: a listagem de membros não
 * carrega as imagens. O id é o do membro.
 */
@Document(collection = "member_photos")
public class MemberPhoto {

    /** Tamanho máximo da foto (1 MB): o front envia cerca de 100 KB. */
    public static final int MAX_BYTES = 1024 * 1024;

    // Um JPEG sempre começa com o marcador SOI (FF D8) seguido de outro marcador (FF)
    private static final byte[] JPEG_START = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    @Id private String memberId;

    private byte[] data;

    protected MemberPhoto() {}

    public MemberPhoto(final String memberId, final byte[] data) {
        if (!isJpeg(data)) {
            throw new BadRequestException("Photo must be a JPEG image");
        }
        if (data.length > MAX_BYTES) {
            throw new BadRequestException("Photo must be at most 1 MB");
        }
        this.memberId = memberId;
        this.data = data.clone();
    }

    private static boolean isJpeg(final byte[] data) {
        if (data == null || data.length < JPEG_START.length) {
            return false;
        }
        for (int i = 0; i < JPEG_START.length; i++) {
            if (data[i] != JPEG_START[i]) {
                return false;
            }
        }
        return true;
    }

    public String getMemberId() {
        return this.memberId;
    }

    public byte[] getData() {
        return this.data.clone();
    }
}
