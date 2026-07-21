import toast from 'react-hot-toast';

const ICONS = {
  success: '✓',
  error: '✗',
  warning: '⚠️',
  info: 'ℹ️',
};

const ACCENTS = {
  success: '#38c878',
  error: '#ff4d6d',
  warning: '#ffd700',
  info: '#7c2ae8',
};

const BASE_STYLE = {
  background: '#22223f',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '0.85rem 1.1rem',
  fontWeight: 600,
  fontSize: '0.95rem',
  maxWidth: '380px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
};

function show(type, message, opts = {}) {
  return toast(message, {
    icon: ICONS[type],
    duration: 3500,
    style: {
      ...BASE_STYLE,
      border: `1px solid ${ACCENTS[type]}`,
      borderInlineStart: `4px solid ${ACCENTS[type]}`,
    },
    ...opts,
  });
}

export const toastSuccess = (message, opts) => show('success', message, opts);
export const toastError = (message, opts) => show('error', message, opts);
export const toastWarning = (message, opts) => show('warning', message, opts);
export const toastInfo = (message, opts) => show('info', message, opts);

export function toastConfirm(message, { confirmLabel = 'אשר', cancelLabel = 'בטל' } = {}) {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div className={`app-toast app-toast-confirm ${t.visible ? 'app-toast-enter' : 'app-toast-leave'}`}>
          <p className="app-toast-confirm-message">{message}</p>
          <div className="app-toast-confirm-actions">
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  });
}
