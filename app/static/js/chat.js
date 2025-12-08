document.addEventListener("DOMContentLoaded", async () => {
    // 1. Conectar ao Socket.IO
    const socket = io();

    // 2. Lê o ID do outro usuário pela query string
    const urlParams = new URLSearchParams(window.location.search);
    const otherUserId = urlParams.get("user");

    if (!otherUserId) {
        alert("Erro: ID do outro usuário não encontrado.");
        return;
    }

    // 3. Buscar o ID do usuário logado (via fetch /users/me)
    const response = await fetch("/users/me");
    const me = await response.json();
    const myId = me.id;

    // 4. Entrar na sala usando seu evento "join"
    socket.emit("join", {
        user1_id: myId,
        user2_id: Number(otherUserId)
    });

    // 5. Exibir o título do chat
    document.getElementById("chatTitle").innerText =
        `Chat com usuário ${otherUserId}`;

    // 6. Exibir mensagens recebidas
    const messagesList = document.getElementById("messages");

    socket.on("receive_message", (data) => {
        const li = document.createElement("li");
        li.textContent = `${data.sender}: ${data.message}`;
        messagesList.appendChild(li);
    });

    // 7. Enviar mensagem
    document.getElementById("btnSend").addEventListener("click", () => {
        const msg = document.getElementById("msgInput").value;
        document.getElementById("msgInput").value = "";

        socket.emit("send_message", {
            sender_id: myId,
            receiver_id: Number(otherUserId),
            message: msg
        });
    });

    // 8. Quando o usuário fechar a aba ou sair da página → leave
    window.addEventListener("beforeunload", () => {
        socket.emit("leave", {
            username: me.username,     // seu handler usa username
            room: ""                   // opcional — não é necessário porque build_room_name pode reconstruir
        });
    });
});
