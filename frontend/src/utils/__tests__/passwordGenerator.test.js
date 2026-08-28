import { describe, it, expect } from 'vitest';
import { generateSecurePassword } from '../passwordGenerator';

describe('passwordGenerator utility', () => {
  it('gera uma senha com tamanho padrão de 16 caracteres dentro do intervalo de 12 a 20', () => {
    const pwd = generateSecurePassword();
    expect(pwd.length).toBe(16);
    expect(pwd.length).toBeGreaterThanOrEqual(12);
    expect(pwd.length).toBeLessThanOrEqual(20);
  });

  it('permite especificar um tamanho personalizado entre 12 e 20 caracteres', () => {
    for (let length = 12; length <= 20; length++) {
      const pwd = generateSecurePassword({ length });
      expect(pwd.length).toBe(length);
    }
  });

  it('restringe comprimentos abaixo de 12 para o mínimo de 12 caracteres', () => {
    const pwd = generateSecurePassword({ length: 8 });
    expect(pwd.length).toBe(12);
  });

  it('restringe comprimentos acima de 20 para o máximo de 20 caracteres', () => {
    const pwd = generateSecurePassword({ length: 30 });
    expect(pwd.length).toBe(20);
  });

  it('garante a presença de letras, números e caracteres especiais em múltiplas gerações', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateSecurePassword();
      const hasLetter = /[A-Za-z]/.test(pwd);
      const hasNumber = /\d/.test(pwd);
      const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

      expect(hasLetter).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSpecial).toBe(true);
      expect(pwd.length).toBeGreaterThanOrEqual(12);
      expect(pwd.length).toBeLessThanOrEqual(20);
    }
  });

  it('gera senhas aleatórias e distintas em chamadas consecutivas', () => {
    const pwd1 = generateSecurePassword();
    const pwd2 = generateSecurePassword();
    expect(pwd1).not.toBe(pwd2);
  });
});
