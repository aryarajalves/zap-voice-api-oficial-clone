import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import HistoryItemCard from "./HistoryItemCard";

vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockItem = {
  id: 1,
  status: "processed",
  created_at: new Date().toISOString(),
  event_type: "compra_aprovada",
  payload: { type: "sale", event: "saleUpdated" },
  processed_data: null,
  error_message: null,
};

const defaultProps = {
  item: mockItem,
  selectedHistoryIds: [],
  handleToggleSelect: vi.fn(),
  handleResendWebhook: vi.fn(),
  isResending: false,
  setConfirmDeleteHistory: vi.fn(),
  setEditJsonModal: vi.fn(),
  setMaximizedJson: vi.fn(),
  handleSyncHistory: vi.fn(),
  isSyncing: {},
};

describe("HistoryItemCard - botao Copiar", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    vi.clearAllMocks();
  });

  it("deve renderizar o botao Copiar", () => {
    render(<HistoryItemCard {...defaultProps} />);
    expect(screen.getByText(/^Copiar$/)).toBeTruthy();
  });

  it("deve chamar navigator.clipboard.writeText ao clicar em Copiar", async () => {
    render(<HistoryItemCard {...defaultProps} />);
    fireEvent.click(screen.getByText(/^Copiar$/));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify(mockItem.payload, null, 2)
      );
    });
  });

  it("deve chamar toast.success com JSON copiado! ao clicar em Copiar", async () => {
    const { toast } = await import("react-hot-toast");
    render(<HistoryItemCard {...defaultProps} />);
    fireEvent.click(screen.getByText(/^Copiar$/));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("JSON copiado!");
    });
  });

  it("deve chamar handleToggleSelect ao clicar no checkbox", () => {
    render(<HistoryItemCard {...defaultProps} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(defaultProps.handleToggleSelect).toHaveBeenCalledWith(mockItem.id);
  });

  it("deve mostrar status Processado quando status e processed", () => {
    render(<HistoryItemCard {...defaultProps} />);
    expect(screen.getByText("Processado")).toBeTruthy();
  });

  it("deve chamar setMaximizedJson ao clicar em Maximizar", () => {
    render(<HistoryItemCard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Maximizar/i));
    expect(defaultProps.setMaximizedJson).toHaveBeenCalledWith(mockItem.payload);
  });

  it("deve chamar setEditJsonModal ao clicar em Editar JSON", () => {
    render(<HistoryItemCard {...defaultProps} />);
    fireEvent.click(screen.getByText(/Editar JSON/i));
    expect(defaultProps.setEditJsonModal).toHaveBeenCalledWith({
      isOpen: true,
      data: JSON.stringify(mockItem.payload, null, 2),
      id: mockItem.id,
    });
  });

  it("deve chamar setConfirmDeleteHistory ao clicar no botao excluir", () => {
    render(<HistoryItemCard {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Excluir Registro"));
    expect(defaultProps.setConfirmDeleteHistory).toHaveBeenCalledWith({
      isOpen: true,
      type: "single",
      id: mockItem.id,
    });
  });
});
