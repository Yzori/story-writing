import { StoryProject } from "@/types/editor";

/**
 * Export story as DOCX using the OOXML format.
 * Builds a minimal valid .docx from scratch with JSZip.
 */
export async function exportDocx(project: StoryProject) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const slug = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "story";

  function escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function htmlToDocxParagraphs(html: string): string {
    // Strip HTML to extract text and basic structure
    const div = document.createElement("div");
    div.innerHTML = html;
    const paras: string[] = [];

    function processNode(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === "h1") {
          paras.push(heading(el.textContent ?? "", "Heading1"));
        } else if (tag === "h2") {
          paras.push(heading(el.textContent ?? "", "Heading2"));
        } else if (tag === "h3") {
          paras.push(heading(el.textContent ?? "", "Heading3"));
        } else if (tag === "p") {
          paras.push(paragraph(processInline(el)));
        } else if (tag === "blockquote") {
          // Flatten blockquote paragraphs
          el.querySelectorAll("p").forEach((p) => {
            paras.push(blockquote(processInline(p)));
          });
          if (el.querySelectorAll("p").length === 0) {
            paras.push(blockquote(runs([{ text: el.textContent ?? "" }])));
          }
        } else if (tag === "hr") {
          paras.push(scenBreak());
        } else if (tag === "ul" || tag === "ol") {
          el.querySelectorAll("li").forEach((li) => {
            paras.push(paragraph(runs([{ text: li.textContent ?? "" }])));
          });
        } else {
          // Recurse for divs etc
          for (let i = 0; i < el.childNodes.length; i++) {
            processNode(el.childNodes[i]);
          }
        }
      }
    }

    for (let i = 0; i < div.childNodes.length; i++) {
      processNode(div.childNodes[i]);
    }

    return paras.join("\n");
  }

  interface RunData {
    text: string;
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
  }

  function processInline(el: HTMLElement): string {
    const runList: RunData[] = [];

    function walkInline(node: Node, style: { bold?: boolean; italic?: boolean; strike?: boolean }) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          runList.push({ text: node.textContent, ...style });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toLowerCase();
        const newStyle = { ...style };
        if (tag === "strong" || tag === "b") newStyle.bold = true;
        if (tag === "em" || tag === "i") newStyle.italic = true;
        if (tag === "s" || tag === "del" || tag === "strike") newStyle.strike = true;

        for (let i = 0; i < node.childNodes.length; i++) {
          walkInline(node.childNodes[i], newStyle);
        }
      }
    }

    walkInline(el, {});
    return runs(runList);
  }

  function runs(list: RunData[]): string {
    return list
      .map((r) => {
        let rPr = "";
        if (r.bold) rPr += "<w:b/>";
        if (r.italic) rPr += "<w:i/>";
        if (r.strike) rPr += "<w:strike/>";
        return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
      })
      .join("");
  }

  function paragraph(content: string, pStyle?: string): string {
    const pPr = pStyle ? `<w:pPr><w:pStyle w:val="${pStyle}"/></w:pPr>` : "";
    return `<w:p>${pPr}${content}</w:p>`;
  }

  function heading(text: string, style: string): string {
    return paragraph(runs([{ text }]), style);
  }

  function blockquote(content: string): string {
    return `<w:p><w:pPr><w:pStyle w:val="Quote"/><w:ind w:left="720"/></w:pPr>${content}</w:p>`;
  }

  function scenBreak(): string {
    return paragraph(runs([{ text: "* * *" }]), "SceneBreak");
  }

  function pageBreak(): string {
    return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  // Build document content
  let bodyContent = "";

  // Title page
  bodyContent += paragraph(
    runs([{ text: project.title, bold: true }]),
    "Title"
  );

  if (project.metadata.synopsis) {
    bodyContent += paragraph(runs([{ text: project.metadata.synopsis, italic: true }]));
  }

  if (project.metadata.dedication) {
    bodyContent += pageBreak();
    bodyContent += paragraph(runs([{ text: project.metadata.dedication, italic: true }]));
  }

  if (project.frontMatter.epigraph) {
    bodyContent += pageBreak();
    bodyContent += paragraph(runs([{ text: project.frontMatter.epigraph, italic: true }]));
    if (project.frontMatter.epigraphAttribution) {
      bodyContent += paragraph(runs([{ text: `\u2014 ${project.frontMatter.epigraphAttribution}` }]));
    }
  }

  if (project.frontMatter.foreword) {
    bodyContent += pageBreak();
    bodyContent += heading("Foreword", "Heading1");
    bodyContent += paragraph(runs([{ text: project.frontMatter.foreword }]));
  }

  // Chapters
  for (const chapter of project.chapters) {
    bodyContent += pageBreak();
    bodyContent += heading(chapter.title, "Heading1");

    if (chapter.authorNoteBefore) {
      bodyContent += paragraph(runs([{ text: `Author's Note: ${chapter.authorNoteBefore}`, italic: true }]));
    }

    bodyContent += htmlToDocxParagraphs(chapter.content);

    if (chapter.authorNoteAfter) {
      bodyContent += paragraph(runs([{ text: `Author's Note: ${chapter.authorNoteAfter}`, italic: true }]));
    }
  }

  // [Content_Types].xml
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/_rels/document.xml.rels
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // word/styles.xml
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="200" w:line="360" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:before="4000" w:after="400"/><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="56"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="600" w:after="300"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="400" w:after="200"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="300" w:after="150"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/>
    <w:pPr><w:ind w:left="720"/><w:spacing w:after="200"/></w:pPr>
    <w:rPr><w:i/><w:color w:val="666666"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="SceneBreak">
    <w:name w:val="Scene Break"/>
    <w:pPr><w:spacing w:before="400" w:after="400"/><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:color w:val="999999"/></w:rPr>
  </w:style>
</w:styles>`
  );

  // word/document.xml
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyContent}
  </w:body>
</w:document>`
  );

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
