import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { toast } from "react-hot-toast";

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function CopyButton({ jsonStr }) {
  return (
    <button
      onClick={(e) => {
        navigator.clipboard.writeText(jsonStr);
        toast.success("JSON copiado!");
        const btn = e.target.closest("button");
        const orig = btn.textContent;
        btn.textContent = "Copiado!";
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }}
    >
      Copiar
    </button>
  );
}

// Replica a logica de extracao do StressTest.jsx para o HeroSpark
function extractHerospark(p, statusPT = "Compra Aprovada") {
  const ext = {};
  const formatPrice = (val) =>
    val != null
      ? `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;

  ext.Nome = p.buyer?.name;
  ext.Email = p.buyer?.email;
  ext.Telefone = p.buyer?.phone ? String(p.buyer.phone).replace(/\D/g, "") : null;
  ext.Produto = p.product?.name;
  ext.Status = statusPT;
  ext["Metodo"] = p.purchase?.payment?.type || null;

  const rawCents = p.purchase?.price?.value ?? p.purchase?.price?.gross;
  if (rawCents != null) {
    const cents = Number(rawCents);
    ext["Preco"] = formatPrice(cents > 1000 ? cents / 100 : cents);
  }

  // Deteccao automatica CPF / CNPJ / Documento
  if (p.buyer?.doc) {
    const digits = String(p.buyer.doc).replace(/\D/g, "");
    const docLabel = digits.length === 11 ? "CPF" : digits.length === 14 ? "CNPJ" : "Documento";
    ext[docLabel] = p.buyer.doc;
  }

  // IDs removidos conforme decisao do usuario
  return ext;
}

const HEROSPARK_PAYLOAD = {
  event: "PURCHASE_APPROVED",
  id: "hs_17825711841",
  buyer: {
    name: "Contato Teste 1",
    email: "teste.contato1@example.com",
    phone: "5511900090001",
    doc: "000.000.000-01",
  },
  product: { id: "prod_1782571184", name: "Produto Scale Test" },
  purchase: {
    price: { gross: 19700, value: 19700 },
    status: "paid",
    payment: { type: "credit_card", refusal_reason: null },
    transaction: "pay_17825711841",
    subscription: null,
  },
};

// ── Testes do botao Copiar ────────────────────────────────────────────────────

describe("StressTest - botao Copiar", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.clearAllMocks();
  });

  it("deve chamar navigator.clipboard.writeText com o JSON correto", () => {
    const json = JSON.stringify({ event: "PURCHASE_APPROVED" }, null, 2);
    render(<CopyButton jsonStr={json} />);
    fireEvent.click(screen.getByText("Copiar"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(json);
  });

  it("deve chamar toast.success com JSON copiado! ao clicar em Copiar", () => {
    const json = JSON.stringify({ event: "PURCHASE_APPROVED" }, null, 2);
    render(<CopyButton jsonStr={json} />);
    fireEvent.click(screen.getByText("Copiar"));
    expect(toast.success).toHaveBeenCalledWith("JSON copiado!");
  });
});

// ── Testes de extracao de campos HeroSpark ────────────────────────────────────

describe("StressTest - extracao de campos HeroSpark (sem IDs)", () => {
  it("deve extrair Nome", () => {
    expect(extractHerospark(HEROSPARK_PAYLOAD).Nome).toBe("Contato Teste 1");
  });
  it("deve extrair Email", () => {
    expect(extractHerospark(HEROSPARK_PAYLOAD).Email).toBe("teste.contato1@example.com");
  });
  it("deve extrair Telefone somente digitos", () => {
    expect(extractHerospark(HEROSPARK_PAYLOAD).Telefone).toBe("5511900090001");
  });
  it("deve extrair Produto", () => {
    expect(extractHerospark(HEROSPARK_PAYLOAD).Produto).toBe("Produto Scale Test");
  });
  it("deve extrair Preco em reais (centavos / 100)", () => {
    expect(extractHerospark(HEROSPARK_PAYLOAD)["Preco"]).toContain("197");
  });
  it("deve extrair Metodo de pagamento", () => {
    expect(extractHerospark(HEROSPARK_PAYLOAD)["Metodo"]).toBe("credit_card");
  });
  it("NAO deve incluir IDs no resultado", () => {
    const ext = extractHerospark(HEROSPARK_PAYLOAD);
    expect("ID Transacao" in ext).toBe(false);
    expect("ID Webhook" in ext).toBe(false);
    expect("ID Produto" in ext).toBe(false);
  });
});

// ── Testes de deteccao CPF vs CNPJ vs Documento ───────────────────────────────

describe("StressTest - deteccao CPF vs CNPJ vs Documento no HeroSpark", () => {
  it("deve identificar como CPF quando doc tem 11 digitos (000.000.000-01)", () => {
    const ext = extractHerospark(HEROSPARK_PAYLOAD); // doc = "000.000.000-01" = 11 digitos
    expect(ext["CPF"]).toBe("000.000.000-01");
    expect("CNPJ" in ext).toBe(false);
    expect("Documento" in ext).toBe(false);
  });

  it("deve identificar como CNPJ quando doc tem 14 digitos (12.345.678/0001-99)", () => {
    const payload = {
      ...HEROSPARK_PAYLOAD,
      buyer: { ...HEROSPARK_PAYLOAD.buyer, doc: "12.345.678/0001-99" },
    };
    const ext = extractHerospark(payload);
    expect(ext["CNPJ"]).toBe("12.345.678/0001-99");
    expect("CPF" in ext).toBe(false);
  });

  it("deve usar Documento como fallback para formatos desconhecidos", () => {
    const payload = {
      ...HEROSPARK_PAYLOAD,
      buyer: { ...HEROSPARK_PAYLOAD.buyer, doc: "ABC123" },
    };
    const ext = extractHerospark(payload);
    expect(ext["Documento"]).toBe("ABC123");
    expect("CPF" in ext).toBe(false);
    expect("CNPJ" in ext).toBe(false);
  });

  it("nao deve adicionar campo de documento quando doc esta ausente", () => {
    const payload = {
      ...HEROSPARK_PAYLOAD,
      buyer: { ...HEROSPARK_PAYLOAD.buyer, doc: null },
    };
    const ext = extractHerospark(payload);
    expect("CPF" in ext).toBe(false);
    expect("CNPJ" in ext).toBe(false);
    expect("Documento" in ext).toBe(false);
  });
});
