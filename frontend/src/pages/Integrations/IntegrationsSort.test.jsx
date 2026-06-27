import { describe, it, expect } from "vitest";

// Simula a lógica de ordenação do Integrations.jsx
function sortIntegrations(integrations) {
  return [...integrations].sort((a, b) => {
    const countA = a.history_count || 0;
    const countB = b.history_count || 0;
    return countB - countA;
  });
}

describe("Integrations - Ordenacao decrescente por historico", () => {
  it("deve ordenar primeiro as integracoes com maior contagem de historico", () => {
    const integrationsList = [
      { id: 1, name: "Int A", history_count: 0 },
      { id: 2, name: "Int B", history_count: 14 },
      { id: 3, name: "Int C", history_count: 16 },
      { id: 4, name: "Int D", history_count: 5 },
    ];

    const sorted = sortIntegrations(integrationsList);

    expect(sorted[0].name).toBe("Int C"); // 16
    expect(sorted[1].name).toBe("Int B"); // 14
    expect(sorted[2].name).toBe("Int D"); // 5
    expect(sorted[3].name).toBe("Int A"); // 0
  });

  it("deve lidar com history_count ausente/undefined tratando como 0", () => {
    const integrationsList = [
      { id: 1, name: "Int A", history_count: undefined },
      { id: 2, name: "Int B", history_count: 10 },
      { id: 3, name: "Int C" }, // ausente
    ];

    const sorted = sortIntegrations(integrationsList);

    expect(sorted[0].name).toBe("Int B"); // 10
    expect(sorted[1].history_count || 0).toBe(0);
    expect(sorted[2].history_count || 0).toBe(0);
  });
});
