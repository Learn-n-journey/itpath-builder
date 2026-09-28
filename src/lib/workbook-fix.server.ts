import * as XLSX from "xlsx";

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

async function accessToken(): Promise<string> {
  const { microsoftAccessToken } = await import("@/lib/microsoft-graph.server");
  return microsoftAccessToken();
}

async function downloadWorkbook(fileId: string): Promise<ArrayBuffer> {
  const token = await accessToken();
  const response = await fetch(`${GRAPH_URL}/me/drive/items/${encodeURIComponent(fileId)}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
  });
  let download = response;
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("OneDrive did not provide a workbook download address.");
    download = await fetch(location);
  }
  if (!download.ok) throw new Error(`Workbook download failed [${download.status}].`);
  return download.arrayBuffer();
}

async function uploadWorkbook(fileId: string, bytes: Uint8Array): Promise<void> {
  const token = await accessToken();
  const response = await fetch(`${GRAPH_URL}/me/drive/items/${encodeURIComponent(fileId)}/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    body: bytes,
  });
  if (!response.ok) {
    throw new Error(`Workbook save failed [${response.status}]: ${(await response.text()).slice(0, 300)}`);
  }
}

export async function applyWorkbookFactCorrection(input: {
  domain: string;
  sourceFile: string;
  claim: string;
  correction: string;
}): Promise<{ sheet: string; cell: string }> {
  const claim = input.claim.trim();
  const correction = input.correction.trim();
  if (!claim || !correction) throw new Error("This finding does not contain a usable correction.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: state, error } = await supabaseAdmin
    .from("sheet_file_state")
    .select("file_id,folder,file_name")
    .eq("domain", input.domain)
    .eq("file_name", input.sourceFile)
    .ilike("folder", "%/lessons")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !state?.file_id) throw new Error(error?.message ?? "The source lesson workbook could not be located in OneDrive.");

  const workbook = XLSX.read(await downloadWorkbook(state.file_id), { type: "array", raw: false });
  const matches: Array<{ sheet: string; cell: string }> = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const address = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[address];
        const value = typeof cell?.v === "string" ? cell.v : "";
        if (value.includes(claim)) matches.push({ sheet: sheetName, cell: address });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error("The exact flagged claim was not found in the workbook. No changes were made.");
  }
  if (matches.length > 1) {
    throw new Error("The flagged claim appears in more than one workbook cell. No automatic change was made.");
  }

  const target = matches[0]!;
  const sheet = workbook.Sheets[target.sheet]!;
  const cell = sheet[target.cell]!;
  cell.v = String(cell.v).replace(claim, correction);
  cell.t = "s";

  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
  await uploadWorkbook(state.file_id, bytes);

  // Force the next topic refresh to notice the just-written workbook.
  await supabaseAdmin.from("sheet_file_state").delete().eq("file_id", state.file_id);
  return target;
}
