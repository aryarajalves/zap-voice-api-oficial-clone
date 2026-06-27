import { describe, it, expect } from "vitest";

// Simula a lógica de filtragem do Integrations.jsx
function applyFilters(integrations, filterPlatform, filterHasTriggers, filterHasHistory) {
  let filtered = filterPlatform
    ? integrations.filter((i) => i.platform === filterPlatform)
    : integrations;

  if (filterHasTriggers) {
    filtered = filtered.filter((i) => (i.mappings || []).length > 0);
  }

  if (filterHasHistory) {
    filtered = filtered.filter((i) => (i.history_count || 0) > 0);
  }

  return filtered;
}

describe("Integrations - Filtros Extra (Gatilhos e Historico)", () => {
  const mockIntegrations = [
    { id: 1, name: "Int A", platform: "hotmart", mappings: [{}], history_count: 5 },
    { id: 2, name: "Int B", platform: "greenn", mappings: [], history_count: 14 },
    { id: 3, name: "Int C", platform: "kiwify", mappings: [{}, {}], history_count: 0 },
    { id: 4, name: "Int D", platform: "hotmart", mappings: [], history_count: 0 },
  ];

  it("deve retornar todos se os filtros estiverem inativos", () => {
    const res = applyFilters(mockIntegrations, "", false, false);
    expect(res.length).toBe(4);
  });

  it("deve filtrar apenas quem tem gatilhos configurados", () => {
    const res = applyFilters(mockIntegrations, "", true, false);
    expect(res.length).toBe(2);
    expect(res.map((r) => r.name)).toContain("Int A");
    expect(res.map((r) => r.name)).toContain("Int C");
  });

  it("deve filtrar apenas quem tem historico maior que zero", () => {
    const res = applyFilters(mockIntegrations, "", false, true);
    expect(res.length).toBe(2);
    expect(res.map((r) => r.name)).toContain("Int A");
    expect(res.map((r) => r.name)).toContain("Int B");
  });

  it("deve combinar filtros de gatilho, historico e plataforma", () => {
    // Apenas hotmart com gatilhos e historico > 0
    const res = applyFilters(mockIntegrations, "hotmart", true, true);
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("Int A");
  });
});
