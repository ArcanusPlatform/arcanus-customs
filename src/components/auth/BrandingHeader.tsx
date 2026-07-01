/**
 * Arcanus Customs Branding Header
 * Unified branding component for all auth pages
 */

import './BrandingHeader.css';

export default function BrandingHeader() {
  return (
    <div className="arcanus-full-container">
      <img
        src={`${import.meta.env.BASE_URL}ArcanusLogo.png`}
        alt="Arcanus Customs Logo"
        className="arcanus-logo"
      />
      <div className="arcanus-text-block">
        <div className="arcanus-text-customs">CUSTOMS</div>
      </div>
    </div>
  );
}
