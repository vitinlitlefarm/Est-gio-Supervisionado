from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Permite que o frontend acesse a API

# Configura o banco de dados SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///horarios.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ================= MODELOS (TABELAS DO BANCO) =================
class Professor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    dias = db.Column(db.String(200), nullable=False)
    disciplinas = db.Column(db.String(500), nullable=False, default="")

    def to_dict(self):
        # Transforma a string salva no banco de volta em lista
        lista_dias = self.dias.split(',') if self.dias else []
        lista_disc = self.disciplinas.split(',') if self.disciplinas else []
        return {"id": self.id, "nome": self.nome, "dias": lista_dias, "disciplinas": lista_disc}

class Curso(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {"id": self.id, "nome": self.nome}

class Disciplina(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cursoId = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {"id": self.id, "nome": self.nome, "cursoId": self.cursoId}

class Aula(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cursoId = db.Column(db.String(50), nullable=False)
    disciplinaId = db.Column(db.String(50), nullable=False)
    professorId = db.Column(db.String(50), nullable=False)
    dia = db.Column(db.String(20), nullable=False)
    periodo = db.Column(db.String(20), nullable=False, default="1º Período")

    def to_dict(self):
        return {
            "id": self.id,
            "cursoId": self.cursoId,
            "disciplinaId": self.disciplinaId,
            "professorId": self.professorId,
            "dia": self.dia,
            "periodo": self.periodo
        }

# Cria o arquivo do banco de dados e as tabelas (se não existirem)
with app.app_context():
    db.create_all()


# ================= ROTAS DA API =================

# --- PROFESSORES ---
@app.route('/api/professores', methods=['GET', 'POST'])
def api_professores():
    if request.method == 'GET':
        return jsonify([p.to_dict() for p in Professor.query.all()])
    
    if request.method == 'POST':
        dados = request.json
        novo = Professor(
            nome=dados['nome'], 
            dias=','.join(dados['dias']),
            disciplinas=','.join(dados.get('disciplinas', []))
        )
        db.session.add(novo)
        db.session.commit()
        return jsonify(novo.to_dict()), 201

@app.route('/api/professores/<int:id>', methods=['PUT', 'DELETE'])
def gerenciar_professor_id(id):
    obj = Professor.query.get(id)
    if not obj:
        return jsonify({"erro": "Não encontrado"}), 404

    if request.method == 'DELETE':
        # OTIMIZAÇÃO: Deleção em lote (Bulk Delete)
        Aula.query.filter_by(professorId=str(id)).delete()
        
        db.session.delete(obj)
        db.session.commit()
        return jsonify({"msg": "Deletado"}), 200

    if request.method == 'PUT':
        dados = request.json
        novos_dias = dados['dias']
        novas_disciplinas = dados.get('disciplinas', [])
        
        obj.nome = dados['nome']
        obj.dias = ','.join(novos_dias)
        obj.disciplinas = ','.join(novas_disciplinas)

        # Remove aulas antigas caso o professor perca um dia ou qualificação
        aulas = Aula.query.filter_by(professorId=str(id)).all()
        for aula in aulas:
            if aula.dia not in novos_dias or str(aula.disciplinaId) not in novas_disciplinas:
                db.session.delete(aula) 

        db.session.commit()
        return jsonify(obj.to_dict()), 200

# --- CURSOS ---
@app.route('/api/cursos', methods=['GET', 'POST'])
def api_cursos():
    if request.method == 'GET':
        return jsonify([c.to_dict() for c in Curso.query.all()])
    
    if request.method == 'POST':
        dados = request.json
        novo = Curso(nome=dados['nome'])
        db.session.add(novo)
        db.session.commit()
        return jsonify(novo.to_dict()), 201

@app.route('/api/cursos/<int:id>', methods=['PUT', 'DELETE'])
def gerenciar_curso_id(id):
    obj = Curso.query.get(id)
    if not obj:
        return jsonify({"erro": "Não encontrado"}), 404

    if request.method == 'DELETE':
        # OTIMIZAÇÃO: Cascata com Deleção em Lote (Apaga tudo do curso de uma vez)
        Disciplina.query.filter_by(cursoId=str(id)).delete()
        Aula.query.filter_by(cursoId=str(id)).delete()
            
        db.session.delete(obj)
        db.session.commit()
        return jsonify({"msg": "Deletado"}), 200

    if request.method == 'PUT':
        dados = request.json
        obj.nome = dados['nome']
        db.session.commit()
        return jsonify(obj.to_dict()), 200

# --- DISCIPLINAS ---
@app.route('/api/disciplinas', methods=['GET', 'POST'])
def api_disciplinas():
    if request.method == 'GET':
        return jsonify([d.to_dict() for d in Disciplina.query.all()])
    
    if request.method == 'POST':
        dados = request.json
        novo = Disciplina(nome=dados['nome'], cursoId=dados['cursoId'])
        db.session.add(novo)
        db.session.commit()
        return jsonify(novo.to_dict()), 201

@app.route('/api/disciplinas/<int:id>', methods=['PUT', 'DELETE'])
def gerenciar_disciplina_id(id):
    obj = Disciplina.query.get(id)
    if not obj:
        return jsonify({"erro": "Não encontrado"}), 404

    if request.method == 'DELETE':
        # OTIMIZAÇÃO: Deleção em lote
        Aula.query.filter_by(disciplinaId=str(id)).delete()
            
        db.session.delete(obj)
        db.session.commit()
        return jsonify({"msg": "Deletado"}), 200

    if request.method == 'PUT':
        dados = request.json
        
        # Se o curso da disciplina foi alterado, remove as aulas antigas dela
        if obj.cursoId != dados['cursoId']:
            Aula.query.filter_by(disciplinaId=str(id)).delete() # OTIMIZADO
                
        obj.nome = dados['nome']
        obj.cursoId = dados['cursoId']

        db.session.commit()
        return jsonify(obj.to_dict()), 200

# --- AULAS ---
@app.route('/api/aulas', methods=['GET', 'POST'])
def api_aulas():
    if request.method == 'GET':
        return jsonify([a.to_dict() for a in Aula.query.all()])
    
    if request.method == 'POST':
        dados = request.json
        novo = Aula(
            cursoId=dados['cursoId'], 
            disciplinaId=dados['disciplinaId'],
            professorId=dados['professorId'],
            dia=dados['dia'],
            periodo=dados['periodo']
        )
        db.session.add(novo)
        db.session.commit()
        return jsonify(novo.to_dict()), 201 

@app.route('/api/aulas/<int:id>', methods=['DELETE'])
def del_aula(id):
    obj = Aula.query.get(id)
    if obj:
        db.session.delete(obj)
        db.session.commit()
        return jsonify({"msg": "Deletado"}), 200
    return jsonify({"erro": "Não encontrado"}), 404

if __name__ == '__main__':
    app.run(debug=True)