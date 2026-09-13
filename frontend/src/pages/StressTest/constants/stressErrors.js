export const ALL_ERRORS = [
  "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade.",
  "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema.",
  "Erro Meta 131026: Mensagem não entregável",
  "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)",
  "(#131000) Algo deu errado (Erro do Servidor da Meta)",
  "Lista de Exclusão (Bloqueado)"
];

export function loadInitialSelectedErrors() {
  const saved = localStorage.getItem('stress_test_selected_errors');
  if (!saved) return ALL_ERRORS;
  try {
    const parsed = JSON.parse(saved);
    return parsed.map(err => {
      if (err.includes("132015")) return ALL_ERRORS[0];
      if (err.includes("131049")) return ALL_ERRORS[1];
      if (err.includes("131026")) return ALL_ERRORS[2];
      if (err.includes("(#2)") || err.includes("Service temporarily")) return ALL_ERRORS[3];
      if (err.includes("131000") || err.includes("Something went wrong")) return ALL_ERRORS[4];
      return err;
    });
  } catch (e) {
    return ALL_ERRORS;
  }
}
