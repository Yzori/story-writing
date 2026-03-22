import JSZip from "jszip";
import { StoryProject } from "@/types/editor";

// ── Shared utilities ────────────────────────────────────────

function htmlToXhtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = doc.body.firstChild;
  if (!container) return "";

  const serializer = new XMLSerializer();
  let xhtml = serializer.serializeToString(container);

  // Remove wrapper div
  xhtml = xhtml
    .replace(/^<div[^>]*>/, "")
    .replace(/<\/div>$/, "");

  return xhtml;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "story";
}

// ── PDF Export (via print) ──────────────────────────────────

export async function exportPdf(project: StoryProject) {
  const slug = slugify(project.title);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  // For webtoon format, fetch panels from API and render as images
  let chaptersHtml: string;

  if (project.format === "webtoon") {
    const chapterParts: string[] = [];
    for (let i = 0; i < project.chapters.length; i++) {
      const ch = project.chapters[i];
      let panelsHtml = "";
      try {
        const res = await fetch(`/api/stories/${project.id}/chapters/${ch.id}/panels`);
        if (res.ok) {
          const json = await res.json();
          const panels = (json.data || []).sort(
            (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder
          );
          panelsHtml = panels
            .map(
              (p: { imageData: string; caption: string }, idx: number) => `
              <div class="webtoon-panel" style="margin-bottom: 0; text-align: center;">
                <img src="${p.imageData}" alt="Panel ${idx + 1}" style="max-width: 100%; height: auto;" />
                ${p.caption ? `<p class="panel-caption" style="font-style: italic; color: #666; margin: 0.5em 0 1.5em; font-size: 10pt;">${escapeXml(p.caption)}</p>` : ""}
              </div>
            `
            )
            .join("\n");
        }
      } catch {
        panelsHtml = "<p style='color: #999;'>Panels could not be loaded for export.</p>";
      }
      chapterParts.push(`
        <div class="chapter" ${i > 0 ? 'style="page-break-before: always;"' : ""}>
          <h2 class="chapter-title">${escapeXml(ch.title)}</h2>
          <div class="chapter-content">${panelsHtml}</div>
        </div>
      `);
    }
    chaptersHtml = chapterParts.join("\n");
  } else {
    chaptersHtml = project.chapters
      .map(
        (ch, i) => `
        <div class="chapter" ${i > 0 ? 'style="page-break-before: always;"' : ""}>
          <h2 class="chapter-title">${escapeXml(ch.title)}</h2>
          <div class="chapter-content">${ch.content}</div>
        </div>
      `
      )
      .join("\n");
  }

  const coverHtml = project.metadata.coverImageDataUrl
    ? `<div class="cover" style="page-break-after: always; text-align: center; padding-top: 20vh;">
        <img src="${project.metadata.coverImageDataUrl}" style="max-width: 60%; max-height: 50vh; border-radius: 4px;" />
       </div>`
    : "";

  const dedicationHtml = project.metadata.dedication
    ? `<div class="dedication" style="page-break-after: always; text-align: center; padding-top: 30vh; font-style: italic; color: #666;">
        <p>${escapeXml(project.metadata.dedication)}</p>
       </div>`
    : "";

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(project.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.8;
      color: #1a1a1a;
      padding: 0;
    }

    .title-page {
      text-align: center;
      padding-top: 25vh;
      page-break-after: always;
    }
    .title-page h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 0.5em;
    }
    .title-page .synopsis {
      max-width: 400px;
      margin: 1em auto;
      color: #555;
      font-size: 10pt;
    }
    .title-page .genres {
      color: #888;
      font-size: 9pt;
      margin-top: 0.5em;
    }

    .chapter-title {
      font-family: 'Playfair Display', serif;
      font-size: 18pt;
      font-weight: 600;
      margin-bottom: 1.5em;
      margin-top: 2em;
      text-align: center;
    }
    .chapter-content p { margin-bottom: 1em; }
    .chapter-content h1 { font-family: 'Playfair Display', serif; font-size: 18pt; margin: 1.5em 0 0.5em; }
    .chapter-content h2 { font-family: 'Playfair Display', serif; font-size: 14pt; margin: 1.3em 0 0.5em; }
    .chapter-content h3 { font-family: 'Playfair Display', serif; font-size: 12pt; margin: 1.2em 0 0.5em; }
    .chapter-content blockquote {
      border-left: 2px solid #ccc;
      padding-left: 1.5em;
      margin: 1.5em 0;
      color: #555;
      font-style: italic;
    }
    .chapter-content hr {
      border: none;
      text-align: center;
      margin: 2em 0;
    }
    .chapter-content hr::after {
      content: "* * *";
      color: #999;
      letter-spacing: 0.5em;
    }
    .chapter-content img { max-width: 100%; margin: 1em 0; }

    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${coverHtml}

  <div class="title-page">
    <h1>${escapeXml(project.title)}</h1>
    ${project.metadata.synopsis ? `<p class="synopsis">${escapeXml(project.metadata.synopsis)}</p>` : ""}
    ${project.metadata.genres.length > 0 ? `<p class="genres">${project.metadata.genres.join(" · ")}</p>` : ""}
  </div>

  ${dedicationHtml}

  ${chaptersHtml}

  <script>
    // Auto-trigger print after fonts load
    document.fonts.ready.then(() => {
      setTimeout(() => window.print(), 300);
    });
  </script>
</body>
</html>`);

  printWindow.document.close();
}

// ── EPUB Export ──────────────────────────────────────────────

export async function exportEpub(project: StoryProject) {
  const zip = new JSZip();
  const bookId = project.id;
  const slug = slugify(project.title);

  // mimetype (must be first and uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // META-INF/container.xml
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // Cover image
  let coverManifest = "";
  let coverSpine = "";
  if (project.metadata.coverImageDataUrl) {
    const match = project.metadata.coverImageDataUrl.match(
      /^data:image\/(jpeg|png|gif|webp);base64,(.+)$/
    );
    if (match) {
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      zip.file(`OEBPS/images/cover.${ext}`, bytes);
      coverManifest = `<item id="cover-image" href="images/cover.${ext}" media-type="image/${match[1]}" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
      coverSpine = `<itemref idref="cover"/>`;

      zip.file(
        "OEBPS/cover.xhtml",
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title></head>
<body style="text-align:center; padding:0; margin:0;">
<img src="images/cover.${ext}" alt="Cover" style="max-width:100%; max-height:100vh;"/>
</body>
</html>`
      );
    }
  }

  // Chapter files
  const chapterItems: string[] = [];
  const chapterSpine: string[] = [];
  const tocEntries: string[] = [];

  project.chapters.forEach((ch, i) => {
    const id = `chapter-${i + 1}`;
    const filename = `${id}.xhtml`;
    const content = htmlToXhtml(ch.content);

    zip.file(
      `OEBPS/${filename}`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <h1>${escapeXml(ch.title)}</h1>
  ${content}
</body>
</html>`
    );

    chapterItems.push(
      `<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`
    );
    chapterSpine.push(`<itemref idref="${id}"/>`);
    tocEntries.push(
      `<li><a href="${filename}">${escapeXml(ch.title)}</a></li>`
    );
  });

  // Stylesheet
  zip.file(
    "OEBPS/style.css",
    `body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1em;
  line-height: 1.8;
  color: #1a1a1a;
  margin: 1em;
}
h1 {
  font-size: 1.8em;
  font-weight: 700;
  margin: 1.5em 0 0.8em;
  text-align: center;
}
h2 { font-size: 1.4em; font-weight: 600; margin: 1.3em 0 0.5em; }
h3 { font-size: 1.1em; font-weight: 600; margin: 1.2em 0 0.5em; }
p { margin-bottom: 1em; }
blockquote {
  border-left: 2px solid #ccc;
  padding-left: 1.5em;
  margin: 1.5em 0;
  color: #555;
  font-style: italic;
}
img { max-width: 100%; }
em { font-style: italic; }
strong { font-weight: bold; }
`
  );

  // content.opf
  const genreMeta = project.metadata.genres
    .map((g) => `<dc:subject>${escapeXml(g)}</dc:subject>`)
    .join("\n    ");

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${bookId}</dc:identifier>
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:language>${project.metadata.language || "en"}</dc:language>
    ${project.metadata.synopsis ? `<dc:description>${escapeXml(project.metadata.synopsis)}</dc:description>` : ""}
    ${genreMeta}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${coverManifest}
    ${chapterItems.join("\n    ")}
  </manifest>
  <spine>
    ${coverSpine}
    ${chapterSpine.join("\n    ")}
  </spine>
</package>`
  );

  // nav.xhtml (EPUB3 navigation)
  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${tocEntries.join("\n      ")}
    </ol>
  </nav>
</body>
</html>`
  );

  // Generate and download
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  downloadBlob(blob, `${slug}.epub`);
}
