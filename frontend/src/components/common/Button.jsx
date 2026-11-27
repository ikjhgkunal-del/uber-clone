import { ArrowRight, LoaderCircle } from "lucide-react";
export default function Button({ children, busy, className = "", ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${className}`}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <>
          <LoaderCircle size={20} className="icon-spin" aria-hidden="true" />
          Please wait
        </>
      ) : (
        <>
          {children}
          <ArrowRight
            className="button-arrow"
            size={20}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </>
      )}
    </button>
  );
}
