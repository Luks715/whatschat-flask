// static/js/chat.js
// Lógica: Socket.IO, handshake ECDH, criptografia AES-GCM + HMAC
// Depende de window.ChatUI (UI) e window.ChatCrypto (criptografia)

window.socket = io();

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // 1) Obter IDs
  // =========================================================
  const urlParams = new URLSearchParams(window.location.search);
  const otherUserId = urlParams.get("user");

  if (!otherUserId) {
    alert("Erro: ID do outro usuário não encontrado.");
    return;
  }

  const response = await fetch("/users/me");
  if (!response.ok) {
    alert("Erro ao obter informações do usuário logado.");
    return;
  }
  const me = await response.json();
  const myId = me.id;

  // =========================================================
  // 2) Entrar na sala
  // =========================================================
  socket.emit("join", {
    user1_id: myId,
    user2_id: Number(otherUserId)
  });

  // UI começa desabilitada em chat_style.js
  // Espera handshake concluir para habilitar

  // =========================================================
  // 3) Gerar par ECDH local
  // =========================================================
  console.log("Gerando par DH local...");
  const myDH = await ChatCrypto.generateDHKeyPair();
  const myPublicKeyB64 = await ChatCrypto.exportDHPublicKeyBase64(myDH.publicKey);

  // Armazena estado E2EE na janela
  window.E2EE = {
    myId,
    otherUserId: Number(otherUserId),
    myDH,
    myPublicKeyB64,
    otherPublicKey: null,
    aesKey: null,
    hmacKey: null,

    // flags de controle
    myKeySent: false,
    theirKeyReceived: false,
    keysDerived: false
  };

  // =========================================================
  // Listener: receber DH público do interlocutor
  // (registra antes de enviar nossa chave)
  // =========================================================
  socket.on("receive_dh_public_key", async (data) => {
    console.log("receive_dh_public_key evento:", data);
    const sender = data.sender;
    const remoteKeyB64 = data.dh_public_key;

    // Ignore echoes of our own send (server may retransmit)
    if (sender === window.E2EE.myId) return;

    // If keys already derived, ignore subsequent DH public keys
    if (window.E2EE.keysDerived) {
      console.log("Chaves já derivadas — ignorando chave pública adicional.");
      window.E2EE.theirKeyReceived = true;
      return;
    }

    console.log("Recebi chave pública DH do outro usuário.");

    // Import remote public key
    let remoteKey;
    try {
      remoteKey = await ChatCrypto.importDHPublicKeyBase64(remoteKeyB64);
    } catch (err) {
      console.error("Erro ao importar chave pública remota:", err);
      return;
    }

    window.E2EE.otherPublicKey = remoteKey;
    window.E2EE.theirKeyReceived = true;

    // If for some reason we never sent our key (shouldn't happen normally),
    // send it once now to ensure both sides have each other's public.
    if (!window.E2EE.myKeySent) {
      console.log("Ainda não havia enviado minha chave — reenviando agora (uma vez).");
      console.log("Emitindo send_dh_public_key ->", window.E2EE.myPublicKeyB64.slice(0, 40));
      socket.emit("send_dh_public_key", {
        sender: window.E2EE.myId,
        receiver: window.E2EE.otherUserId,
        dh_public_key: window.E2EE.myPublicKeyB64
      });
      window.E2EE.myKeySent = true;
    }

    // Derive session keys once
    try {
      console.log("Derivando chaves AES/HMAC via ECDH...");
      const { K_enc, K_mac } = await ChatCrypto.deriveSessionKeysFromPeer(
        window.E2EE.myDH.privateKey,
        remoteKey
      );

      window.E2EE.aesKey = K_enc;
      window.E2EE.hmacKey = K_mac;
      window.E2EE.keysDerived = true;

      console.log("Handshake concluído. Criptografia ponta a ponta habilitada.");
      window.ChatUI.enableChatUI();
    } catch (err) {
      console.error("Erro ao derivar chaves de sessão:", err);
    }
  });

  // =========================================================
  // Listener: load_history — só após isso enviamos nossa DH pública
  // (load_history confirma que o servidor nos colocou na sala)
  // =========================================================
  socket.on("load_history", (history) => {
    console.log("load_history recebido — entramos na sala, podemos enviar DH público.");

    if (!window.E2EE.myKeySent) {
      socket.emit("send_dh_public_key", {
        sender: window.E2EE.myId,
        receiver: window.E2EE.otherUserId,
        dh_public_key: window.E2EE.myPublicKeyB64
      });
      window.E2EE.myKeySent = true;
    }
  });

  // =========================================================
  // 4) Enviar mensagem criptografada
  // =========================================================
  window.sendMessage = async function () {
    if (!window.E2EE.aesKey || !window.E2EE.hmacKey) {
      alert("Aguardando conclusão do handshake seguro...");
      return;
    }

    const plaintext = window.ChatUI.getAndClearInput();
    if (!plaintext.trim()) return;

    const encrypted = await ChatCrypto.encryptMessage(
      window.E2EE.aesKey,
      window.E2EE.hmacKey,
      plaintext
    );

    socket.emit("send_message", {
      sender: window.E2EE.myId,
      receiver: window.E2EE.otherUserId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      mac: encrypted.mac
    });
  };

  // =========================================================
  // 5) Receber mensagem criptografada
  // =========================================================
  socket.on("receive_message", async (data) => {
    if (!window.E2EE.aesKey || !window.E2EE.hmacKey) {
      console.warn("Mensagem recebida antes do handshake; ignorada.");
      return;
    }

    let plaintext = "";
    try {
      plaintext = await ChatCrypto.decryptMessage(
        window.E2EE.aesKey,
        window.E2EE.hmacKey,
        data.ciphertext,
        data.iv,
        data.mac
      );
    } catch (err) {
      console.error("Erro ao verificar integridade ou descriptografar:", err);
      return;
    }

    window.ChatUI.appendMessage(
      { sender: data.sender, message: plaintext },
      window.E2EE.myId
    );
  });

  // =========================================================
  // 6) Evento leave
  // =========================================================
  window.addEventListener("beforeunload", () => {
    socket.emit("leave", {
      user_id: window.E2EE.myId,
      other_id: window.E2EE.otherUserId
    });
  });
});
