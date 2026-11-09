package br.ufmg.librarymanager.model;

import br.ufmg.librarymanager.exception.BadRequestException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;

@DisplayName("Foto do membro")
class MemberPhotoTest {

    /** JPEG com `size` bytes: o marcador de início e o resto em zeros. */
    private static byte[] jpegOfSize(final int size) {
        final byte[] data = new byte[size];
        data[0] = (byte) 0xFF;
        data[1] = (byte) 0xD8;
        data[2] = (byte) 0xFF;
        return data;
    }

    static byte[][] notJpeg() {
        // PNG (outro formato de imagem) e um começo de JPEG cortado
        return new byte[][] {{(byte) 0x89, 0x50, 0x4E, 0x47}, {(byte) 0xFF, (byte) 0xD8}};
    }

    @Test
    @DisplayName("Guarda a foto JPEG no tamanho máximo")
    void givenJpegWithMaxSize_whenCreatePhoto_thenKeepsTheData() {
        // Arrange
        final byte[] data = jpegOfSize(MemberPhoto.MAX_BYTES);

        // Act
        final MemberPhoto photo = new MemberPhoto("m1", data);

        // Assert
        Assertions.assertEquals("m1", photo.getMemberId());
        Assertions.assertArrayEquals(data, photo.getData());
    }

    @Test
    @DisplayName("Recusa foto maior que 1 MB")
    void givenJpegOverMaxSize_whenCreatePhoto_thenThrowsBadRequestException() {
        // Arrange
        final byte[] data = jpegOfSize(MemberPhoto.MAX_BYTES + 1);

        // Act
        final BadRequestException thrown =
                Assertions.assertThrows(
                        BadRequestException.class, () -> new MemberPhoto("m1", data));

        // Assert
        Assertions.assertEquals("Photo must be at most 1 MB", thrown.getMessage());
    }

    @ParameterizedTest(name = "bytes {0}")
    @NullAndEmptySource
    @MethodSource("notJpeg")
    @DisplayName("Recusa foto que não é JPEG")
    void givenDataThatIsNotJpeg_whenCreatePhoto_thenThrowsBadRequestException(final byte[] data) {
        // Arrange
        final String memberId = "m1";

        // Act
        final BadRequestException thrown =
                Assertions.assertThrows(
                        BadRequestException.class, () -> new MemberPhoto(memberId, data));

        // Assert
        Assertions.assertEquals("Photo must be a JPEG image", thrown.getMessage());
    }
}
