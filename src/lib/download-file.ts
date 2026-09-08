/** Download a generated file using the filename supplied by the server. */
export async function downloadFile(response: Response, fallbackFilename: string): Promise<void> {
  const header = response.headers.get("Content-Disposition");
  const filename = header?.match(/filename="([^"]+)"/i)?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");

  try {
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Leave time for the browser to start reading the file before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
