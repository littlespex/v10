import { afterEach, describe, expect, it } from 'vitest';
import { AlertDialogElement } from '../../alert-dialog/alert-dialog-element';
import { ErrorDialogElement } from '../error-dialog-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ErrorDialogElement', () => {
  it('has the correct tag name', () => {
    expect(ErrorDialogElement.tagName).toBe('media-error-dialog');
  });

  it('removes child media-alert-dialog from DOM on connect', async () => {
    const el = createElement(ErrorDialogElement);

    // Use the real tag name so querySelector('media-alert-dialog') finds it.
    if (!customElements.get(AlertDialogElement.tagName)) {
      customElements.define(AlertDialogElement.tagName, AlertDialogElement);
    }
    const dialog = document.createElement(AlertDialogElement.tagName) as AlertDialogElement;
    el.appendChild(dialog);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(dialog.isConnected).toBe(false);
    expect(el.querySelector(AlertDialogElement.tagName)).toBeNull();
  });

  it('handles missing child alert dialog gracefully', async () => {
    const el = createElement(ErrorDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.isConnected).toBe(true);
  });

  it('cleans up observer on disconnect', async () => {
    const el = createElement(ErrorDialogElement);

    if (!customElements.get(AlertDialogElement.tagName)) {
      customElements.define(AlertDialogElement.tagName, AlertDialogElement);
    }
    const dialog = document.createElement(AlertDialogElement.tagName) as AlertDialogElement;
    el.appendChild(dialog);

    document.body.appendChild(el);
    await el.updateComplete;

    document.body.removeChild(el);

    // After disconnect, event listeners and observer should be cleaned up.
    dialog.dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }));
  });
});
