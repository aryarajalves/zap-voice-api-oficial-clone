import pytest
from services.webhooks_utils import parse_webhook_payload
from services.utils.webhook_platform_parsers.yayforms import parse_yayforms


YAYFORMS_SAMPLE_PAYLOAD = {
  "response": {
    "id": "6abd541728d3d9e964806412",
    "formId": "6a93b311e15b56ba18088b62",
    "userId": "6a8ca1ad8c3f06b5ab0bd103",
    "answers": {
      "6a93b94179f658102e0b14b3": {
        "content": "jordão rodrigues",
        "answerId": "6abd5596908eb3a6b2ee6be3",
        "fieldTitle": "Qual é o seu nome completo? *",
        "fieldDescription": ""
      },
      "6a93b94279f658102e0b14b5": {
        "content": "+5548988668693",
        "answerId": "6abd559c908eb3a6b2ee6c01",
        "fieldTitle": "Qual é o seu WhatsApp? *",
        "fieldDescription": "Inclua DDD + código do país, se necessário."
      },
      "6a93b94279f658102e0b14b7": {
        "content": "jordsacademy@gmail.com",
        "answerId": "6abd55a0908eb3a6b2ee6c15",
        "fieldTitle": "Qual é o seu e-mail? *",
        "fieldDescription": ""
      },
      "6a93b94279f658102e0b14b9": {
        "content": "Florianópolis",
        "answerId": "6abd5be4908eb3a6b2ee7f88",
        "fieldTitle": "Onde você mora atualmente? *",
        "fieldDescription": "Cidade • Estado/Província • País"
      },
      "6a93b94679f658102e0b14bb": {
        "content": "Quero ativar um fogo interno maior ",
        "answerId": "6abd5be9908eb3a6b2ee7f9a",
        "fieldTitle": "O que está acontecendo na sua vida hoje que fez o Coração Cigano chegar até você? *",
        "fieldDescription": "Não precisa contar nada que não queira."
      },
      "6a93b94679f658102e0b14bd": {
        "content": [
          "Corpo e presença"
        ],
        "answerId": "6abd5bf5908eb3a6b2ee7fd3",
        "fieldTitle": "Qual área da sua vida mais pede transformação neste momento? *",
        "fieldDescription": "Pode selecionar mais de uma opção."
      },
      "6a93b94779f658102e0b14bf": {
        "content": "Teria mais empolgação para fazer coisas",
        "answerId": "6abd5c00908eb3a6b2ee800e",
        "fieldTitle": "Se você pudesse sair desses três dias com uma mudança concreta na sua vida, qual seria? *",
        "fieldDescription": "Queremos entender o que você gostaria de levar dessa experiência."
      },
      "6a93b94b79f658102e0b14c1": {
        "content": None,
        "answerId": "6abd5c10908eb3a6b2ee805e",
        "fieldTitle": "Durante o Coração Cigano poderão existir práticas tradicionais e experiências de diferentes naturezas. Nenhuma prática é obrigatória.",
        "fieldDescription": ""
      },
      "6a93b94c79f658102e0b14c3": {
        "content": [
          "Sim, tenho experiência recorrente."
        ],
        "answerId": "6abd5c1d908eb3a6b2ee8097",
        "fieldTitle": "Você já teve alguma experiência com medicinas tradicionais da floresta? *",
        "fieldDescription": "Selecione apenas uma opção."
      },
      "6a93b94c79f658102e0b14c5": {
        "content": [
          "Tenho interesse, caso faça sentido para mim durante a experiência."
        ],
        "answerId": "6abd5c25908eb3a6b2ee80c0",
        "fieldTitle": "E hoje, como você se sente em relação à possibilidade de consagrar durante uma experiência como o Coração Cigano? *",
        "fieldDescription": ""
      },
      "6a93b94c79f658102e0b14c7": {
        "content": "Não",
        "answerId": "6abd5c2d908eb3a6b2ee80e0",
        "fieldTitle": "Caso já tenha participado de alguma experiência anterior e tenha vivido alguma reação física ou psicológica importante, conte brevemente.",
        "fieldDescription": "Se nunca aconteceu ou se você nunca participou, pode responder apenas “Não”."
      },
      "6a93b94e79f658102e0b14c9": {
        "content": [
          "Yes"
        ],
        "answerId": "6abd5c37908eb3a6b2ee8106",
        "fieldTitle": "Você possui disponibilidade para permanecer integralmente no retiro em São Paulo nos dias 31 de outubro, 1 e 2 de novembro de 2026? *",
        "fieldDescription": ""
      },
      "6a93b95079f658102e0b14cd": {
        "content": None,
        "answerId": "6abd541a908eb3a6b2ee67f6",
        "fieldTitle": "RETIRO CORAÇÃO CIGANO 2026",
        "fieldDescription": "<p style=\"text-align: center;\">31 de outubro • 1 e 2 de novembro | São Paulo, Brasil </p>"
      },
      "6a95b39bd3662764440f9f12": {
        "content": None,
        "answerId": "6abd5c3b908eb3a6b2ee810f",
        "fieldTitle": "INVESTIMENTO E MOMENTO DE DECISÃO",
        "fieldDescription": "<p>O Coração Cigano é uma imersão presencial com poucas vagas, oferecendo hospedagem e alimentação.</p>"
      },
      "6a95b3a6f0713e728507520a": {
        "content": [
          "R$ 5.000 a R$ 7.000"
        ],
        "answerId": "6abd5c3e908eb3a6b2ee8117",
        "fieldTitle": "Qual faixa representa melhor o investimento que você está preparado(a) para realizar atualmente?",
        "fieldDescription": None
      },
      "6a95b3b3f0713e728507520c": {
        "content": [
          "Sim, estou pronto(a) para avançar."
        ],
        "answerId": "6abd5c42908eb3a6b2ee8123",
        "fieldTitle": "Qual opção melhor representa seu momento para avançar?",
        "fieldDescription": None
      },
      "6a95b3c051cfdd66b4027ab8": {
        "content": None,
        "answerId": "6abd5c4a908eb3a6b2ee8138",
        "fieldTitle": "SAÚDE E SEGURANÇA",
        "fieldDescription": "<p>Sua saúde e segurança são nossa prioridade.</p>"
      },
      "6a95b40851cfdd66b4027ac0": {
        "content": "Não etou tendo acompanhamento",
        "answerId": "6abd5c4c908eb3a6b2ee813e",
        "fieldTitle": "Conte brevemente qual é o diagnóstico, seu histórico e se existe acompanhamento profissional atualmente. *",
        "fieldDescription": None
      },
      "6a95b40e353a09f80c0eeed2": {
        "content": [
          "No"
        ],
        "answerId": "6abd5c79908eb3a6b2ee81d3",
        "fieldTitle": "Existe alguma outra informação sobre sua saúde física ou mental que nossa equipe precisa conhecer para avaliar sua participação com segurança? *",
        "fieldDescription": None
      },
      "6a95b410f0713e7285075210": {
        "content": "...",
        "answerId": "6abd5c80908eb3a6b2ee81ee",
        "fieldTitle": "Descreva brevemente. *",
        "fieldDescription": None
      },
      "6a95b4c0c74c9385b3007180": {
        "content": [
          "Yes"
        ],
        "answerId": "6abd5c8b908eb3a6b2ee821d",
        "fieldTitle": "Você leu e confirma a declaração abaixo? *",
        "fieldDescription": "<p>Sim, li e estou de acordo.</p>"
      }
    },
    "browser": "Chrome",
    "tracking": [],
    "createdAt": "2026-09-30T18:25:27.139000Z",
    "ipAddress": "2804:14d:bac3:892a:e5d3:e8c9:3036:38d8",
    "startedAt": "2026-09-30T18:31:56.963000Z",
    "updatedAt": "2026-09-30T19:01:41.667000Z",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "variables": {
      "score": 0
    },
    "deviceType": "desktop",
    "geolocation": {
      "city": "Florianópolis",
      "state": "Santa Catarina",
      "region": "SC",
      "zipcode": "88000",
      "currency": "BRL",
      "latitude": -27.6168,
      "timezone": "America/Sao_Paulo",
      "continent": "South America",
      "longitude": -48.4997,
      "country_code": "BR",
      "country_name": "Brazil",
      "country_code2": "BR"
    },
    "submittedAt": "2026-09-30T19:01:41.250000Z",
    "operatingSystem": "Windows"
  }
}


def test_parse_yayforms_exact_user_payload():
    """Valida a extração completa do payload oficial da YayForms enviado pelo usuário."""
    result = parse_webhook_payload("yayforms", YAYFORMS_SAMPLE_PAYLOAD)

    # 1. Plataforma e Status
    assert result["platform"] == "yayforms"
    assert result["event_type"] == "formulario"
    assert result["raw_status"] == "Formulário"

    # 2. Dados fundamentais do Lead
    assert result["name"] == "jordão rodrigues"
    assert result["first_name"] == "jordão"
    assert result["email"] == "jordsacademy@gmail.com"
    assert result["phone"] == "5548988668693"
    assert result["country"] == "BR"

    # 3. Produto identificado pelo cabeçalho
    assert result["product_name"] == "RETIRO CORAÇÃO CIGANO 2026"

    # 4. Localização
    assert result["cidade"] == "Florianópolis"
    assert result["estado"] == "Santa Catarina"

    # 5. Variáveis dinâmicas das respostas
    variables = result["variables"]
    assert variables["form_id"] == "6a93b311e15b56ba18088b62"
    assert variables["response_id"] == "6abd541728d3d9e964806412"
    assert variables["investimento"] == "R$ 5.000 a R$ 7.000"
    assert variables["faixa_investimento"] == "R$ 5.000 a R$ 7.000"
    assert variables["area_transformacao"] == "Corpo e presença"
    assert variables["experiencia_medicinas"] == "Sim, tenho experiência recorrente."
    assert variables["cidade"] == "Florianópolis"

    # 6. Slugs automáticas das perguntas
    assert "qual_area_da_sua_vida_mais_pede_transformacao_neste_momento" in variables
    assert variables["qual_area_da_sua_vida_mais_pede_transformacao_neste_momento"] == "Corpo e presença"


def test_parse_yayforms_explicit_title_and_flat_payload():
    """Valida YayForms com payload já desempacotado e formTitle na raiz."""
    flat_payload = {
        "id": "resp_999",
        "formId": "form_123",
        "formTitle": "Aplicação Mentoria High Ticket",
        "submittedAt": "2026-09-30T20:00:00.000Z",
        "answers": {
            "q1": {
                "fieldTitle": "Nome completo",
                "content": "Maria Santos da Silva"
            },
            "q2": {
                "fieldTitle": "WhatsApp",
                "content": "(11) 98765-4321"
            },
            "q3": {
                "fieldTitle": "Email",
                "content": "MARIA.SANTOS@GMAIL.COM"
            }
        }
    }

    result = parse_webhook_payload("YayForms", flat_payload)

    assert result["platform"] == "yayforms"
    assert result["event_type"] == "formulario"
    assert result["raw_status"] == "Formulário"
    assert result["name"] == "Maria Santos da Silva"
    assert result["first_name"] == "Maria"
    assert result["email"] == "maria.santos@gmail.com"
    assert result["phone"] == "5511987654321"
    assert result["product_name"] == "Aplicação Mentoria High Ticket"
    assert result["variables"]["form_id"] == "form_123"
    assert result["variables"]["response_id"] == "resp_999"


def test_parse_yayforms_fallback_product_name():
    """Valida fallback de nome de produto quando não há título específico."""
    minimal_payload = {
        "response": {
            "id": "resp_abc",
            "formId": "form_xyz",
            "answers": {
                "q1": {
                    "fieldTitle": "Seu Nome",
                    "content": "Carlos Eduardo"
                },
                "q2": {
                    "fieldTitle": "Seu WhatsApp",
                    "content": "+55 21 99999-8888"
                }
            }
        }
    }

    result = parse_webhook_payload("yayforms", minimal_payload)

    assert result["platform"] == "yayforms"
    assert result["event_type"] == "formulario"
    assert result["product_name"] == "YayForms - form_xyz"
    assert result["name"] == "Carlos Eduardo"
    assert result["phone"] == "5521999998888"
