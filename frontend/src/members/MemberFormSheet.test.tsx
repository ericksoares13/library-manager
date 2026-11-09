import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Member } from "../api/members";
import { mockApi, type Route } from "../test/mockApi";
import { MemberFormSheet } from "./MemberFormSheet";

// O jsdom não carrega imagens nem desenha em canvas: a imagem escolhida "tem" 400 × 600 px e o
// canvas devolve um JPEG falso. O quadro do recorte fica no tamanho padrão (240 × 360 px)

const created: Member = {
  id: "m3",
  name: "Carla Dias",
  email: "carla@example.com",
  photoVersion: null,
};

const withPhoto: Member = { ...created, photoVersion: 2 };

const createRoute: Route = { method: "POST", url: "/api/members", status: 201, body: created };

const photoRoute = (status = 200): Route => ({
  method: "PUT",
  url: "/api/members/m3/photo",
  status,
  body: status === 200 ? { ...created, photoVersion: 1 } : { message: "error" },
});

function fakeCanvas() {
  const context = { drawImage: vi.fn(), translate: vi.fn(), scale: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
    callback(new Blob(["jpeg"], { type: "image/jpeg" })),
  );
  return context;
}

function fakeCamera(getUserMedia: () => Promise<MediaStream>) {
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: vi.fn(getUserMedia), enumerateDevices: async () => [] },
  });
}

function fakeStream() {
  const track = { stop: vi.fn() };
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream };
}

function renderSheet(member?: Member) {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<MemberFormSheet member={member} onClose={vi.fn()} onSaved={onSaved} />);
  return { user, onSaved };
}

/** Escolhe um arquivo e espera o ajuste abrir com a imagem carregada. */
async function chooseImage(user: ReturnType<typeof userEvent.setup>) {
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(600);
  await user.upload(
    screen.getByLabelText("Arquivo da foto"),
    new File(["foto"], "carla.jpg", { type: "image/jpeg" }),
  );
  const dialog = screen.getByRole("dialog", { name: "Ajustar foto" });
  fireEvent.load(within(dialog).getByRole("img", { name: "Foto escolhida" }));
  return dialog;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome"), "Carla Dias");
  await user.type(screen.getByLabelText("E-mail"), "carla@example.com");
}

const callsTo = (fetchMock: ReturnType<typeof mockApi>, method: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([input]) => String(input));

describe("Foto no formulário do membro", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recorta o que está no quadro, com o zoom e a posição escolhidos", async () => {
    // Arrange
    const context = fakeCanvas();
    const { user } = renderSheet();
    const dialog = await chooseImage(user);
    await user.click(within(dialog).getByRole("group", { name: /Posição da foto/ }));
    await user.keyboard("++++{ArrowRight}");

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Usar foto" }));

    // Assert
    const form = screen.getByRole("dialog", { name: "Novo membro" });
    expect(within(form).getByRole("img", { name: "Foto do membro" })).toBeInTheDocument();
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      expect.closeTo(100 - 10 / 1.2, 5),
      150,
      200,
      300,
      0,
      0,
      600,
      900,
    );
  });

  it("envia a foto depois de cadastrar o membro", async () => {
    // Arrange
    fakeCanvas();
    const fetchMock = mockApi(createRoute, photoRoute());
    const { user, onSaved } = renderSheet();
    const dialog = await chooseImage(user);
    await user.click(within(dialog).getByRole("button", { name: "Usar foto" }));
    await fillForm(user);

    // Act
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    // Assert
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...created, photoVersion: 1 }));
    const upload = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(upload?.[1]?.body).toBeInstanceOf(Blob);
    expect(callsTo(fetchMock, "POST")).toEqual(["/api/members"]);
  });

  it("se a foto falhar, salvar de novo atualiza o membro já cadastrado", async () => {
    // Arrange
    fakeCanvas();
    const fetchMock = mockApi(createRoute, photoRoute(500), {
      method: "PUT",
      url: "/api/members/m3",
      body: created,
    });
    const { user } = renderSheet();
    const dialog = await chooseImage(user);
    await user.click(within(dialog).getByRole("button", { name: "Usar foto" }));
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await screen.findByText(
      "O membro foi salvo, mas não foi possível salvar a foto. Tente novamente.",
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    // Assert
    await waitFor(() => expect(callsTo(fetchMock, "PUT")).toContain("/api/members/m3"));
    expect(callsTo(fetchMock, "POST")).toEqual(["/api/members"]);
  });

  it("remove a foto ao salvar", async () => {
    // Arrange
    const fetchMock = mockApi(
      { method: "PUT", url: "/api/members/m3", body: withPhoto },
      { method: "DELETE", url: "/api/members/m3/photo", body: created },
    );
    const { user, onSaved } = renderSheet(withPhoto);
    await user.click(screen.getByRole("button", { name: "Remover foto" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    // Assert
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created));
    expect(callsTo(fetchMock, "DELETE")).toEqual(["/api/members/m3/photo"]);
  });

  it("avisa quando a imagem escolhida não abre", async () => {
    // Arrange
    const { user } = renderSheet();
    await user.upload(
      screen.getByLabelText("Arquivo da foto"),
      new File(["texto"], "notas.jpg", { type: "image/jpeg" }),
    );

    // Act
    fireEvent.error(screen.getByRole("img", { name: "Foto escolhida" }));

    // Assert
    expect(screen.getByRole("dialog", { name: "Novo membro" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível abrir esta imagem. Escolha outra.",
    );
  });

  it("fechar o ajuste volta ao formulário sem perder o que foi preenchido", async () => {
    // Arrange
    const { user } = renderSheet();
    await user.type(screen.getByLabelText("Nome"), "Carla Dias");
    await chooseImage(user);

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(screen.getByRole("dialog", { name: "Novo membro" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Carla Dias");
    expect(screen.queryByRole("img", { name: "Foto do membro" })).not.toBeInTheDocument();
  });

  it("sem câmera no navegador, oferece só escolher um arquivo", () => {
    // Arrange
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });

    // Act
    renderSheet();

    // Assert
    expect(screen.queryByRole("button", { name: "Tirar foto" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escolher foto" })).toBeInTheDocument();
  });
});

describe("Câmera no formulário do membro", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tira a foto espelhada, como aparece na tela, e leva ao ajuste", async () => {
    // Arrange
    const context = fakeCanvas();
    fakeCamera(async () => fakeStream().stream);
    vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(1280);
    vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(720);
    const { user } = renderSheet();
    await user.click(screen.getByRole("button", { name: "Tirar foto" }));
    fireEvent.loadedData(screen.getByLabelText("Imagem da câmera"));

    // Act
    await user.click(screen.getByRole("button", { name: "Tirar foto" }));

    // Assert
    expect(screen.getByRole("dialog", { name: "Ajustar foto" })).toBeInTheDocument();
    expect(context.scale).toHaveBeenCalledWith(-1, 1);
  });

  it("avisa quando não há permissão para usar a câmera", async () => {
    // Arrange
    fakeCamera(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    const { user } = renderSheet();

    // Act
    await user.click(screen.getByRole("button", { name: "Tirar foto" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sem permissão para usar a câmera. Libere o acesso nas configurações do navegador.",
    );
    expect(screen.getByRole("button", { name: "Tirar foto" })).toBeDisabled();
  });

  it("desliga a câmera ao cancelar", async () => {
    // Arrange
    const { track, stream } = fakeStream();
    fakeCamera(async () => stream);
    const { user } = renderSheet();
    await user.click(screen.getByRole("button", { name: "Tirar foto" }));
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    // Act
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    await waitFor(() => expect(track.stop).toHaveBeenCalled());
    expect(screen.getByRole("dialog", { name: "Novo membro" })).toBeInTheDocument();
  });
});
