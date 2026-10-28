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
const settingIds = {
  header: "setting-header", exams: "setting-exams", commercial: "setting-commercial",
  email: "setting-email", title: "setting-title", subtitle: "setting-subtitle",
  section1: "setting-section1", cnpjLabel: "setting-cnpj-label",
  companyLabel: "setting-company-label", workerLabel: "setting-worker-label",
  cpfLabel: "setting-cpf-label", section2: "setting-section2",
  service: "setting-service", description: "setting-description",
  section3: "setting-section3", priceLabel: "setting-price-label",
  periodsLabel: "setting-periods-label", section4: "setting-section4",
  requesterLabel: "setting-requester-label", contactLabel: "setting-contact-label",
  city: "setting-city", footer: "setting-footer"
};
const settingFields = Object.fromEntries(Object.entries(settingIds).map(
  ([key, id]) => [key, document.getElementById(id)]
));
let customLogo = null;
let logoPreviewUrl = null;
let previewScale = 1;

let periodSequence = 1;
let periods = [{ id: periodSequence, start: "", end: "", current: true }];
const logoPath = new URL("./assets/clinimed-logo.jpg", document.baseURI).href;

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
    periods: periods.map((period) => ({ ...period })),
    settings: Object.fromEntries(Object.entries(settingFields).map(
      ([key, input]) => [key, input.value.trim()]
    )),
    accent: $("#custom-color").value
  };
}

function setText(selector, value) {
  $(selector).textContent = value || "—";
}

function fitPreview() {
  const body = $("#document-body");
  const note = $("#page-fit-status");
  body.style.setProperty("--content-scale", "1");
  const bodyHeight = body.scrollHeight;
  const available = 950;
  previewScale = Math.min(1, available / Math.max(bodyHeight, 1));
  body.style.setProperty("--content-scale", previewScale.toFixed(3));
  note.className = previewScale < .78 ? "preview-note is-error" : "preview-note is-success";
  note.textContent = previewScale < .78
    ? "O texto está longo demais para uma página legível. Encurte a descrição ou os campos antes de exportar."
    : previewScale < .995
      ? "A prévia foi compactada automaticamente para caber em uma única página A4."
      : "O orçamento cabe em uma única página A4.";
}

function updatePreview() {
  const data = currentData();
  const settings = data.settings;
  const validPrice = Number.isFinite(data.unitPrice) ? data.unitPrice : 0;
  const quantity = data.periods.length;
  const total = validPrice * quantity;
  setText("#view-cnpj", data.cnpj);
  setText("#view-company", data.company);
  setText("#view-worker", data.worker);
  setText("#view-cpf", data.cpf);
  setText("#view-requester", data.requester);
  setText("#view-phone", data.phone);
  setText("#view-date", settings.city + ", " + dateBR(data.date) + ".");
  const settingViews = {
    header: "#view-header", exams: "#view-exams", commercial: "#view-commercial",
    email: "#view-email", title: "#view-title", subtitle: "#view-subtitle",
    section1: "#view-section1", cnpjLabel: "#view-cnpj-label",
    companyLabel: "#view-company-label", workerLabel: "#view-worker-label",
    cpfLabel: "#view-cpf-label", section2: "#view-section2",
    service: "#view-service", description: "#view-description",
    section3: "#view-section3", priceLabel: "#view-price-label",
    periodsLabel: "#view-periods-label", section4: "#view-section4",
    requesterLabel: "#view-requester-label", contactLabel: "#view-contact-label",
    footer: "#view-footer"
  };
  for (const [key, selector] of Object.entries(settingViews)) setText(selector, settings[key]);
  $("#document-preview").style.setProperty("--preview-accent", data.accent);
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
  fitPreview();
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
  if (previewScale < .78) {
    $("#customization").open = true;
    return markInvalid(settingFields.description,
      "O orçamento está extenso demais. Reduza a descrição ou outros textos para caber em uma página.");
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

function buildWord(data, image) {
  const D = window.docx;
  const W = 10000;
  const s = data.settings;
  const fontScale = Math.max(.82, Math.min(1, previewScale));
  const green = data.accent.replace("#", "").toUpperCase();
  const greenLine = "B1DDC7", pale = "E8F5EE";
  const border = { style: "single", size: 5, color: greenLine };
  const absent = { style: "nil", size: 0, color: "FFFFFF" };
  const allBorders = { top: border, bottom: border, left: border, right: border };
  const noBorders = { top: absent, bottom: absent, left: absent, right: absent };
  const tr = (text, opts = {}) => new D.TextRun({
    text: String(text), font: "Arial", color: "222222", ...opts,
    size: Math.round((opts.size ?? 20) * fontScale)
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
    spacing: { before: Math.round(170 * fontScale), after: Math.round(100 * fontScale) }, keepNext: true
  });

  const header = table([row([
    cell([para([new D.ImageRun({
      type: image.type, data: image.bytes, transformation: { width: 236, height: 58 }
    })])], 4800, { borders: noBorders, margins: { top: 0, bottom: 30, left: 0, right: 0 } }),
    cell([
      para([tr(s.header, { bold: true, color: green, size: 18 })], { alignment: D.AlignmentType.RIGHT }),
      para([tr(s.exams, { color: green, size: 17 })], { alignment: D.AlignmentType.RIGHT }),
      para([tr(s.commercial, { color: green, size: 17 })], { alignment: D.AlignmentType.RIGHT }),
      para([tr(s.email, { color: green, size: 17 })], { alignment: D.AlignmentType.RIGHT })
    ], 5200, { borders: noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 } })
  ])], [4800, 5200]);

  const headingBlock = table([row([
    cell([
      para([tr(s.title, { size: 28, color: green, bold: true })], {
        alignment: D.AlignmentType.CENTER, spacing: { before: 20, after: 55 }
      }),
      para([tr(s.subtitle, { color: "62717D", size: 21 })], {
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
      cell([labelValue(s.cnpjLabel, data.cnpj)], 5000),
      cell([labelValue(s.companyLabel, data.company)], 5000)
    ]),
    row([
      cell([labelValue(s.workerLabel, data.worker)], 5000),
      cell([labelValue(s.cpfLabel, data.cpf)], 5000)
    ])
  ], [5000, 5000]);

  const service = table([
    row([cell([para([
      tr(s.service, {
        color: green, bold: true, size: 21
      })
    ])], W, { shading: { fill: pale }, margins: { top: 120, bottom: 120, left: 145, right: 145 } })]),
    row([cell([para([tr(s.description, { color: "374352", size: 19 })], {
      spacing: { line: 258, after: 0 }
    })], W, { margins: { top: 145, bottom: 145, left: 145, right: 145 } })])
  ], [W]);

  const sum = data.unitPrice * data.periods.length;
  const periodParagraphs = [para([tr(s.periodsLabel, { color: green, bold: true, size: 20 })], {
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
      para([tr(s.priceLabel, { color: green, bold: true, size: 18 })], {
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
      para([tr(s.requesterLabel, { color: green, bold: true })]),
      para([tr(data.requester)])
    ], 5000),
    cell([
      para([tr(s.contactLabel, { color: green, bold: true })]),
      para([tr(data.phone)])
    ], 5000)
  ])], [5000, 5000]);

  const footer = new D.Footer({ children: [
    para([tr(s.footer, {
      color: "647180", size: 16
    })], { alignment: D.AlignmentType.CENTER })
  ] });

  return new D.Document({
    creator: "Clinimed - Segurança e Medicina do Trabalho",
    title: s.title,
    description: s.subtitle,
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
        heading(s.section1),
        personalData,
        heading(s.section2),
        service,
        heading(s.section3),
        investment,
        heading(s.section4),
        requester,
        para([tr(s.city + ", " + dateBR(data.date) + ".", { color: "141414", size: 20 })], {
          spacing: { before: 390, after: 0 }
        })
      ]
    }]
  });
}

async function loadLogo() {
  if (customLogo) return customLogo;
  const response = await fetch(logoPath);
  if (!response.ok) throw new Error("Não foi possível carregar a logomarca da Clinimed.");
  return { bytes: new Uint8Array(await response.arrayBuffer()), type: "jpg" };
}

async function exportWord(data) {
  if (!window.docx?.Packer) throw new Error("A biblioteca de Word não carregou. Recarregue a página.");
  const logo = await loadLogo();
  // Usa a mesma verificação de espaço do PDF antes de permitir o Word.
  await buildPDF(data, logo);
  const document = buildWord(data, logo);
  const blob = await window.docx.Packer.toBlob(document);
  downloadBlob(blob, safeFilename(data, "docx"));
}

async function buildPDF(data, image) {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = image.type === "png" ? await pdf.embedPng(image.bytes) : await pdf.embedJpg(image.bytes);
  const pageWidth = 595.28, pageHeight = 841.89;
  const left = 46, width = pageWidth - left * 2;
  const s = data.settings;
  const hex = data.accent.replace("#", "");
  const green = rgb(parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
  const ink = rgb(19 / 255, 23 / 255, 23 / 255);
  const slate = rgb(98 / 255, 113 / 255, 125 / 255);
  const pale = rgb(232 / 255, 245 / 255, 238 / 255);
  const lineGreen = rgb(177 / 255, 221 / 255, 199 / 255);
  const page = pdf.addPage([pageWidth, pageHeight]);
  let top = 0;
  let bodyScale = 1;

  const safe = (value) => String(value ?? "").replace(/\u00a0/g, " ")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[^\x20-\x7e\u00a1-\u00ff]/g, "");
  const measure = (text, size, face = normal) => face.widthOfTextAtSize(safe(text), size);
  const mappedTop = (y) => y < 230 ? y : 230 + (y - 230) * bodyScale;
  const mappedSize = (size, y) => size * (y < 230 ? 1 : bodyScale);
  const textAt = (value, x, yTop, size = 10, face = normal, color = ink) => {
    const actualSize = mappedSize(size, yTop);
    page.drawText(safe(value), { x, y: pageHeight - mappedTop(yTop) - actualSize,
      size: actualSize, font: face, color });
  };
  const center = (value, x, yTop, w, size, face = normal, color = ink) =>
    textAt(value, x + (w - measure(value, mappedSize(size, yTop), face)) / 2,
      yTop, size, face, color);
  const right = (value, xRight, yTop, size, face = normal, color = ink) =>
    textAt(value, xRight - measure(value, mappedSize(size, yTop), face),
      yTop, size, face, color);
  const rectangle = (x, yTop, w, h, fill = undefined, border = lineGreen, thickness = .7) => {
    const actualHeight = h * (yTop < 230 ? 1 : bodyScale);
    const spec = { x, y: pageHeight - mappedTop(yTop) - actualHeight, width: w, height: actualHeight,
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
    const size = Math.max(7.5, Math.min(9, 9 * (width - 10) /
      Math.max(measure(s.footer, 9, normal), 1)));
    page.drawText(safe(s.footer), {
      x: left + (width - measure(s.footer, size, normal)) / 2,
      y: pageHeight - 811 - size,
      size, font: normal, color: slate
    });
  };
  const sectionHeight = (title) => Math.max(27, wrap(title, bold, 12, width - 18).length * 14 + 13);
  const section = (title) => {
    const lines = wrap(title, bold, 12, width - 18);
    lines.forEach((line, index) => textAt(line, left + 8, top + index * 14, 12, bold, green));
    top += sectionHeight(title);
  };
  const drawPairCell = (label, value, x, y, w, h) => {
    rectangle(x, y, w, h);
    const size = Math.min(10, Math.max(7.5, (w - 24) / Math.max(measure(label, 10, bold), 1) * 10));
    const xText = x + 10, textTop = y + 13;
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

  // Calcula primeiro a altura necessária. O PDF contém sempre UMA página;
  // se for necessário reduzir demais a fonte, a exportação é interrompida.
  const half = width / 2;
  const labelAvailable = (label) => Math.max(75, half - measure(label, 10, bold) - 26);
  const workerRow1Height = Math.max(47, 30 + Math.max(
    wrap(data.company, bold, 10, labelAvailable(s.companyLabel)).length,
    wrap(data.cnpj, bold, 10, labelAvailable(s.cnpjLabel)).length) * 13);
  const workerRow2Height = Math.max(47, 30 + Math.max(
    wrap(data.worker, bold, 10, labelAvailable(s.workerLabel)).length,
    wrap(data.cpf, bold, 10, labelAvailable(s.cpfLabel)).length) * 13);
  const descriptionLines = wrap(s.description, normal, 10.2, width - 22);
  const serviceTitleLines = wrap(s.service, bold, 11.2, width - 22);
  const serviceHeaderHeight = Math.max(30, serviceTitleLines.length * 14 + 13);
  const descHeight = descriptionLines.length * 14 + 21;
  const investmentHeight = Math.max(94, 46 + data.periods.length * 18);
  const requesterHeight = Math.max(57, 30 + Math.max(
    wrap(data.requester, normal, 10, half - 20).length,
    wrap(data.phone, normal, 10, half - 20).length) * 13);
  const cityLines = wrap(s.city + ", " + dateBR(data.date) + ".", normal, 10, width - 16);
  const rawEnd = 230 + [s.section1, s.section2, s.section3, s.section4]
    .reduce((sum, title) => sum + sectionHeight(title), 0)
    + workerRow1Height + workerRow2Height + serviceHeaderHeight + descHeight
    + investmentHeight + requesterHeight + 19 * 3 + 17 + cityLines.length * 13;
  bodyScale = Math.min(1, 560 / Math.max(rawEnd - 230, 1));
  if (bodyScale < .78) {
    throw new Error("Há texto demais para uma única página A4 legível. Reduza a descrição ou a quantidade de períodos.");
  }

  // Cabeçalho e título no mesmo estilo do documento de referência.
  const logoWidth = Math.min(191, (logo.width / logo.height) * 69);
  const logoHeight = (logo.height / logo.width) * logoWidth;
  page.drawImage(logo, { x: left, y: pageHeight - 45 - logoHeight, width: logoWidth, height: logoHeight });
  const headerRight = (value, y, preferred, face = normal) => {
    const size = Math.min(preferred, preferred * (width - logoWidth - 20) /
      Math.max(measure(value, preferred, face), 1));
    if (size < 7) throw new Error("Um dos contatos do cabeçalho está longo demais. Encurte o texto.");
    right(value, left + width, y, size, face, green);
  };
  headerRight(s.header, 46, 10, bold);
  headerRight(s.exams, 62, 9);
  headerRight(s.commercial, 75, 9);
  headerRight(s.email, 88, 9);
  page.drawLine({ start: { x: left + 8, y: pageHeight - 133 },
    end: { x: left + width - 8, y: pageHeight - 133 }, thickness: 3, color: rgb(0, .66, .37) });
  rectangle(left + 8, 151, width - 16, 61, pale, lineGreen, 1.2);
  const mainTitleSize = Math.min(16.6, 16.6 * (width - 30) /
    Math.max(measure(s.title, 16.6, bold), 1));
  const subtitleSize = Math.min(11.5, 11.5 * (width - 30) /
    Math.max(measure(s.subtitle, 11.5, normal), 1));
  if (Math.min(mainTitleSize, subtitleSize) < 8.5) {
    throw new Error("Título ou subtítulo muito longo para uma página A4. Encurte-o.");
  }
  center(s.title, left + 8, 162, width - 16, mainTitleSize, bold, green);
  center(s.subtitle, left + 8, 185, width - 16, subtitleSize, normal, slate);
  top = 230;

  section(s.section1);
  drawPairCell(s.cnpjLabel, data.cnpj, left, top, half, workerRow1Height);
  drawPairCell(s.companyLabel, data.company, left + half, top, half, workerRow1Height);
  top += workerRow1Height;
  drawPairCell(s.workerLabel, data.worker, left, top, half, workerRow2Height);
  drawPairCell(s.cpfLabel, data.cpf, left + half, top, half, workerRow2Height);
  top += workerRow2Height + 19;

  section(s.section2);
  rectangle(left, top, width, serviceHeaderHeight, pale);
  serviceTitleLines.forEach((line, index) =>
    textAt(line, left + 11, top + 7 + index * 14, 11.2, bold, green));
  top += serviceHeaderHeight;
  rectangle(left, top, width, descHeight);
  descriptionLines.forEach((line, index) => textAt(line, left + 11, top + 10 + index * 14, 10.2, normal, slate));
  top += descHeight + 19;

  section(s.section3);
  rectangle(left, top, half, investmentHeight, pale);
  rectangle(left + half, top, half, investmentHeight);
  center(s.priceLabel, left, top + 21, half, Math.min(10,
    10 * (half - 20) / Math.max(measure(s.priceLabel, 10, bold), 1)), bold, green);
  const totalString = money.format(data.unitPrice * data.periods.length);
  center(totalString, left + 2, top + 43, half - 4, 23, bold, green);
  center("(" + money.format(data.unitPrice) + " x " + data.periods.length + ")", left + 2,
    top + 74, half - 4, 9, normal, ink);
  textAt(s.periodsLabel, left + half + 12, top + 12, Math.min(10.5,
    10.5 * (half - 24) / Math.max(measure(s.periodsLabel, 10.5, bold), 1)), bold, green);
  data.periods.forEach((period, index) =>
    textAt(dateBR(period.start) + "   à   " + (period.current ? "Atualidade" : dateBR(period.end)),
      left + half + 12, top + 34 + index * 18, 9.5, normal, slate)
  );
  top += investmentHeight + 19;

  section(s.section4);
  rectangle(left, top, half, requesterHeight);
  rectangle(left + half, top, half, requesterHeight);
  textAt(s.requesterLabel, left + 10, top + 10, 10, bold, green);
  drawWrapped(data.requester, left + 10, top + 27, half - 20, 10, 13, normal, ink);
  textAt(s.contactLabel, left + half + 10, top + 10, 10, bold, green);
  drawWrapped(data.phone, left + half + 10, top + 27, half - 20, 10, 13, normal, ink);
  top += requesterHeight;
  cityLines.forEach((line, index) => textAt(line, left + 8, top + 17 + index * 13, 10, normal, ink));
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
  Object.values(settingFields).forEach((input) => {
    input.addEventListener("input", () => { input.classList.remove("invalid"); updatePreview(); });
  });
  $("#custom-color").addEventListener("input", updatePreview);
  $("#custom-logo").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      customLogo = null;
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      logoPreviewUrl = null;
      $(".document-logo").src = logoPath;
      updatePreview();
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      event.target.value = "";
      setStatus("Use uma imagem JPG ou PNG de até 3 MB.", "error");
      return;
    }
    customLogo = { bytes: new Uint8Array(await file.arrayBuffer()),
      type: file.type === "image/png" ? "png" : "jpg" };
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    logoPreviewUrl = URL.createObjectURL(file);
    $(".document-logo").src = logoPreviewUrl;
    updatePreview();
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
    fitPreview();
  };
  window.addEventListener("resize", scalePreview);
  scalePreview();
  $("#reset-form").addEventListener("click", () => {
    if (!window.confirm("Deseja apagar os dados preenchidos neste orçamento?")) return;
    $("#quote-form").reset();
    fields.date.value = todayInBrazil();
    fields.unitPrice.value = "100,00";
    customLogo = null;
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    logoPreviewUrl = null;
    $(".document-logo").src = logoPath;
    periods = [{ id: ++periodSequence, start: "", end: "", current: true }];
    renderPeriods();
    updatePreview();
    setStatus("Formulário limpo.");
  });
}

document.addEventListener("DOMContentLoaded", initialize);
