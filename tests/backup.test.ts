import { beforeEach, test, expect, vi } from "vitest";
import { emptyWorkspace } from "../src/domain/model";
const mock = vi.hoisted(() => ({ download: vi.fn(), upload: vi.fn() }));
vi.mock("../src/lib/auth", () => ({
  supabase: { storage: { from: () => mock } },
}));
import { parsePortableBackup, restoreImages } from "../src/lib/backup";
const ref = "planner-image://10000000-0000-4000-8000-000000000001.png";
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function fixture() {
  const workspace = emptyWorkspace();
  workspace.notes.push({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: "Image note",
    content: `![file](${ref})`,
  });
  return {
    app: "ONE",
    version: 2,
    id: crypto.randomUUID(),
    ownerId: "source",
    workspace,
    images: [
      { ref, type: "image/png", base64: Buffer.from(bytes).toString("base64") },
    ],
  };
}
beforeEach(() => {
  vi.resetAllMocks();
});
test("complete backup validates owned attachment references before restoring and never overwrites a conflicting image", async () => {
  const backup = parsePortableBackup(fixture());
  mock.download.mockResolvedValue({
    data: new Blob([bytes], { type: "image/png" }),
    error: null,
  });
  await restoreImages(backup, "target");
  expect(mock.upload).not.toHaveBeenCalled();
  expect(mock.download).toHaveBeenCalledWith(
    "target/" + ref.slice("planner-image://".length),
  );
  mock.download.mockResolvedValue({
    data: new Blob([new Uint8Array([...bytes, 1])], { type: "image/png" }),
    error: null,
  });
  await expect(restoreImages(backup, "target")).rejects.toThrow(
    /different contents/,
  );
  expect(mock.upload).not.toHaveBeenCalled();
});
test("missing and malformed images fail before any upload", async () => {
  const raw = fixture();
  expect(() => parsePortableBackup({ ...raw, images: [] })).toThrow(/missing/);
  const backup = parsePortableBackup({
    ...raw,
    images: [{ ...raw.images[0], base64: btoa("not an image") }],
  });
  await expect(restoreImages(backup, "target")).rejects.toThrow(/format/);
  expect(mock.upload).not.toHaveBeenCalled();
  expect(mock.download).not.toHaveBeenCalled();
});
