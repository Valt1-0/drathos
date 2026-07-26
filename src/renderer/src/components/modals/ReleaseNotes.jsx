import { createElement, useMemo } from "react";

// electron-updater's GitHub provider hands back GitHub's *rendered HTML*, not the
// markdown source. It is turned into React elements through an allowlist instead
// of dangerouslySetInnerHTML: the document comes from an inert DOMParser, every
// attribute is dropped, and only an http(s) href survives.
const TAGS = {
  P: "p", BR: "br", HR: "hr",
  STRONG: "strong", B: "strong", EM: "em", I: "em", DEL: "del",
  UL: "ul", OL: "ol", LI: "li",
  CODE: "code", TT: "code", PRE: "pre",
  H1: "h4", H2: "h4", H3: "h5", H4: "h5", H5: "h6", H6: "h6",
  BLOCKQUOTE: "blockquote",
};

const VOID_TAGS = new Set(["br", "hr"]);

const CLASSES = {
  p: "mb-2 last:mb-0",
  ul: "list-disc pl-5 mb-2 space-y-1",
  ol: "list-decimal pl-5 mb-2 space-y-1",
  code: "px-1 py-0.5 rounded bg-black/25 font-mono text-[0.85em]",
  pre: "p-2 rounded bg-black/25 overflow-x-auto mb-2",
  h4: "font-semibold text-[0.95rem] mt-3 mb-1 first:mt-0",
  h5: "font-semibold mt-2 mb-1 first:mt-0",
  h6: "font-semibold mt-2 mb-1 first:mt-0",
  blockquote: "border-l-2 border-current/30 pl-3 opacity-80 mb-2",
  hr: "my-3 border-current/25",
};

const isHttpUrl = (url) => /^https?:\/\//i.test(url || "");

const openExternal = (url) => {
  window.electron?.shell?.openExternal(url).catch(() => {});
};

const convert = (node, key) => {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const children = [...node.childNodes]
    .map((child, i) => convert(child, i))
    .filter((child) => child !== null && child !== "");

  // Blocked by the main process anyway unless the host is allowlisted, so a
  // refused link is a no-op rather than a navigation
  if (node.tagName === "A") {
    const href = node.getAttribute("href");
    if (!isHttpUrl(href)) return children.length ? children : null;
    return (
      <button
        key={key}
        type="button"
        title={href}
        onClick={() => openExternal(href)}
        className="underline hover:no-underline text-left"
      >
        {children}
      </button>
    );
  }

  const tag = TAGS[node.tagName];
  if (!tag) return children.length ? <span key={key}>{children}</span> : null;
  if (VOID_TAGS.has(tag)) return createElement(tag, { key, className: CLASSES[tag] });
  return createElement(tag, { key, className: CLASSES[tag] }, children);
};

const looksLikeHtml = (s) => /<[a-z][\s\S]*>/i.test(s);

const renderNote = (note) => {
  if (!looksLikeHtml(note)) return <p className="whitespace-pre-wrap">{note}</p>;
  const doc = new DOMParser().parseFromString(note, "text/html");
  return [...doc.body.childNodes].map((n, i) => convert(n, i)).filter(Boolean);
};

// releaseNotes is a string, or [{ version, note }] when fullChangelog is on
const ReleaseNotes = ({ notes }) => {
  const entries = useMemo(() => {
    if (typeof notes === "string") return [{ version: null, note: notes }];
    if (Array.isArray(notes)) {
      return notes
        .map((n) => (typeof n === "string" ? { version: null, note: n } : n))
        .filter((n) => n?.note);
    }
    return [];
  }, [notes]);

  if (entries.length === 0) return null;

  return (
    <div className="text-sm leading-relaxed">
      {entries.map(({ version, note }, i) => (
        <div key={version || i} className={i > 0 ? "mt-4" : ""}>
          {version && <p className="font-semibold mb-1">{version}</p>}
          {renderNote(String(note))}
        </div>
      ))}
    </div>
  );
};

export default ReleaseNotes;
