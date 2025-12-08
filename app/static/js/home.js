document.addEventListener('DOMContentLoaded', function() { 
    
    // --- Lógica de Logout --- 
    const btnLogout = document.getElementById('btnLogout'); 
    btnLogout.addEventListener('click', async () => { 
        try { 
            const response = await fetch('/auth/logout'); 
            if (response.ok) { 
                window.location.href = '/'; // Redireciona para raiz (vai cair no login) 
            } 
        } catch (error) { 
            console.error("Erro ao fazer logout:", error); 
        } 
    }); 
    
    // --- Lógica da Lista de Usuários --- 
    let allUsers = []; // Guarda todos os usuários na memória 
    let currentPage = 1; 
    const itemsPerPage = 8; // Quantos cards por página 

    const userGrid = document.getElementById('userGrid'); 
    const searchInput = document.getElementById('searchInput'); 
    const btnPrev = document.getElementById('btnPrev'); 
    const btnNext = document.getElementById('btnNext'); 
    const pageIndicator = document.getElementById('pageIndicator'); 
    
    // 1. Busca os dados iniciais 
    async function fetchUsers() { 
        try { 
            const response = await fetch('/users/allusers'); 
            if (!response.ok) throw new Error("Falha ao buscar usuários"); 
            
            const data = await response.json(); 
            allUsers = data; // Armazena 
            // renderUsers(); // Renderiza a primeira vez 
        } catch (error) { 
            userGrid.innerHTML = <p class="error-message" style="display:block">Erro ao carregar usuários: ${error.message}</p>; 
        } 
    } 
    
    // 2. Função de Renderização (Filtra + Pagina + Cria HTML) 
    function renderUsers() { 
        userGrid.innerHTML = ''; 
        
        // A. Filtragem (Pesquisa) 
        const term = searchInput.value.toLowerCase(); 
        const filteredUsers = allUsers.filter(user => 
            user.username.toLowerCase().includes(term) 
        ); 
        
        // B. Paginação 
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1; 
        
        // Garante que a página atual não estoure o limite após uma pesquisa 
        if (currentPage > totalPages) currentPage = 1; 
        
        const start = (currentPage - 1) * itemsPerPage; 
        const end = start + itemsPerPage; 
        const pageItems = filteredUsers.slice(start, end); 
        
        // C. Geração do HTML 
        if (pageItems.length === 0) { 
            userGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">Nenhum usuário encontrado.</p>'; 
        } else { 
            pageItems.forEach(user => { 
                const card = document.createElement('div'); 
                card.className = 'user-card'; 
                // Ícone SVG simples para o avatar e botão 
                card.innerHTML = `
                    <div class="user-avatar"> 
                        <span>${user.username.charAt(0).toUpperCase()}</span> 
                    </div> 
                    <div class="user-name">${user.username}</div> 
                    <button class="btn-chat" onclick="startChat(${user.id}, '${user.username}')"> 
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 
                        Conversar 
                    </button> 
                `; 
                userGrid.appendChild(card); 
            }); 
        } 
            
        // D. Atualiza Controles de Paginação 
        pageIndicator.innerText = `Página ${currentPage} de ${totalPages}; btnPrev.disabled = currentPage === 1`; 
        btnNext.disabled = currentPage === totalPages; 
    } 
        
    // --- Event Listeners --- 
        
    // Pesquisa (reseta para página 1 ao digitar) 
    searchInput.addEventListener('input', () => { 
        currentPage = 1; 
        renderUsers(); 
    }); 
        
    // Botões de Paginação 
    btnPrev.addEventListener('click', () => { 
        if (currentPage > 1) { 
            currentPage--; 
            renderUsers(); 
        } 
    }); 
        
    btnNext.addEventListener('click', () => { 
        // Recalcula totalPages para saber se pode avançar 
        const term = searchInput.value.toLowerCase(); 
        const filteredLength = allUsers.filter(u => u.username.toLowerCase().includes(term)).length; 
        const totalPages = Math.ceil(filteredLength / itemsPerPage); 
            
        if (currentPage < totalPages) { 
            currentPage++; 
            renderUsers(); 
        } 
    }); 
        
    // Função Placeholder para futuro chat 
    window.startChat = (userId, username) => { 
        window.location.href = `/chat?user=${userId}`; 
        //alert(`Implementar abertura de canal seguro com: ${username} (ID: ${userId})`); 
    }; 
            
    // Inicializa 
    fetchUsers(); 
});
