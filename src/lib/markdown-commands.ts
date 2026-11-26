export const markdownCommands = [
  {
    id: "text",
    label: "Text",
    hint: "Plain paragraph",
    keywords: "paragraph normal 正文 文本",
    insert: "",
  },
  {
    id: "h1",
    label: "Heading 1",
    hint: "Large heading",
    keywords: "title heading 标题 大标题",
    insert: "# ",
  },
  {
    id: "h2",
    label: "Heading 2",
    hint: "Medium heading",
    keywords: "subtitle heading 标题",
    insert: "## ",
  },
  {
    id: "h3",
    label: "Heading 3",
    hint: "Small heading",
    keywords: "heading 标题",
    insert: "### ",
  },
  {
    id: "bullet",
    label: "Bullet list",
    hint: "A simple list",
    keywords: "unordered list 列表 无序",
    insert: "- ",
  },
  {
    id: "number",
    label: "Numbered list",
    hint: "Keep things in order",
    keywords: "ordered list 列表 有序",
    insert: "1. ",
  },
  {
    id: "todo",
    label: "Checklist",
    hint: "A little thing to do",
    keywords: "task todo checkbox 任务 待办 清单",
    insert: "- [ ] ",
  },
  {
    id: "quote",
    label: "Quote",
    hint: "Make a thought stand out",
    keywords: "blockquote callout 引用",
    insert: "> ",
  },
  {
    id: "code",
    label: "Code block",
    hint: "A space for code",
    keywords: "fence snippet 代码",
    insert: "```\n\n```",
    cursor: 4,
  },
  {
    id: "divider",
    label: "Divider",
    hint: "A quiet break",
    keywords: "line separator 分割线",
    insert: "---\n\n",
  },
  {
    id: "table",
    label: "Table",
    hint: "Two columns to start",
    keywords: "grid columns 表格",
    insert: "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n",
  },
  {
    id: "image",
    label: "Image",
    hint: "Upload a photo or image",
    keywords: "photo picture upload 图片 照片",
    insert: "",
    attachment: "image",
  },
  {
    id: "file",
    label: "File attachment",
    hint: "PDF, document and more",
    keywords: "document pdf upload 附件 文档 文件",
    insert: "",
    attachment: "file",
  },
] as const;
export type MarkdownCommand = (typeof markdownCommands)[number];
export type MarkdownRange = { start: number; end: number; query: string };

/** Only a slash at the start of a paragraph opens commands, never a URL or path. */
export function slashRange(
  value: string,
  start: number,
  end = start,
): MarkdownRange | null {
  if (start !== end) return null;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const match = /^[\t ]*\/([^\s/]*)$/.exec(value.slice(lineStart, start));
  return match
    ? { start: start - match[1].length - 1, end: start, query: match[1] }
    : null;
}
export function matchingCommands(query: string) {
  const search = query.toLowerCase();
  return markdownCommands.filter(
    (command) =>
      `${command.id} ${command.label} ${command.keywords}`
        .toLowerCase()
        .includes(search) ||
      `${command.id} ${command.label}`
        .toLowerCase()
        .replace(/\s/g, "")
        .includes(search.replace(/\s/g, "")),
  );
}
export function insertMarkdown(
  value: string,
  range: Pick<MarkdownRange, "start" | "end">,
  insert: string,
  offset = insert.length,
) {
  return {
    value: value.slice(0, range.start) + insert + value.slice(range.end),
    cursor: range.start + offset,
  };
}
