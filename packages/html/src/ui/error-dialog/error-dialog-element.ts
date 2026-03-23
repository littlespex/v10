import { selectError } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import type { AlertDialogElement } from '../alert-dialog/alert-dialog-element';
import { MediaElement } from '../media-element';

const FALLBACK_MESSAGE = 'An error occurred. Please try again.';

export class ErrorDialogElement extends MediaElement {
  static readonly tagName = 'media-error-dialog';

  readonly #state = new PlayerController(this, playerContext, selectError);

  #lastErrorMessage: string | null = null;
  #dialog: AlertDialogElement | null = null;
  #disconnect: AbortController | null = null;
  #observer: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#dialog = this.querySelector('media-alert-dialog');

    // Remove dialog from DOM — re-inserted only when an error occurs.
    this.#dialog?.remove();

    if (this.#dialog) {
      this.#dialog.addEventListener(
        'open-change',
        (event) => {
          const { open } = (event as CustomEvent<{ open: boolean }>).detail;
          if (!open) this.#state.value?.dismissError();
        },
        { signal: this.#disconnect.signal }
      );

      // Remove dialog from DOM once the close transition completes.
      this.#observer = new MutationObserver(() => {
        if (this.#dialog?.isConnected && !this.#dialog.hasAttribute('data-open')) {
          this.#dialog.remove();
        }
      });
      this.#observer.observe(this.#dialog, { attributes: true, attributeFilter: ['data-open'] });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#dialog = null;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const errorState = this.#state.value;
    if (!errorState || !this.#dialog) return;

    if (errorState.error) {
      const message = errorState.error.message?.trim();
      this.#lastErrorMessage = message ? message : null;

      if (!this.#dialog.isConnected) {
        this.appendChild(this.#dialog);
      }

      this.#dialog.open = true;
    } else {
      this.#dialog.open = false;
    }

    const desc = this.#dialog.querySelector('media-alert-dialog-description');
    if (desc) {
      desc.textContent = this.#lastErrorMessage ?? FALLBACK_MESSAGE;
    }
  }
}
