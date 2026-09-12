import pytest
import pandas as pd
from routers.leads_import.parsers import detect_csv_delimiter, read_csv_smart


def test_detect_csv_delimiter_all_types():
    """Valida a detecção automática dos diferentes delimitadores: ;, ,, \\t, |."""
    csv_semicolon = b"nome;telefone;email\nAry;11999999999;ary@test.com\nJoao;11888888888;joao@test.com"
    csv_comma = b"name,phone,email\nAry,11999999999,ary@test.com\nJoao,11888888888,joao@test.com"
    csv_tab = b"name\tphone\temail\nAry\t11999999999\tary@test.com\nJoao\t11888888888\tjoao@test.com"
    csv_pipe = b"name|phone|email\nAry|11999999999|ary@test.com\nJoao|11888888888|joao@test.com"

    assert detect_csv_delimiter(csv_semicolon) == ";"
    assert detect_csv_delimiter(csv_comma) == ","
    assert detect_csv_delimiter(csv_tab) == "\t"
    assert detect_csv_delimiter(csv_pipe) == "|"


def test_detect_csv_delimiter_with_semicolon_inside_quoted_comma_file():
    """Valida que um arquivo separado por vírgula com ponto e vírgula dentro de aspas é detectado como vírgula."""
    csv_quoted = (
        b'nome,endereco,telefone\n'
        b'Ary,"Av Paulista, 1000; Apto 50",11999999999\n'
        b'Carlos,"Rua Augusta, 200; Sala 12",11988888888\n'
        b'Beatriz,"Rua Oscar Freire; Loja 3",11977777777\n'
    )
    assert detect_csv_delimiter(csv_quoted) == ","


def test_read_csv_smart_skips_bad_lines_without_crashing():
    """
    Simula exatamente o caso de erro reportado:
    Uma planilha onde uma linha contém ponto e vírgula solto dentro do texto (campos extras).
    O parser deve ignorar a linha defeituosa (on_bad_lines='skip') e retornar as linhas válidas com sucesso.
    """
    content_with_bad_line = (
        b"nome;telefone;cidade\n"
        b"Cliente 1;11900000001;Sao Paulo\n"
        b"Cliente 2;11900000002;Rio de Janeiro\n"
        b"Cliente 3;11900000003;Belo Horizonte\n"
        b"Cliente 4;11900000004;Curitiba\n"
        b"Cliente com Erro;11900000005;Texto com ; ponto e virgula ; solto a mais; Curitiba\n"
        b"Cliente 6;11900000006;Porto Alegre\n"
        b"Cliente 7;11900000007;Salvador\n"
        b"Cliente 8;11900000008;Recife\n"
        b"Cliente 9;11900000009;Fortaleza\n"
        b"Cliente 10;11900000010;Brasilia\n"
    )

    # Não deve lançar ParserError!
    df = read_csv_smart(content_with_bad_line)

    assert isinstance(df, pd.DataFrame)
    assert len(df.columns) == 3
    assert list(df.columns) == ["nome", "telefone", "cidade"]

    # Das 10 linhas, 9 eram válidas e a linha 5 foi ignorada suavemente
    assert len(df) == 9
    assert "Cliente 1" in df["nome"].values
    assert "Cliente 10" in df["nome"].values
    assert "Cliente com Erro" not in df["nome"].values


def test_read_csv_smart_auto_detects_comma_even_when_sep_passed_as_semicolon():
    """
    Mesmo se a chamada especificar sep=';', se o arquivo for na verdade separado por vírgula,
    a função deve fazer fallback e ler com as colunas corretas.
    """
    csv_comma = (
        b"nome,telefone,email\n"
        b"Ary,11999999999,ary@teste.com\n"
        b"Fernanda,21988888888,fernanda@teste.com\n"
    )

    df = read_csv_smart(csv_comma, sep=";")
    assert len(df.columns) == 3
    assert list(df.columns) == ["nome", "telefone", "email"]
    assert len(df) == 2


def test_read_csv_smart_supports_latin1_and_accentuation():
    """Valida leitura de caracteres acentuados típicos do português brasileiro codificados em latin-1."""
    text_latin1 = "nome;endereço;profissão\nJosé da Silva;Praça da Sé, nº 50;Programação\n"
    content_latin1 = text_latin1.encode("latin-1")

    df = read_csv_smart(content_latin1)
    assert len(df) == 1
    assert "nome" in df.columns
    assert "José da Silva" in df["nome"].values[0]


def test_read_csv_smart_single_column_preservation():
    """Valida leitura de arquivo contendo apenas 1 coluna de telefones."""
    csv_single = b"telefone\n11999999999\n11888888888\n11777777777\n"
    df = read_csv_smart(csv_single)

    assert len(df.columns) == 1
    assert len(df) == 3
    assert "11999999999" in df["telefone"].values
