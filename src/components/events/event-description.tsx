/**
 * Toont een platte-tekstbeschrijving als nette alinea's (zonder markdown-afhankelijkheid).
 * - Lege regel = nieuwe alinea
 * - Regels die met "- ", "• " of "* " beginnen = opsomming
 * - Korte eerste regel zonder slotleesteken (of eindigend op ":") gevolgd door tekst = tussenkop
 */
const BULLET = /^[-•*]\s+/;

function isHeading(line: string): boolean {
  return line.length > 0 && line.length < 60 && !BULLET.test(line) && (line.endsWith(":") || !/[.!?,;]$/.test(line));
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l, j) => (
        <span key={j}>
          {j > 0 && <br />}
          {l}
        </span>
      ))}
    </>
  );
}

function Body({ lines }: { lines: string[] }) {
  if (lines.length > 0 && lines.every((l) => BULLET.test(l))) {
    return (
      <ul>
        {lines.map((l, j) => (
          <li key={j}>{l.replace(BULLET, "")}</li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <Lines lines={lines} />
    </p>
  );
}

export function EventDescription({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="prose-club">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const [first, ...rest] = lines;

        // Losse kopregel ("Programma:")
        if (rest.length === 0 && first.endsWith(":") && first.length < 80) {
          return <h3 key={i}>{first.slice(0, -1)}</h3>;
        }
        // Kopregel met inhoud eronder ("Programma" + opsomming of alinea)
        if (rest.length > 0 && isHeading(first)) {
          return (
            <div key={i}>
              <h3>{first.replace(/:$/, "")}</h3>
              <Body lines={rest} />
            </div>
          );
        }
        return <Body key={i} lines={lines} />;
      })}
    </div>
  );
}
