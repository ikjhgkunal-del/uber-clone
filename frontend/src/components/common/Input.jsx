import { useId, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
export default function Input({
  label,
  type = "text",
  hint,
  icon: CustomIcon,
  ...props
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const Icon =
    CustomIcon ??
    (type === "email" ? Mail : type === "password" ? LockKeyhole : UserRound);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <Icon
          className="input-leading"
          size={19}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <input
          {...props}
          id={id}
          type={type === "password" && visible ? "text" : type}
          aria-describedby={hint ? id + "-hint" : undefined}
        />
        {type === "password" && (
          <button
            type="button"
            className="reveal"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? (
              <EyeOff size={19} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Eye size={19} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
