// ================= CONFIGURAÇÕES INICIAIS =================
const API_URL = 'http://127.0.0.1:5000/api'; // Endereço do seu backend em Python

// Estado global do Sistema (espelha o que está no banco de dados)
let state = {
    professores: [],
    cursos: [],
    disciplinas: [],
    aulas: []
};

// Variáveis de controle para saber se estamos criando (null) ou editando (ID) um item
let editandoProfId = null; 
let editandoDiscId = null;
let editandoCursoId = null;

// Array temporário para guardar as disciplinas selecionadas no cadastro de professor (Tags)
let disciplinasProfSelecionadas = [];


// ================= BUSCA INICIAL DE DADOS =================
// Busca todos os dados do banco ao carregar a página
async function carregarDados() {
    try {
        // Faz as 4 requisições em paralelo para o sistema carregar mais rápido
        const [resProf, resCur, resDisc, resAulas] = await Promise.all([
            fetch(`${API_URL}/professores`),
            fetch(`${API_URL}/cursos`),
            fetch(`${API_URL}/disciplinas`),
            fetch(`${API_URL}/aulas`)
        ]);

        state.professores = await resProf.json();
        state.cursos = await resCur.json();
        state.disciplinas = await resDisc.json();
        state.aulas = await resAulas.json();

        atualizarTelas();
    } catch (error) {
        console.error("Erro ao conectar com o servidor. O Flask está rodando?", error);
        alert("Erro ao carregar dados do servidor. O backend em Python está ativo?");
    }
}


// ================= NAVEGAÇÃO =================
// Controla a troca de abas no menu superior
function mostrarSecao(id) {
    // Esconde todas as seções e remove a classe 'active' dos botões
    document.querySelectorAll('.secao').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.navbar button').forEach(btn => btn.classList.remove('active'));
    
    // Mostra a seção desejada e marca o botão como ativo
    document.getElementById(id).classList.remove('hidden');
    const botaoAtivo = document.querySelector(`button[onclick="mostrarSecao('${id}')"]`);
    if (botaoAtivo) botaoAtivo.classList.add('active');
    
    // Salva a aba atual na memória do navegador para não perder ao dar F5
    localStorage.setItem('abaAtiva', id);
    
    atualizarTelas();
}


// ================= CRUDS (SALVAR E EDITAR) =================

// --- SALVAR PROFESSOR ---
document.getElementById('form-professor').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Captura os dias marcados nos checkboxes
    const dias = Array.from(document.querySelectorAll('input[name="dia-prof"]:checked')).map(cb => cb.value);
    
    // Captura as disciplinas que estão no array das Tags
    const disciplinas = [...disciplinasProfSelecionadas]; 
    
    // Validações básicas
    if (dias.length === 0) return alert('Selecione ao menos um dia disponível.');
    if (disciplinas.length === 0) return alert('Selecione ao menos uma disciplina qualificada.');
    
    const dadosProfessor = {
        nome: document.getElementById('prof-nome').value,
        dias: dias,
        disciplinas: disciplinas 
    };

    try {
        if (editandoProfId) {            
            // MODO EDIÇÃO (PUT)
            const response = await fetch(`${API_URL}/professores/${editandoProfId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosProfessor)
            });
            
            if (response.ok) {
                editandoProfId = null;
                document.querySelector('#form-professor button[type="submit"]').innerText = 'Salvar Professor';
                e.target.reset();
                disciplinasProfSelecionadas = []; // Limpa as tags visuais
                renderizarTags();
                await carregarDados(); // Recarrega tudo (pois aulas podem ter sido apagadas)
            }
        } else {
            // MODO CRIAÇÃO (POST)
            const response = await fetch(`${API_URL}/professores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosProfessor)
            });
            if (response.ok) {
                const profSalvo = await response.json();
                state.professores.push(profSalvo); // Adiciona ao estado local
                e.target.reset();
                disciplinasProfSelecionadas = []; // Limpa as tags visuais
                renderizarTags();
                atualizarTelas();
            }
        }
    } catch (error) {
        console.error("Erro ao salvar professor:", error);
    }
});

// --- SALVAR CURSO ---
document.getElementById('form-curso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dadosCurso = { nome: document.getElementById('curso-nome').value };

    try {
        if (editandoCursoId) {
            const response = await fetch(`${API_URL}/cursos/${editandoCursoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCurso)
            });
            
            if (response.ok) {
                editandoCursoId = null;
                document.querySelector('#form-curso button[type="submit"]').innerText = 'Salvar Curso';
                e.target.reset();
                await carregarDados(); 
            }
        } else {
            const response = await fetch(`${API_URL}/cursos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCurso)
            });
            if (response.ok) {
                const cursoSalvo = await response.json();
                state.cursos.push(cursoSalvo);
                e.target.reset();
                atualizarTelas();
            }
        }
    } catch (error) { console.error("Erro ao salvar curso:", error); }
});

// --- SALVAR DISCIPLINA ---
document.getElementById('form-disciplina').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dadosDisciplina = {
        nome: document.getElementById('disc-nome').value,
        cursoId: document.getElementById('disc-curso').value
    };

    try {
        if (editandoDiscId) {
            const response = await fetch(`${API_URL}/disciplinas/${editandoDiscId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosDisciplina)
            });
            
            if (response.ok) {
                editandoDiscId = null;
                document.querySelector('#form-disciplina button[type="submit"]').innerText = 'Salvar Disciplina';
                e.target.reset();
                await carregarDados(); 
            }
        } else {
            const response = await fetch(`${API_URL}/disciplinas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosDisciplina)
            });
            if (response.ok) {
                const discSalva = await response.json();
                state.disciplinas.push(discSalva);
                e.target.reset();
                atualizarTelas();
            }
        }
    } catch (error) { console.error("Erro ao salvar disciplina:", error); }
});

// --- AGENDAR AULA ---
document.getElementById('form-aula').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgErro = document.getElementById('msg-erro');
    
    // Monta o objeto da nova aula capturando todos os 5 campos
    const novaAula = {
        cursoId: document.getElementById('aula-curso').value,
        disciplinaId: document.getElementById('aula-disciplina').value,
        professorId: document.getElementById('aula-professor').value,
        dia: document.getElementById('aula-dia').value,
        periodo: document.getElementById('aula-periodo').value
    };

    // Valida as regras de negócio ANTES de enviar para a API
    const erro = validarRegrasAula(novaAula);
    if (erro) {
        msgErro.innerText = erro; // Mostra a mensagem vermelha
        msgErro.style.display = 'block';
        return;
    }
    msgErro.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/aulas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaAula)
        });
        if (response.ok) {
            const aulaSalva = await response.json();
            state.aulas.push(aulaSalva);
            e.target.reset();
            atualizarTelas();
        }
    } catch (error) { console.error("Erro ao agendar aula:", error); }
});


// ================= REGRAS DE NEGÓCIO OBRIGATÓRIAS =================
function validarRegrasAula(novaAula) {
    const prof = state.professores.find(p => p.id.toString() === novaAula.professorId.toString());
    
    // Regra 1: Disponibilidade (Professor não trabalha neste dia)
    if (!prof.dias.includes(novaAula.dia)) {
        return `O professor ${prof.nome} não está disponível na ${novaAula.dia}.`;
    }

    // Regra 2: Conflito de Professor (Professor não pode estar em duas salas ao mesmo tempo)
    const conflitoProf = state.aulas.find(a => a.professorId.toString() === novaAula.professorId.toString() && a.dia === novaAula.dia);
    if (conflitoProf) {
        return `O professor ${prof.nome} já tem aula agendada neste dia.`;
    }

    // Regra 3: Conflito de Período (A turma não pode ter duas aulas no mesmo dia)
    const conflitoCurso = state.aulas.find(a => 
        a.cursoId.toString() === novaAula.cursoId.toString() && 
        a.dia === novaAula.dia &&
        a.periodo === novaAula.periodo 
    );
    if (conflitoCurso) {
        return `O ${novaAula.periodo} deste curso já possui uma aula agendada para ${novaAula.dia}.`;
    }

    return null; // Se passou por tudo, retorna nulo (sem erros)
}


// ================= DELETAR ITEM GENÉRICO =================
async function deletarItem(tipo, id) {
    if(confirm("Remover este item definitivamente?")) {
        try {
            const response = await fetch(`${API_URL}/${tipo}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                // Atualiza o estado local removendo o item
                state[tipo] = state[tipo].filter(item => item.id.toString() !== id.toString());
                
                // Limpeza visual rápida em cascata no Frontend
                if(tipo === 'cursos') {
                    state.disciplinas = state.disciplinas.filter(d => d.cursoId.toString() !== id.toString());
                    state.aulas = state.aulas.filter(a => a.cursoId.toString() !== id.toString());
                }
                atualizarTelas();
            }
        } catch (error) { console.error(`Erro ao deletar de ${tipo}:`, error); }
    }
}


// ================= SISTEMA DE TAGS (BUSCA DE DISCIPLINAS) =================
const inputBusca = document.getElementById('busca-disciplina');
const listaSugestoes = document.getElementById('sugestoes-disciplinas');
const boxTags = document.getElementById('tags-selecionadas');

// Desenha as tags azuis na tela
function renderizarTags() {
    boxTags.innerHTML = disciplinasProfSelecionadas.map(id => {
        const d = state.disciplinas.find(x => x.id.toString() === id.toString());
        if(!d) return '';
        const c = state.cursos.find(x => x.id.toString() === d.cursoId.toString());
        return `<div class="tag">${d.nome} <small>(${c ? c.nome : ''})</small> <span onclick="removerTag('${d.id}')">&times;</span></div>`;
    }).join('');
}

// Remove uma tag ao clicar no X
window.removerTag = function(id) {
    disciplinasProfSelecionadas = disciplinasProfSelecionadas.filter(x => x !== id.toString());
    renderizarTags();
}

// Adiciona uma disciplina ao array de tags
window.adicionarTag = function(id) {
    if(!disciplinasProfSelecionadas.includes(id.toString())) {
        disciplinasProfSelecionadas.push(id.toString());
        renderizarTags();
    }
    inputBusca.value = ''; // Limpa o input
    listaSugestoes.classList.add('hidden'); // Esconde a lista suspensa
    inputBusca.focus(); // Mantém o cursor na caixa
}

// Filtra as disciplinas enquanto o usuário digita
inputBusca.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    if(termo.length === 0) {
        listaSugestoes.classList.add('hidden');
        return;
    }

    const filtradas = state.disciplinas.filter(d => {
        const jaSelecionada = disciplinasProfSelecionadas.includes(d.id.toString());
        const matchNome = d.nome.toLowerCase().includes(termo);
        return !jaSelecionada && matchNome;
    });

    if(filtradas.length > 0) {
        listaSugestoes.innerHTML = filtradas.map(d => {
            const c = state.cursos.find(x => x.id.toString() === d.cursoId.toString());
            return `<li onclick="adicionarTag('${d.id}')">${d.nome} <small>(${c ? c.nome : ''})</small></li>`;
        }).join('');
    } else {
        listaSugestoes.innerHTML = '<li style="color:#94a3b8; cursor:default;">Nenhuma disciplina encontrada</li>';
    }
    listaSugestoes.classList.remove('hidden');
});

// Esconde a lista de sugestões se o usuário clicar fora dela
document.addEventListener('click', (e) => {
    if(!e.target.closest('.tag-input-container')) {
        listaSugestoes.classList.add('hidden');
    }
});


// ================= RENDERIZAÇÃO E UI =================
function atualizarTelas() {
    // 1. LISTA DE PROFESSORES
    document.getElementById('lista-professores').innerHTML = state.professores.map(p => `
        <li>
            <span><strong>${p.nome}</strong> - Dias: ${p.dias.join(', ')}</span>
            <div>
                <button class="btn-edit" onclick="prepararEdicaoProfessor('${p.id}')">Editar</button>
                <button class="btn-del" onclick="deletarItem('professores', '${p.id}')">Excluir</button>
            </div>
        </li>
    `).join('');

    // 2. LISTA DE CURSOS
    document.getElementById('lista-cursos').innerHTML = state.cursos.map(c => `
        <li>
            <span>${c.nome}</span>
            <div>
                <button class="btn-edit" onclick="prepararEdicaoCurso('${c.id}')">Editar</button>
                <button class="btn-del" onclick="deletarItem('cursos', '${c.id}')">Excluir</button>
            </div>
        </li>
    `).join('');

    // 3. LISTA DE DISCIPLINAS
    document.getElementById('lista-disciplinas').innerHTML = state.disciplinas.map(d => {
        const cursoNome = state.cursos.find(c => c.id.toString() === d.cursoId.toString())?.nome || 'Desconhecido';
        return `
            <li>
                <span><strong>${d.nome}</strong> (${cursoNome})</span>
                <div>
                    <button class="btn-edit" onclick="prepararEdicaoDisciplina('${d.id}')">Editar</button>
                    <button class="btn-del" onclick="deletarItem('disciplinas', '${d.id}')">Excluir</button>
                </div>
            </li>
        `;
    }).join('');

    // 4. ATUALIZAR DROPDOWNS (Mantendo a seleção atual)
    const selectsCursos = ['disc-curso', 'aula-curso', 'filtro-grade-curso'];
    selectsCursos.forEach(id => {
        const select = document.getElementById(id);
        const valorAtual = select.value;
        select.innerHTML = `<option value="">Selecione o Curso...</option>` + 
            state.cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        select.value = valorAtual; 
    });

    // 5. AVISO DE SEM DISCIPLINAS (Se não houver, mostra um aviso em vermelho no cadastro do professor)
    const aviso = document.getElementById('aviso-sem-disciplinas');
    if(aviso) aviso.style.display = state.disciplinas.length === 0 ? 'block' : 'none';

    // 6. LISTA DE AULAS AGENDADAS
    document.getElementById('lista-aulas').innerHTML = state.aulas.map(a => {
        const cNome = state.cursos.find(c => c.id.toString() === a.cursoId.toString())?.nome || 'C. Removido';
        const dNome = state.disciplinas.find(d => d.id.toString() === a.disciplinaId.toString())?.nome || 'D. Removida';
        const pNome = state.professores.find(p => p.id.toString() === a.professorId.toString())?.nome || 'P. Removido';
        return `
            <li>
                <span><strong>${a.dia} (${a.periodo})</strong>: ${dNome} - ${cNome} com ${pNome}</span>
                <button class="btn-del" onclick="deletarItem('aulas', '${a.id}')">Excluir</button>
            </li>
        `;
    }).join('');

    // 7. RENDERIZAR A GRADE VISUAL
    renderizarGrade();
}

// Filtra as disciplinas para mostrar apenas as do curso selecionado (Aba Alocar Aula)
function filtrarDisciplinasAula() {
    const cursoId = document.getElementById('aula-curso').value;
    const selectDisciplina = document.getElementById('aula-disciplina');
    
    // Zera o professor sempre que o curso mudar
    document.getElementById('aula-professor').innerHTML = '<option value="">3. Escolha o Professor</option>';

    const disciplinasFiltradas = state.disciplinas.filter(d => d.cursoId.toString() === cursoId.toString());
    selectDisciplina.innerHTML = `<option value="">Selecione a Disciplina...</option>` + disciplinasFiltradas.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');
}

// Filtra os professores, mostrando apenas os que possuem a disciplina qualificada (Aba Alocar Aula)
window.filtrarProfessoresAula = function() {
    const disciplinaId = document.getElementById('aula-disciplina').value;
    const selectProfessor = document.getElementById('aula-professor');

    if (!disciplinaId) {
        selectProfessor.innerHTML = '<option value="">3. Escolha o Professor</option>';
        return;
    }

    const professoresQualificados = state.professores.filter(p => p.disciplinas.includes(disciplinaId.toString()));
    selectProfessor.innerHTML = `<option value="">3. Escolha o Professor...</option>` + 
        professoresQualificados.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

// Monta a Tabela Visual da Grade por Períodos
function renderizarGrade() {
    const cursoId = document.getElementById('filtro-grade-curso').value;
    const tbody = document.getElementById('grade-aulas');
    
    if (!cursoId) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Selecione um curso para ver a grade.</td></tr>';
        return;
    }

    const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const periodos = ['1º Período', '3º Período', '5º Período', '7º Período', '9º Período'];
    let html = '';
    
    // Cria uma linha (<tr>) para cada período
    periodos.forEach(periodo => {
        html += `<tr>`;
        html += `<td style="vertical-align: middle;"><strong>${periodo}</strong></td>`; // Nome do Período
        
        // Coloca a aula no dia correto da semana
        dias.forEach(dia => {
            const aula = state.aulas.find(a => a.cursoId.toString() === cursoId.toString() && a.dia === dia && a.periodo === periodo);
            if (aula) {
                const dNome = state.disciplinas.find(d => d.id.toString() === aula.disciplinaId.toString())?.nome;
                const pNome = state.professores.find(p => p.id.toString() === aula.professorId.toString())?.nome;
                html += `<td><div class="aula-card"><strong>${dNome}</strong><br><small>${pNome}</small></div></td>`;
            } else {
                html += `<td><div style="color: #94a3b8; font-size: 0.8rem;">Livre</div></td>`;
            }
        });
        
        html += `</tr>`;
    });
    
    tbody.innerHTML = html;
}


// ================= PREPARAÇÃO PARA EDIÇÃO =================

// Preenche o formulário com os dados do professor clicado
window.prepararEdicaoProfessor = function(id) {
    const prof = state.professores.find(p => p.id.toString() === id.toString());
    if (!prof) return;

    editandoProfId = id;
    document.getElementById('prof-nome').value = prof.nome;
    
    // Marca os dias da semana na interface
    document.querySelectorAll('input[name="dia-prof"]').forEach(cb => {
        cb.checked = prof.dias.includes(cb.value);
    });

    // Puxa as disciplinas para a Tag e as desenha
    disciplinasProfSelecionadas = [...prof.disciplinas];
    renderizarTags();

    document.querySelector('#form-professor button[type="submit"]').innerText = 'Atualizar Professor';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Preenche o formulário com os dados da disciplina
window.prepararEdicaoDisciplina = function(id) {
    const disc = state.disciplinas.find(d => d.id.toString() === id.toString());
    if (!disc) return;

    editandoDiscId = id;
    document.getElementById('disc-nome').value = disc.nome;
    document.getElementById('disc-curso').value = disc.cursoId;

    document.querySelector('#form-disciplina button[type="submit"]').innerText = 'Atualizar Disciplina';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Preenche o formulário com os dados do curso
window.prepararEdicaoCurso = function(id) {
    const curso = state.cursos.find(c => c.id.toString() === id.toString());
    if (!curso) return;

    editandoCursoId = id;
    document.getElementById('curso-nome').value = curso.nome;

    document.querySelector('#form-curso button[type="submit"]').innerText = 'Atualizar Curso';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================= INICIALIZAÇÃO DA PÁGINA =================

// Mantém a aba selecionada após atualizar a página
const abaSalva = localStorage.getItem('abaAtiva') || 'sec-professores';
mostrarSecao(abaSalva);

// Busca os dados do banco SQLite pela primeira vez
carregarDados();