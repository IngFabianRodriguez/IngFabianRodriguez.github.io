/** Hands the bytes to the browser as a file download. Nothing is sent anywhere. */
export function downloadFile(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([bytes.slice().buffer], { type: "application/octet-stream" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
