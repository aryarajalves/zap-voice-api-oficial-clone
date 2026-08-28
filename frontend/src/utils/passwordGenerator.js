/**
 * Gera uma senha aleatória e segura.
 * Requisitos:
 * - Tamanho entre 12 e 20 caracteres (padrão: 16 caracteres ou especificado).
 * - Pelo menos 1 letra maiúscula e 1 minúscula (ou pelo menos 1 letra).
 * - Pelo menos 1 número.
 * - Pelo menos 1 caractere especial.
 *
 * @param {Object} options
 * @param {number} [options.length=16] - Comprimento da senha (mínimo 12, máximo 20).
 * @returns {string} Senha segura gerada.
 */
export function generateSecurePassword(options = {}) {
  const minLength = 12;
  const maxLength = 20;

  let length = options.length;
  if (typeof length !== 'number' || isNaN(length)) {
    // Se não especificado, usa 16 como tamanho padrão seguro (entre 12 e 20)
    length = 16;
  } else {
    length = Math.max(minLength, Math.min(maxLength, Math.floor(length)));
  }

  // Conjuntos completos para geração
  const allLowercase = 'abcdefghijklmnopqrstuvwxyz';
  const allUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const allNumbers = '0123456789';
  const allSpecials = '!@#$%&*()_+-=[]{}|;:,.<>?';

  // Função para obter índice seguro
  const getRandomIndex = (max) => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  const getRandomChar = (charset) => charset[getRandomIndex(charset.length)];

  // Garante ao menos 1 de cada categoria obrigatória
  const passwordChars = [
    getRandomChar(allLowercase),
    getRandomChar(allUppercase),
    getRandomChar(allNumbers),
    getRandomChar(allSpecials),
  ];

  // Pool combinado com todos os caracteres permitidos
  const combinedPool = allLowercase + allUppercase + allNumbers + allSpecials;

  // Preenche o restante até atingir o comprimento desejado
  while (passwordChars.length < length) {
    passwordChars.push(getRandomChar(combinedPool));
  }

  // Embaralha usando o algoritmo Fisher-Yates com random seguro
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  const generatedPassword = passwordChars.join('');

  // Validação estrita dos requisitos
  const hasMinLength = generatedPassword.length >= 12 && generatedPassword.length <= 20;
  const hasLetter = /[A-Za-z]/.test(generatedPassword);
  const hasNumber = /\d/.test(generatedPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(generatedPassword);

  if (!hasMinLength || !hasLetter || !hasNumber || !hasSpecial) {
    // Fallback defensivo recursivo caso ocorra alguma inconsistência
    return generateSecurePassword({ length });
  }

  return generatedPassword;
}
