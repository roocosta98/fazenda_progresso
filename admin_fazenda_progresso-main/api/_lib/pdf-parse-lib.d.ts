// pdf-parse@1 não publica tipos para o caminho interno da lib (só pro index.js do pacote,
// que tem o bug de "modo debug" descrito em iaImportar.ts). @types/pdf-parse tipa apenas o
// módulo raiz 'pdf-parse' com a mesma assinatura, então reaproveitamos essa assinatura aqui.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse';
  export default pdfParse;
}
