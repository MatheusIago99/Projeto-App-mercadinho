// Interpretacao unica de validade usada por todo o backend (alertas, vendas):
// comparacao por DATA DE CALENDARIO (ano/mes/dia), nunca por hora/minuto/
// segundo, e sem forcar UTC (evita toISOString() para "hoje").
//
// Regra: validade < hoje => vencido. validade === hoje => NAO vencido.

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function hojeData() {
  return formatarDataISO(new Date());
}

function somarDias(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return formatarDataISO(data);
}

function estaVencido(validade) {
  if (!validade) return false;
  return validade.slice(0, 10) < hojeData();
}

function estaProximoDaValidade(validade, dias) {
  if (!validade) return false;
  const v = validade.slice(0, 10);
  return v >= hojeData() && v <= somarDias(dias);
}

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

module.exports = { hojeData, estaVencido, estaProximoDaValidade, formatarDataBR };
