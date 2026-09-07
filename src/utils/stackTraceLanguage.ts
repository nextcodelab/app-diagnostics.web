import hljs from "highlight.js/lib/core";

hljs.registerLanguage("stacktrace", () => {
  return {
    name: "StackTrace",
    contains: [
      {
        className: "keyword",
        begin: /\b(at|in)\b/,
      },
      {
        className: "title.class",
        begin: /\b[A-Za-z_][\w.]*Exception\b/,
      },
      {
        className: "string",
        begin: /(?:[A-Za-z]:\\|\/).*?\.(?:cs|cshtml|xaml):line\s+\d+/,
      },
      {
        className: "comment",
        begin: /^---.+---$/,
      },
    ],
  };
});