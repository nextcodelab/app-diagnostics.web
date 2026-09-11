let currentErrorText = "";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} was not found.`);
  }

  return element as T;
}

export function initializeErrorModal(): void {
  const modal = getElement<HTMLDivElement>("error-modal");
  const closeButton = getElement<HTMLButtonElement>("error-modal-close");
  const dismissButton = getElement<HTMLButtonElement>("error-modal-dismiss");
  const backdrop = modal.querySelector(".error-modal-backdrop") as HTMLElement;

  closeButton.addEventListener("click", closeErrorModal);
  dismissButton.addEventListener("click", closeErrorModal);
  backdrop.addEventListener("click", closeErrorModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeErrorModal();
    }
  });

  getElement<HTMLButtonElement>("error-modal-copy").addEventListener(
    "click",
    copyErrorForAI,
  );
}

export function showErrorModal(error: unknown): void {
  const modal = getElement<HTMLDivElement>("error-modal");
  const details = getElement<HTMLPreElement>("error-modal-details");

  const errorDetails =
    error instanceof Error
      ? [
          `Error: ${error.name}`,
          `Message: ${error.message}`,
          "",
          "Stack Trace:",
          error.stack ?? "(no stack trace)",
        ].join("\n")
      : [`Error: ${typeof error}`, `Message: ${String(error)}`].join("\n");

  currentErrorText = [
    "I encountered this error in my application. Please analyze the root cause and suggest a fix.",
    "",
    errorDetails,
  ].join("\n");

  details.textContent = errorDetails;

  resetCopyButton();

  modal.classList.remove("hidden");

  document.body.classList.add("error-modal-open");

  requestAnimationFrame(() => {
    getElement<HTMLButtonElement>("error-modal-copy").focus();
  });
}

export function closeErrorModal(): void {
  const modal = getElement<HTMLDivElement>("error-modal");

  modal.classList.add("hidden");
  document.body.classList.remove("error-modal-open");
}

async function copyErrorForAI(): Promise<void> {
  const copyButton = getElement<HTMLButtonElement>("error-modal-copy");
  const copyText = getElement<HTMLSpanElement>("error-modal-copy-text");

  try {
    await navigator.clipboard.writeText(currentErrorText);

    copyButton.classList.add("copied");
    copyText.textContent = "Copied for AI";

    window.setTimeout(() => {
      copyButton.classList.remove("copied");
      copyText.textContent = "Copy for AI";
    }, 1800);
  } catch (error) {
    console.error("Failed to copy error details:", error);

    copyText.textContent = "Copy failed";

    window.setTimeout(() => {
      copyText.textContent = "Copy for AI";
    }, 1800);
  }
}

function resetCopyButton(): void {
  const copyButton = getElement<HTMLButtonElement>("error-modal-copy");
  const copyText = getElement<HTMLSpanElement>("error-modal-copy-text");

  copyButton.classList.remove("copied");
  copyText.textContent = "Copy for AI";
}
