declare module 'react-google-recaptcha' {
  import type { ComponentType } from 'react';

  interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
  }

  const ReCAPTCHA: ComponentType<ReCAPTCHAProps>;
  export default ReCAPTCHA;
}
