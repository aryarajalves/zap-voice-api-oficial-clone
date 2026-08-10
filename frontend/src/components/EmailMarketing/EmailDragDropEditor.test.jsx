import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmailDragDropEditor, { parseHtmlToBlocks } from './EmailDragDropEditor';

vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'Cliente Teste' }
  })
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('EmailDragDropEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders editor blocks without crashing', () => {
    render(<EmailDragDropEditor initialHtml="" onChangeHtml={() => {}} />);
    expect(screen.getByText(/Clique para Adicionar Bloco:/i)).toBeInTheDocument();
  });

  it('envia o header X-Client-ID ao realizar upload de imagem', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'http://localhost:5000/static/uploads/test.jpg' })
    });

    const { container } = render(<EmailDragDropEditor initialHtml="" onChangeHtml={() => {}} />);

    const imgBlockBtn = screen.getByRole('button', { name: /Imagem/i });
    fireEvent.click(imgBlockBtn);

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const dummyFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const fetchArgs = global.fetch.mock.calls[0];
    expect(fetchArgs[0]).toContain('/upload');
    expect(fetchArgs[1].headers).toHaveProperty('X-Client-ID', '1');
  });

  it('restaura blocos customizados a partir do initialHtml fornecido ao abrir um template', () => {
    const customHtml = `
      <!DOCTYPE html>
      <html>
        <body style="background-color: #0f172a;">
          <table role="presentation">
            <tr>
              <td style="padding: 24px;">
                <div style="font-size: 18px; color: #ff0000;">Texto Customizado Salvo do Cliente</div>
                <a href="https://meusite.com" style="background-color: #10b981; color: #ffffff;">Comprar Agora</a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    render(<EmailDragDropEditor initialHtml={customHtml} onChangeHtml={() => {}} />);

    expect(screen.getAllByText(/Texto Customizado Salvo do Cliente/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Comprar Agora/i).length).toBeGreaterThan(0);
  });

  it('permite adicionar e configurar espessura, cor e margem do bloco Divisor', () => {
    render(<EmailDragDropEditor initialHtml="" onChangeHtml={() => {}} />);

    const dividerBtn = screen.getByRole('button', { name: /Divisor/i });
    fireEvent.click(dividerBtn);

    expect(screen.getByText(/Espessura da Linha \(Tamanho\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Cor da Linha do Divisor:/i)).toBeInTheDocument();
    expect(screen.getByText(/Espaçamento Vertical \(Margem\):/i)).toBeInTheDocument();
  });

  it('evita ciclo de re-renders (flickering) quando onChangeHtml atualiza prop initialHtml no pai', () => {
    const Wrapper = () => {
      const [html, setHtml] = useState('');
      return <EmailDragDropEditor initialHtml={html} onChangeHtml={setHtml} />;
    };

    render(<Wrapper />);

    // Adiciona uma imagem
    const imgBlockBtn = screen.getByRole('button', { name: /Imagem/i });
    fireEvent.click(imgBlockBtn);

    // Seleciona o bloco adicionado sem causar loop infinito
    expect(screen.getByText(/Configuração do Bloco/i)).toBeInTheDocument();
  });

  it('parseHtmlToBlocks converte HTML com HR em bloco de divisor com estilos', () => {
    const html = `
      <table role="presentation">
        <tr>
          <td style="padding: 20px;">
            <hr style="border: 0; border-top: 4px solid #3b82f6; margin: 30px 0;" />
          </td>
        </tr>
      </table>
    `;

    const res = parseHtmlToBlocks(html);
    expect(res).not.toBeNull();
    expect(res.blocks.length).toBe(1);
    expect(res.blocks[0].type).toBe('divider');
    expect(res.blocks[0].thickness).toBe(4);
    expect(res.blocks[0].color).toBe('#3b82f6');
    expect(res.blocks[0].margin).toBe(30);
  });
});
