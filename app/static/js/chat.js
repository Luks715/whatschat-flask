// static/js/chat.js
// Responsabilidade: lógica de envio/recebimento (Socket.IO, join, send/receive, lifecycle)
// Depende de window.ChatUI exposto por chat_style.js

window.socket = io();

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Lê o ID do outro usuário pela query string
  const urlParams = new URLSearchParams(window.location.search);
  const otherUserId = urlParams.get("user");

  if (!otherUserId) {
    alert("Erro: ID do outro usuário não encontrado.");
    return;
  }

  // 2) Buscar o ID do usuário logado (via fetch /users/me)
  const response = await fetch("/users/me");
  if (!response.ok) {
    alert("Erro ao obter informações do usuário.");
    return;
  }
  const me = await response.json();
  const myId = me.id;

  // 3) Entrar na sala usando seu evento "join"
  socket.emit("join", {
    user1_id: myId,
    user2_id: Number(otherUserId)
  });

  //==============================================================
  // REMOVER ISSO AQUI DEPOIS DE IMPLEMENTAR O HMAC
  //==========================================================
  window.ChatUI.enableChatUI();

  // Exponha a função sendMessage globalmente para que o UI (chat_style.js) a invoque
  window.sendMessage = function () {
    // Usa ChatUI para ler/limpar o input (UI responsibility)
    const msg = (window.ChatUI && typeof window.ChatUI.getAndClearInput === "function")
      ? window.ChatUI.getAndClearInput()
      : "";

    if (!msg || !msg.trim()) return;

    // Envia para o servidor (mensagem em plaintext por enquanto; mais tarde substituiremos pela criptografia)
    socket.emit("send_message", {
      sender: myId,
      receiver: Number(otherUserId),
      message: msg
    });
  };

  // Handler para mensagens recebidas (apenas lógica: delega render para ChatUI)
  socket.on("receive_message", (data) => {
    // data esperado: { sender, message } (plaintext) OR encrypted object later
    if (window.ChatUI && typeof window.ChatUI.appendMessage === "function") {
      // appendMessage espera (data, myId)
      window.ChatUI.appendMessage(data, myId);
    } else {
      console.warn("ChatUI not available to append message");
    }
  });

  // 7. Quando o usuário fechar a aba ou sair da página → leave
  window.addEventListener("beforeunload", () => {
    socket.emit("leave", {
      username: me.username || "", // seu handler usa username
      room: ""                     // opcional — não é necessário porque build_room_name pode reconstruir
    });
  });

  // Optionally allow chat.js to enable UI after any handshake completes:
  // Example usage elsewhere: window.ChatUI.enableChatUI();
});
