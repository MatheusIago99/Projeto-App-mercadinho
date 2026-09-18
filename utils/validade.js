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

// Desloca uma data (string 'YYYY-MM-DD') em N dias (aceita negativo).
// Nao envolve "agora"/"hoje", so aritmetica sobre uma data explicita, por
// isso pode ancorar em UTC sem risco de inconsistencia local/UTC.
function deslocarData(iso, dias) {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

// Diferenca em dias entre duas datas de calendario (string 'YYYY-MM-DD').
// Mesma razao acima: sem "agora" envolvido, seguro ancorar em UTC.
function diferencaDias(inicio, fim) {
  const a = new Date(`${inicio}T00:00:00Z`);
  const b = new Date(`${fim}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
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

module.exports = {
  hojeData,
  estaVencido,
  estaProximoDaValidade,
  formatarDataBR,
  deslocarData,
  diferencaDias,
};
