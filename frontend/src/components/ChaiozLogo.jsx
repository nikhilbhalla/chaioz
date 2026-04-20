// White logotype for dark backgrounds (matches the dark theme primary mode)
export const LOGO_URL = "/chaioz-logo-white.png";
export const LOGO_FULL_COLOR =
  "https://customer-assets.emergentagent.com/job_late-night-chai-1/artifacts/qt4f9iwc_chaioz-horizontal-logo-full-color-rgb-900px-w-72ppi.png";

export default function ChaiozLogo({ className = "h-9", alt = "Chaioz", variant = "white" }) {
  const src = variant === "color" ? LOGO_FULL_COLOR : LOGO_URL;
  return <img src={src} alt={alt} className={className} data-testid="chaioz-logo" />;
}
