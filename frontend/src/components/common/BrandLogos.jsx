import uberWordmark from "../../assets/uber.svg";
// Uber wordmark from Simple Icons (siUber). Keep brand marks separate from UI icons.
export function UberLogo() {
  return (
    <img
      src={uberWordmark}
      width="72"
      height="27"
      alt="Uber"
      className="brand-wordmark"
    />
  );
}
export function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 2.9-4.4 2.9-7.7Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.5l-3.4-2.6c-.9.6-2 .9-3.3.9-2.6 0-4.8-1.8-5.6-4.1H3v2.7C4.7 19.7 8.1 22 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.7a6 6 0 0 1 0-3.4V7.6H3a10 10 0 0 0 0 8.8l3.4-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3.1 14.7 2 12 2a10 10 0 0 0-9 5.6l3.4 2.7C7.2 8 9.4 6.2 12 6.2Z"
      />
    </svg>
  );
}
