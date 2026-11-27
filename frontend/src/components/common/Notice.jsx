import { CircleAlert, CircleCheck } from "lucide-react";
export default function Notice({ children, type = "error" }) {
  const Icon = type === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      className={`notice ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
