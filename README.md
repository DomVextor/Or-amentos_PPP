# Gerador de Orçamentos PPP — Clinimed

Site estático em **HTML, CSS e JavaScript** para preencher e exportar orçamentos de elaboração de PPP (Perfil Profissiográfico Previdenciário), seguindo o modelo Word da Clinimed.

## Funcionalidades

- Campos para CNPJ, razão social, nome e CPF do trabalhador.
- Períodos de trabalho adicionáveis/removíveis, com término em data específica ou **Atualidade**.
- Valor inicial de **R$ 100,00 por período**, editável; cálculo automático de valor total.
- Campos do solicitante, telefone e data de emissão.
- Prévia em formato A4, com cores, logomarca e texto do modelo original.
- Personalização de **todos os textos do documento**: cabeçalho, telefones, e-mail, títulos, descrições, rótulos, cidade e rodapé; também é possível trocar a logomarca e a cor principal.
- Ajuste automático do conteúdo para caber em **uma única página A4**. Se o texto for excessivo, a exportação pede que ele seja encurtado para preservar a leitura.
- Exportação para **Word (.docx) editável** e **PDF (.pdf)**, diretamente no navegador.
- Validação dos campos obrigatórios e da quantidade de dígitos de CPF/CNPJ.

Os dados e textos começam preenchidos com o padrão da Clinimed, mas podem ser alterados em **Personalizar todo o modelo**.

## Como usar

1. Abra o site em um servidor estático (por exemplo, o **GitHub Pages**).
2. Preencha os campos e ajuste a quantidade de períodos.
3. Confira a prévia do orçamento.
4. Clique em **Baixar Word** ou **Baixar PDF**.

Para testar localmente, na pasta do projeto execute:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`. Abrir o HTML via `file://` pode impedir a leitura da logomarca na exportação do Word/PDF, por restrições de segurança do navegador.

## Publicação opcional no GitHub Pages

Em **Settings → Pages**, selecione **Deploy from a branch**, branch `main` e pasta `/ (root)`. Como há um `index.html` na raiz, não é necessária uma etapa de compilação.

## Estrutura

- `index.html` — formulário e prévia A4.
- `styles.css` — interface responsiva e estilos do orçamento.
- `app.js` — formulários, validações, cálculos e exportações.
- `assets/clinimed-logo.jpg` — logomarca extraída do Word original.
- `vendor/` — bibliotecas distribuídas junto com o site; não dependem de CDN.

Bibliotecas: [docx](https://github.com/dolanmiu/docx) 9.6.1 e [pdf-lib](https://github.com/Hopding/pdf-lib) 1.17.1, ambas sob licença MIT (textos em `vendor/`).

## Privacidade e observações

O site não possui backend, login, envio de formulários ou armazenamento local dos dados preenchidos. CPF, CNPJ e informações dos trabalhadores são usados apenas na memória da aba para compor os arquivos baixados.

A checagem de CPF/CNPJ confirma o formato e a quantidade de dígitos, não a situação cadastral dos documentos. Para evitar documentos cortados ou com duas páginas, o gerador limita a compactação e avisa quando o conteúdo precisa ser reduzido.
