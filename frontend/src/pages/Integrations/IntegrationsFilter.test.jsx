import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock simplificado do componente de filtro para validarmos seu comportamento isoladamente
function PlatformFilterDropdown({ integrations, filterPlatform, setFilterPlatform }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");

  const platformsPresent = [...new Set(integrations.map((i) => i.platform).filter(Boolean))].sort();

  const filteredOptions = platformsPresent.filter((p) =>
    p.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div data-testid="dropdown-container">
      <button
        data-testid="dropdown-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchText("");
        }}
      >
        {filterPlatform
          ? `${filterPlatform.charAt(0).toUpperCase() + filterPlatform.slice(1)}`
          : "Todas"}
      </button>

      {isOpen && (
        <div data-testid="dropdown-menu">
          <input
            data-testid="search-input"
            type="text"
            placeholder="Pesquisar plataforma..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <div data-testid="options-list">
            {("todas".includes(searchText.toLowerCase()) || !searchText) && (
              <button
                data-testid="opt-todas"
                onClick={() => {
                  setFilterPlatform("");
                  setIsOpen(false);
                }}
              >
                Todas
              </button>
            )}

            {filteredOptions.map((p) => (
              <button
                key={p}
                data-testid={`opt-${p}`}
                onClick={() => {
                  setFilterPlatform(p);
                  setIsOpen(false);
                }}
              >
                {p}
              </button>
            ))}

            {filteredOptions.length === 0 && searchText && (
              <div data-testid="no-results">Nenhuma plataforma encontrada</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

describe("Integrations - Dropdown Filtro Pesquisavel de Plataforma", () => {
  const mockIntegrations = [
    { id: 1, name: "Int 1", platform: "hotmart" },
    { id: 2, name: "Int 2", platform: "greenn" },
    { id: 3, name: "Int 3", platform: "kiwify" },
  ];

  it("deve iniciar fechado e exibir 'Todas'", () => {
    render(
      <PlatformFilterDropdown
        integrations={mockIntegrations}
        filterPlatform=""
        setFilterPlatform={() => {}}
      />
    );

    expect(screen.getByTestId("dropdown-trigger").textContent).toBe("Todas");
    expect(screen.queryByTestId("dropdown-menu")).toBeNull();
  });

  it("deve abrir o dropdown ao clicar no botao gatilho", () => {
    render(
      <PlatformFilterDropdown
        integrations={mockIntegrations}
        filterPlatform=""
        setFilterPlatform={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("dropdown-trigger"));
    expect(screen.getByTestId("dropdown-menu")).toBeDefined();
    expect(screen.getByTestId("search-input")).toBeDefined();
  });

  it("deve filtrar as opcoes de acordo com o texto digitado", () => {
    render(
      <PlatformFilterDropdown
        integrations={mockIntegrations}
        filterPlatform=""
        setFilterPlatform={() => {}}
      />
    );

    // Abre
    fireEvent.click(screen.getByTestId("dropdown-trigger"));

    // Digita "green"
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "green" } });

    // Deve mostrar "greenn" e ocultar "hotmart" / "kiwify"
    expect(screen.getByTestId("opt-greenn")).toBeDefined();
    expect(screen.queryByTestId("opt-hotmart")).toBeNull();
    expect(screen.queryByTestId("opt-kiwify")).toBeNull();
  });

  it("deve exibir mensagem de feedback quando nenhuma opcao corresponder a busca", () => {
    render(
      <PlatformFilterDropdown
        integrations={mockIntegrations}
        filterPlatform=""
        setFilterPlatform={() => {}}
      />
    );

    // Abre
    fireEvent.click(screen.getByTestId("dropdown-trigger"));

    // Digita algo inexistente
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "invalidplatform" } });

    expect(screen.getByTestId("no-results").textContent).toBe("Nenhuma plataforma encontrada");
    expect(screen.queryByTestId("opt-todas")).toBeNull();
  });

  it("deve chamar setFilterPlatform com a plataforma selecionada e fechar o menu", () => {
    const setFilterMock = vi.fn();
    render(
      <PlatformFilterDropdown
        integrations={mockIntegrations}
        filterPlatform=""
        setFilterPlatform={setFilterMock}
      />
    );

    // Abre
    fireEvent.click(screen.getByTestId("dropdown-trigger"));

    // Clica em "hotmart"
    fireEvent.click(screen.getByTestId("opt-hotmart"));

    expect(setFilterMock).toHaveBeenCalledWith("hotmart");
    expect(screen.queryByTestId("dropdown-menu")).toBeNull();
  });
});
