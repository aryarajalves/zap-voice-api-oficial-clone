import pytest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ['DATABASE_URL'] = 'sqlite://'

from services.chat_label_service import filter_conversations_by_labels, normalize_label_filter_list

class DummyConvo:
    def __init__(self, id, labels):
        self.id = id
        self.labels = labels

def test_normalize_label_filter_list():
    assert normalize_label_filter_list(None) == []
    assert normalize_label_filter_list('') == []
    assert normalize_label_filter_list('VIP, Aluno, Teste ') == ['vip', 'aluno', 'teste']
    assert normalize_label_filter_list(['VIP', 'aluno, teste']) == ['vip', 'aluno', 'teste']

def test_filter_has_or():
    c1 = DummyConvo(1, ['vip', 'lead'])
    c2 = DummyConvo(2, ['aluno'])
    c3 = DummyConvo(3, ['cliente'])
    convos = [c1, c2, c3]

    res = filter_conversations_by_labels(convos, labels=['vip', 'aluno'], label_mode='has', label_op='or')
    assert [c.id for c in res] == [1, 2]

def test_filter_has_and():
    c1 = DummyConvo(1, ['vip', 'aluno'])
    c2 = DummyConvo(2, ['vip'])
    c3 = DummyConvo(3, ['aluno'])
    convos = [c1, c2, c3]

    res = filter_conversations_by_labels(convos, labels=['vip', 'aluno'], label_mode='has', label_op='and')
    assert [c.id for c in res] == [1]

def test_filter_has_not_or():
    # Não possui NENHUMA das etiquetas (se tiver qualquer uma, é excluída)
    c1 = DummyConvo(1, ['bloquear', 'lead'])
    c2 = DummyConvo(2, ['spam'])
    c3 = DummyConvo(3, ['vip'])
    convos = [c1, c2, c3]

    res = filter_conversations_by_labels(convos, labels=['bloquear', 'spam'], label_mode='has_not', label_op='or')
    assert [c.id for c in res] == [3]

def test_filter_has_not_and():
    # Não possui TODAS as etiquetas juntas (só exclui se tiver ambas juntas)
    c1 = DummyConvo(1, ['bloquear', 'spam'])
    c2 = DummyConvo(2, ['bloquear'])
    c3 = DummyConvo(3, ['lead'])
    convos = [c1, c2, c3]

    res = filter_conversations_by_labels(convos, labels=['bloquear', 'spam'], label_mode='has_not', label_op='and')
    assert [c.id for c in res] == [2, 3]

def test_filter_legacy_single_label():
    c1 = DummyConvo(1, ['vip'])
    c2 = DummyConvo(2, ['lead'])
    convos = [c1, c2]

    res = filter_conversations_by_labels(convos, label='vip')
    assert [c.id for c in res] == [1]

def test_filter_empty_leaves_all():
    c1 = DummyConvo(1, ['vip'])
    c2 = DummyConvo(2, ['lead'])
    convos = [c1, c2]

    res = filter_conversations_by_labels(convos, labels=[])
    assert [c.id for c in res] == [1, 2]

def test_filter_mixed_individual_labels_and():
    # Quer conversas que POSSUEM 'aryaraj' E NÃO POSSUEM 'alunos_astrowake'
    c1 = DummyConvo(1, ['aryaraj'])                         # tem aryaraj, não tem alunos_astrowake -> DEVE PASSAR
    c2 = DummyConvo(2, ['aryaraj', 'alunos_astrowake'])     # tem aryaraj MAS tem alunos_astrowake -> NÃO DEVE PASSAR
    c3 = DummyConvo(3, ['outra_tag'])                       # não tem aryaraj -> NÃO DEVE PASSAR
    convos = [c1, c2, c3]

    res = filter_conversations_by_labels(
        convos,
        include_labels=['aryaraj'],
        exclude_labels=['alunos_astrowake'],
        label_op='and'
    )
    assert [c.id for c in res] == [1]

def test_filter_mixed_individual_labels_or():
    # Quer conversas que POSSUEM 'aryaraj' OU NÃO POSSUEM 'alunos_astrowake'
    c1 = DummyConvo(1, ['aryaraj', 'alunos_astrowake'])     # tem aryaraj -> PASSA (mesmo tendo alunos_astrowake)
    c2 = DummyConvo(2, ['outra_tag'])                       # não tem alunos_astrowake -> PASSA
    c3 = DummyConvo(3, ['alunos_astrowake'])                # não tem aryaraj E tem alunos_astrowake -> NÃO PASSA
    convos = [c1, c2, c3]

    res = filter_conversations_by_labels(
        convos,
        include_labels=['aryaraj'],
        exclude_labels=['alunos_astrowake'],
        label_op='or'
    )
    assert [c.id for c in res] == [1, 2]

