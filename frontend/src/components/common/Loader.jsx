import { LoaderCircle } from "lucide-react";
export default function Loader() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="icon-spin" size={20} aria-hidden="true" />
      Loading your account…
    </div>
  );
}
