"use strict";

// O aplicativo não envia dados a servidores e não armazena CPFs ou CNPJs.
const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fields = {
  cnpj: $("#company-cnpj"),
  company: $("#company-name"),
  worker: $("#worker-name"),
  cpf: $("#worker-cpf"),
  requester: $("#requester-name"),
  phone: $("#requester-phone"),
  date: $("#issue-date"),
  unitPrice: $("#unit-price")
};

let periodSequence = 1;
let periods = [{ id: periodSequence, start: "", end: "", current: true }];
const logoPath = new URL("./assets/clinimed-logo.jpg", document.baseURI).href;
const serviceDescription =
  "Documento com histórico laboral do trabalhador que presta serviço a uma determinada empresa, " +
  "contendo informações administrativas, descrição das atividades, exposição a agentes nocivos à saúde, " +
  "resultados de exames médicos, registros de CAT e demais dados necessários para composição do " +
  "Perfil Profissiográfico Previdenciário.";

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type).value;
  return value("year") + "-" + value("month") + "-" + value("day");
}

function dateBR(value) {
  if (!value) return "—";
  const parts = value.split("-");
  return parts.length === 3 ? parts[2] + " / " + parts[1] + " / " + parts[0] : "—";
}

function parseMoney(value) {
  let string = String(value || "").replace(/R\$|\s/g, "");
  if (string.includes(",")) string = string.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(string)) string = string.replace(/\./g, "");
  const number = Number(string);
  return string !== "" && Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : NaN;
}

function digits(value) { return String(value || "").replace(/\D/g, ""); }
function maskCNPJ(value) {
  const n = digits(value).slice(0, 14);
  return n.replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function maskCPF(value) {
  const n = digits(value).slice(0, 11);
  return n.replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
function maskPhone(value) {
  const n = digits(value).slice(0, 11);
  if (n.length <= 2) return n ? "(" + n : "";
  const area = "(" + n.slice(0, 2) + ") ";
  if (n.length <= 6) return area + n.slice(2);
  const split = n.length === 11 ? 7 : 6;
  return area + n.slice(2, split) + "-" + n.slice(split);
}

function setStatus(message, type = "") {
  const element = $("#status");
  element.textContent = message;
  element.className = type ? "is-" + type : "";
}

function currentData() {
  return {
    cnpj: fields.cnpj.value.trim(),
    company: fields.company.value.trim(),
    worker: fields.worker.value.trim(),
    cpf: fields.cpf.value.trim(),
    requester: fields.requester.value.trim(),
    phone: fields.phone.value.trim(),
    date: fields.date.value,
    unitPrice: parseMoney(fields.unitPrice.value),
    periods: periods.map((period) => ({ ...period }))
  };
}

function setText(selector, value) {
  $(selector).textContent = value || "—";
}

function updatePreview() {
  const data = currentData();
  const validPrice = Number.isFinite(data.unitPrice) ? data.unitPrice : 0;
  const quantity = data.periods.length;
  const total = validPrice * quantity;
  setText("#view-cnpj", data.cnpj);
  setText("#view-company", data.company);
  setText("#view-worker", data.worker);
  setText("#view-cpf", data.cpf);
  setText("#view-requester", data.requester);
  setText("#view-phone", data.phone);
  setText("#view-date", "Votuporanga, " + dateBR(data.date) + ".");
  setText("#view-total", money.format(total));
  setText("#view-calculation", "(" + money.format(validPrice) + " x " + quantity + ")");
  setText("#form-total", money.format(total));
  setText("#form-formula", money.format(validPrice) + " × " + quantity +
    (quantity === 1 ? " período" : " períodos"));

  const target = $("#view-periods");
  target.replaceChildren();
  data.periods.forEach((period) => {
    const row = document.createElement("div");
    row.className = "preview-period";
    const first = document.createElement("span");
    const middle = document.createElement("span");
    const last = document.createElement("span");
    first.textContent = dateBR(period.start);
    middle.textContent = "à";
    middle.className = "separator";
    last.textContent = period.current ? "Atualidade" : dateBR(period.end);
    row.append(first, middle, last);
    target.append(row);
  });
}

function renderPeriods() {
  const container = $("#periods-container");
  const template = $("#period-template");
  container.replaceChildren();
  periods.forEach((period, index) => {
    const element = template.content.firstElementChild.cloneNode(true);
    element.dataset.id = String(period.id);
    element.querySelector(".period-label").textContent = "Período " + (index + 1);
    const start = element.querySelector(".period-start");
    const end = element.querySelector(".period-end");
    const current = element.querySelector(".period-current");
    const remove = element.querySelector(".remove-period");
    start.value = period.start;
    end.value = period.end;
    current.checked = period.current;
    end.disabled = period.current;
    remove.disabled = periods.length === 1;
    start.addEventListener("input", () => { period.start = start.value; start.classList.remove("invalid"); updatePreview(); });
    end.addEventListener("input", () => { period.end = end.value; end.classList.remove("invalid"); updatePreview(); });
    current.addEventListener("change", () => {
      period.current = current.checked;
      end.disabled = period.current;
      if (period.current) { period.end = ""; end.value = ""; end.classList.remove("invalid"); }
      updatePreview();
    });
    remove.addEventListener("click", () => {
      if (periods.length === 1) return;
      periods = periods.filter((item) => item.id !== period.id);
      renderPeriods();
      updatePreview();
    });
    container.append(element);
  });
}

function markInvalid(element, message) {
  element.classList.add("invalid");
  setStatus(message, "error");
  element.focus();
  return false;
}

function validate(data) {
  const mandatory = [
    ["cnpj", "Informe o CNPJ."],
    ["company", "Informe a razão social."],
    ["worker", "Informe o nome do trabalhador."],
    ["cpf", "Informe o CPF."],
    ["requester", "Informe o nome do solicitante."],
    ["phone", "Informe o contato do solicitante."],
    ["date", "Informe a data de emissão."]
  ];
  for (const [key, message] of mandatory) {
    if (!data[key]) return markInvalid(fields[key], message);
  }
  if (digits(data.cnpj).length !== 14) return markInvalid(fields.cnpj, "O CNPJ deve conter 14 dígitos.");
  if (digits(data.cpf).length !== 11) return markInvalid(fields.cpf, "O CPF deve conter 11 dígitos.");
  if (![10, 11].includes(digits(data.phone).length)) return markInvalid(fields.phone, "Informe um telefone com DDD.");
  if (!Number.isFinite(data.unitPrice)) return markInvalid(fields.unitPrice, "Informe um valor válido por período.");
  for (let i = 0; i < data.periods.length; i++) {
    const period = data.periods[i];
    const editor = $$('.period-card')[i];
    if (!period.start) return markInvalid(editor.querySelector(".period-start"), "Informe a data inicial do período " + (i + 1) + ".");
    if (!period.current && !period.end) return markInvalid(editor.querySelector(".period-end"), "Informe a data final do período " + (i + 1) + ".");
    if (!period.current && period.end < period.start) return markInvalid(editor.querySelector(".period-end"), "A data final deve ser posterior à inicial.");
  }
  return true;
}

function $$(selector) { return Array.from(document.querySelectorAll(selector)); }

function safeFilename(data, extension) {
  const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28);
  return "Orcamento_PPP_" + normalized(data.company) + "_" + normalized(data.worker) +
    "_" + data.date + "." + extension;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

function buildWord(data, imageBytes) {
  const D = window.docx;
  const W = 10000;
  const green = "087D56", greenLine = "B1DDC7", pale = "E8F5EE";
  const border = { style: "single", size: 5, color: greenLine };
  const absent = { style: "nil", size: 0, color: "FFFFFF" };
  const allBorders = { top: border, bottom: border, left: border, right: border };
  const noBorders = { top: absent, bottom: absent, left: absent, right: absent };
  const tr = (text, opts = {}) => new D.TextRun({
    text: String(text), font: "Arial", size: 20, color: "222222", ...opts
  });
  const para = (children, opts = {}) => new D.Paragraph({
    children, spacing: { before: 0, after: 0, line: 260 }, ...opts
  });
  const space = (after = 75) => para([], { spacing: { after, before: 0 } });
  const cell = (children, width, opts = {}) => new D.TableCell({
    children,
    width: { size: width, type: D.WidthType.DXA },
    borders: allBorders,
    margins: { top: 155, bottom: 155, left: 145, right: 145 },
    verticalAlign: D.VerticalAlign.CENTER,
    ...opts
  });
  const row = (cells) => new D.TableRow({ children: cells });
  const table = (rows, widths) => new D.Table({
    rows, width: { size: W, type: D.WidthType.DXA },
    columnWidths: widths, layout: D.TableLayoutType.FIXED
  });
  const labelValue = (label, value) => para([
    tr(label, { bold: true, color: green }),
    tr(" " + value, { bold: true, color: "141414" })
  ]);
  const heading = (text) => para([tr(text, { size: 24, color: green, bold: true })], {
    spacing: { before: 170, after: 100 }, keepNext: true
  });

  const header = table([row([
    cell([para([new D.ImageRun({
      type: "jpg", data: imageBytes, transformation: { width: 236, height: 58 }
    })])], 4800, { borders: noBorders, margins: { top: 0, bottom: 30, left: 0, right: 0 } }),
    cell([
      para([tr("SEGURANÇA E MEDICINA DO TRABALHO", { bold: true, color: green, size: 18 })], { alignment: D.AlignmentType.RIGHT }),
      para([tr("Fones Exames: 98204-6085 / 98103-3601", { color: green, size: 17 })], { alignment: D.AlignmentType.RIGHT }),
      para([tr("Comercial: (17) 99633-3590", { color: green, size: 17 })], { alignment: D.AlignmentType.RIGHT }),
      para([tr("clinimedsegurancavotu@gmail.com", { color: green, size: 17 })], { alignment: D.AlignmentType.RIGHT })
    ], 5200, { borders: noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 } })
  ])], [4800, 5200]);

  const headingBlock = table([row([
    cell([
      para([tr("ORÇAMENTO PARA ELABORAÇÃO DE PPP", { size: 28, color: green, bold: true })], {
        alignment: D.AlignmentType.CENTER, spacing: { before: 20, after: 55 }
      }),
      para([tr("Perfil Profissiográfico Previdenciário", { color: "62717D", size: 21 })], {
        alignment: D.AlignmentType.CENTER
      })
    ], W, {
      shading: { fill: pale },
      margins: { top: 190, bottom: 190, left: 130, right: 130 },
      borders: { top: border, bottom: border, left: border, right: border }
    })
  ])], [W]);

  const personalData = table([
    row([
      cell([labelValue("CNPJ:", data.cnpj)], 5000),
      cell([labelValue("Empresa:", data.company)], 5000)
    ]),
    row([
      cell([labelValue("Nome do trabalhador:", data.worker)], 5000),
      cell([labelValue("CPF:", data.cpf)], 5000)
    ])
  ], [5000, 5000]);

  const service = table([
    row([cell([para([
      tr("Elaboração de PPP - Perfil Profissiográfico Previdenciário", {
        color: green, bold: true, size: 21
      })
    ])], W, { shading: { fill: pale }, margins: { top: 120, bottom: 120, left: 145, right: 145 } })]),
    row([cell([para([tr(serviceDescription, { color: "374352", size: 19 })], {
      spacing: { line: 258, after: 0 }
    })], W, { margins: { top: 145, bottom: 145, left: 145, right: 145 } })])
  ], [W]);

  const sum = data.unitPrice * data.periods.length;
  const periodParagraphs = [para([tr("Períodos a considerar", { color: green, bold: true, size: 20 })], {
    spacing: { after: 125 }
  })];
  data.periods.forEach((period) => {
    periodParagraphs.push(para([
      tr(dateBR(period.start) + "    à    " +
        (period.current ? "Atualidade" : dateBR(period.end)), {
        color: "647180", size: 19
      })
    ], { spacing: { after: 85 } }));
  });
  const investment = table([row([
    cell([
      para([tr("VALOR DO SERVIÇO", { color: green, bold: true, size: 18 })], {
        alignment: D.AlignmentType.CENTER, spacing: { after: 125 }
      }),
      para([
        tr(money.format(sum), { color: green, bold: true, size: 33 }),
        tr("  (" + money.format(data.unitPrice) + " x " + data.periods.length + ")", { size: 16 })
      ], { alignment: D.AlignmentType.CENTER })
    ], 5000, { shading: { fill: pale }, margins: { top: 155, bottom: 155, left: 130, right: 130 } }),
    cell(periodParagraphs, 5000, {
      margins: { top: 140, bottom: 100, left: 155, right: 90 }
    })
  ])], [5000, 5000]);

  const requester = table([row([
    cell([
      para([tr("Solicitante:", { color: green, bold: true })]),
      para([tr(data.requester)])
    ], 5000),
    cell([
      para([tr("Contato:", { color: green, bold: true })]),
      para([tr(data.phone)])
    ], 5000)
  ])], [5000, 5000]);

  const footer = new D.Footer({ children: [
    para([tr("CLINIMED - Segurança e Medicina do Trabalho", {
      color: "647180", size: 16
    })], { alignment: D.AlignmentType.CENTER })
  ] });

  return new D.Document({
    creator: "Clinimed - Segurança e Medicina do Trabalho",
    title: "Orçamento para elaboração de PPP",
    description: "Perfil Profissiográfico Previdenciário",
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 792, right: 936, bottom: 720, left: 936, footer: 430 }
        }
      },
      footers: { default: footer },
      children: [
        header,
        space(60),
        para([], { border: { bottom: { style: "single", size: 20, color: "00A85E" } }, spacing: { after: 165 } }),
        headingBlock,
        heading("1. Dados do trabalhador e da empresa"),
        personalData,
        heading("2. Serviço solicitado"),
        service,
        heading("3. Investimento e períodos"),
        investment,
        heading("4. Responsável / solicitante"),
        requester,
        para([tr("Votuporanga, " + dateBR(data.date) + ".", { color: "141414", size: 20 })], {
          spacing: { before: 390, after: 0 }
        })
      ]
    }]
  });
}

async function loadLogo() {
  const response = await fetch(logoPath);
  if (!response.ok) throw new Error("Não foi possível carregar a logomarca da Clinimed.");
  return new Uint8Array(await response.arrayBuffer());
}

async function exportWord(data) {
  if (!window.docx?.Packer) throw new Error("A biblioteca de Word não carregou. Recarregue a página.");
  const document = buildWord(data, await loadLogo());
  const blob = await window.docx.Packer.toBlob(document);
  downloadBlob(blob, safeFilename(data, "docx"));
}

async function buildPDF(data, imageBytes) {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedJpg(imageBytes);
  const pageWidth = 595.28, pageHeight = 841.89;
  const left = 46, width = pageWidth - left * 2;
  const green = rgb(8 / 255, 125 / 255, 86 / 255);
  const ink = rgb(19 / 255, 23 / 255, 23 / 255);
  const slate = rgb(98 / 255, 113 / 255, 125 / 255);
  const pale = rgb(232 / 255, 245 / 255, 238 / 255);
  const lineGreen = rgb(177 / 255, 221 / 255, 199 / 255);
  let page = pdf.addPage([pageWidth, pageHeight]);
  let top = 0;

  const safe = (value) => String(value ?? "").replace(/\u00a0/g, " ")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[^\x20-\x7e\u00a1-\u00ff]/g, "");
  const measure = (text, size, face = normal) => face.widthOfTextAtSize(safe(text), size);
  const textAt = (value, x, yTop, size = 10, face = normal, color = ink) =>
    page.drawText(safe(value), { x, y: pageHeight - yTop - size, size, font: face, color });
  const center = (value, x, yTop, w, size, face = normal, color = ink) =>
    textAt(value, x + (w - measure(value, size, face)) / 2, yTop, size, face, color);
  const right = (value, xRight, yTop, size, face = normal, color = ink) =>
    textAt(value, xRight - measure(value, size, face), yTop, size, face, color);
  const rectangle = (x, yTop, w, h, fill = undefined, border = lineGreen, thickness = .7) => {
    const spec = { x, y: pageHeight - yTop - h, width: w, height: h,
      borderColor: border, borderWidth: thickness };
    if (fill) spec.color = fill;
    page.drawRectangle(spec);
  };
  const wrap = (value, face, size, maxWidth) => {
    const words = safe(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const originalWord of words) {
      let word = originalWord;
      if (measure(word, size, face) > maxWidth) {
        if (current) { lines.push(current); current = ""; }
        while (word && measure(word, size, face) > maxWidth) {
          let count = 1;
          while (count < word.length && measure(word.slice(0, count + 1), size, face) <= maxWidth) count++;
          lines.push(word.slice(0, count));
          word = word.slice(count);
        }
      }
      if (!word) continue;
      const candidate = current ? current + " " + word : word;
      if (current && measure(candidate, size, face) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = candidate;
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };
  const drawWrapped = (value, x, yTop, w, size, leading, face = normal, color = ink) => {
    const lines = wrap(value, face, size, w);
    lines.forEach((line, index) => textAt(line, x, yTop + leading * index, size, face, color));
    return lines.length * leading;
  };
  const drawFooter = () => {
    center("CLINIMED - Segurança e Medicina do Trabalho", left, 811, width, 9, normal, slate);
  };
  const nextPage = () => {
    drawFooter();
    page = pdf.addPage([pageWidth, pageHeight]);
    textAt("CLINIMED - SEGURANÇA E MEDICINA DO TRABALHO", left, 43, 10, bold, green);
    page.drawLine({ start: { x: left, y: pageHeight - 64 }, end: { x: left + width, y: pageHeight - 64 },
      thickness: 2, color: green });
    top = 83;
  };
  const need = (height) => { if (top + height > 778) nextPage(); };
  const section = (title, estimatedBodyHeight) => {
    need(27 + estimatedBodyHeight);
    textAt(title, left + 8, top, 12, bold, green);
    top += 27;
  };
  const drawPairCell = (label, value, x, y, w, h) => {
    rectangle(x, y, w, h);
    const size = 10, xText = x + 10, textTop = y + 13;
    const labelWidth = measure(label, size, bold);
    textAt(label, xText, textTop, size, bold, green);
    let remaining = safe(value).trim();
    const words = remaining.split(/\s+/);
    let first = "";
    while (words.length) {
      const candidate = first ? first + " " + words[0] : words[0];
      if (measure(candidate, size, bold) > w - labelWidth - 24 && first) break;
      if (measure(candidate, size, bold) > w - labelWidth - 24) break;
      first = candidate;
      words.shift();
    }
    if (first) textAt(first, xText + labelWidth + 4, textTop, size, bold, ink);
    remaining = words.join(" ");
    if (remaining) drawWrapped(remaining, xText, textTop + 15, w - 20, size, 13, bold, ink);
  };

  // Cabeçalho e título no mesmo estilo do documento de referência.
  const logoWidth = 191, logoHeight = (logo.height / logo.width) * logoWidth;
  page.drawImage(logo, { x: left, y: pageHeight - 45 - logoHeight, width: logoWidth, height: logoHeight });
  right("SEGURANÇA E MEDICINA DO TRABALHO", left + width, 46, 10, bold, green);
  right("Fones Exames: 98204-6085 / 98103-3601", left + width, 62, 9, normal, green);
  right("Comercial: (17) 99633-3590", left + width, 75, 9, normal, green);
  right("clinimedsegurancavotu@gmail.com", left + width, 88, 9, normal, green);
  page.drawLine({ start: { x: left + 8, y: pageHeight - 133 },
    end: { x: left + width - 8, y: pageHeight - 133 }, thickness: 3, color: rgb(0, .66, .37) });
  rectangle(left + 8, 151, width - 16, 61, pale, lineGreen, 1.2);
  center("ORÇAMENTO PARA ELABORAÇÃO DE PPP", left + 8, 162, width - 16, 16.6, bold, green);
  center("Perfil Profissiográfico Previdenciário", left + 8, 185, width - 16, 11.5, normal, slate);
  top = 230;

  const half = width / 2;
  const workerRow1Height = Math.max(47, 30 +
    wrap(data.company, bold, 10, half - 93).length * 13);
  const workerRow2Height = Math.max(47, 30 +
    wrap(data.worker, bold, 10, half - 160).length * 13);
  section("1. Dados do trabalhador e da empresa", workerRow1Height + workerRow2Height);
  drawPairCell("CNPJ:", data.cnpj, left, top, half, workerRow1Height);
  drawPairCell("Empresa:", data.company, left + half, top, half, workerRow1Height);
  top += workerRow1Height;
  drawPairCell("Nome do trabalhador:", data.worker, left, top, half, workerRow2Height);
  drawPairCell("CPF:", data.cpf, left + half, top, half, workerRow2Height);
  top += workerRow2Height + 19;

  const descriptionLines = wrap(serviceDescription, normal, 10.2, width - 22);
  const serviceHeight = 30 + descriptionLines.length * 14 + 21;
  section("2. Serviço solicitado", serviceHeight);
  rectangle(left, top, width, 30, pale);
  textAt("Elaboração de PPP - Perfil Profissiográfico Previdenciário", left + 11, top + 7, 11.2, bold, green);
  top += 30;
  const descHeight = descriptionLines.length * 14 + 21;
  rectangle(left, top, width, descHeight);
  descriptionLines.forEach((line, index) => textAt(line, left + 11, top + 10 + index * 14, 10.2, normal, slate));
  top += descHeight + 19;

  const investmentHeight = Math.max(94, 37 + data.periods.length * 18);
  section("3. Investimento e períodos", investmentHeight);
  rectangle(left, top, half, investmentHeight, pale);
  rectangle(left + half, top, half, investmentHeight);
  center("VALOR DO SERVIÇO", left, top + 21, half, 10, bold, green);
  const totalString = money.format(data.unitPrice * data.periods.length);
  center(totalString, left + 2, top + 43, half - 4, 23, bold, green);
  center("(" + money.format(data.unitPrice) + " x " + data.periods.length + ")", left + 2,
    top + 74, half - 4, 9, normal, ink);
  textAt("Períodos a considerar", left + half + 12, top + 12, 10.5, bold, green);
  data.periods.forEach((period, index) =>
    textAt(dateBR(period.start) + "   à   " + (period.current ? "Atualidade" : dateBR(period.end)),
      left + half + 12, top + 34 + index * 18, 9.5, normal, slate)
  );
  top += investmentHeight + 19;

  const requesterHeight = Math.max(57, 30 + wrap(data.requester, normal, 10, half - 20).length * 13);
  section("4. Responsável / solicitante", requesterHeight);
  rectangle(left, top, half, requesterHeight);
  rectangle(left + half, top, half, requesterHeight);
  textAt("Solicitante:", left + 10, top + 10, 10, bold, green);
  drawWrapped(data.requester, left + 10, top + 27, half - 20, 10, 13, normal, ink);
  textAt("Contato:", left + half + 10, top + 10, 10, bold, green);
  textAt(data.phone, left + half + 10, top + 27, 10, normal, ink);
  top += requesterHeight;
  need(30);
  textAt("Votuporanga, " + dateBR(data.date) + ".", left + 8, top + 17, 10, normal, ink);
  drawFooter();

  return new Blob([await pdf.save()], { type: "application/pdf" });
}

async function exportPDF(data) {
  if (!window.PDFLib?.PDFDocument) throw new Error("A biblioteca de PDF não carregou. Recarregue a página.");
  const blob = await buildPDF(data, await loadLogo());
  downloadBlob(blob, safeFilename(data, "pdf"));
}

async function runExport(kind) {
  const data = currentData();
  $$(".invalid").forEach((field) => field.classList.remove("invalid"));
  if (!validate(data)) return;
  const button = kind === "word" ? $("#download-word") : $("#download-pdf");
  const other = kind === "word" ? $("#download-pdf") : $("#download-word");
  const oldLabel = button.innerHTML;
  button.disabled = true;
  other.disabled = true;
  button.textContent = "Gerando arquivo...";
  setStatus("Preparando seu orçamento...");
  try {
    if (kind === "word") await exportWord(data);
    else await exportPDF(data);
    setStatus((kind === "word" ? "Word" : "PDF") + " gerado com sucesso.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Não foi possível gerar o arquivo.", "error");
  } finally {
    button.innerHTML = oldLabel;
    button.disabled = false;
    other.disabled = false;
  }
}

function initialize() {
  fields.date.value = todayInBrazil();
  renderPeriods();
  updatePreview();
  Object.values(fields).forEach((input) => {
    input.addEventListener("input", () => { input.classList.remove("invalid"); updatePreview(); });
  });
  [
    [fields.cnpj, maskCNPJ],
    [fields.cpf, maskCPF],
    [fields.phone, maskPhone]
  ].forEach(([input, mask]) => {
    input.addEventListener("blur", () => { input.value = mask(input.value); updatePreview(); });
  });
  fields.unitPrice.addEventListener("blur", () => {
    const value = parseMoney(fields.unitPrice.value);
    if (Number.isFinite(value)) fields.unitPrice.value = value.toFixed(2).replace(".", ",");
    updatePreview();
  });
  $("#add-period").addEventListener("click", () => {
    periods.push({ id: ++periodSequence, start: "", end: "", current: false });
    renderPeriods();
    updatePreview();
  });
  $("#download-word").addEventListener("click", () => runExport("word"));
  $("#download-pdf").addEventListener("click", () => runExport("pdf"));
  const scalePreview = () => {
    const available = $(".paper-scroll").clientWidth - 4;
    const scale = Math.min(1, available / 794);
    $("#document-preview").style.setProperty("--paper-zoom", scale.toFixed(3));
  };
  window.addEventListener("resize", scalePreview);
  scalePreview();
  $("#reset-form").addEventListener("click", () => {
    if (!window.confirm("Deseja apagar os dados preenchidos neste orçamento?")) return;
    $("#quote-form").reset();
    fields.date.value = todayInBrazil();
    fields.unitPrice.value = "100,00";
    periods = [{ id: ++periodSequence, start: "", end: "", current: true }];
    renderPeriods();
    updatePreview();
    setStatus("Formulário limpo.");
  });
}

document.addEventListener("DOMContentLoaded", initialize);
