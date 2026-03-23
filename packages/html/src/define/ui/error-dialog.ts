import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { safeDefine } from '../safe-define';

// Ensure child alert-dialog elements are registered.
import './alert-dialog';

safeDefine(ErrorDialogElement);

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
  }
}
